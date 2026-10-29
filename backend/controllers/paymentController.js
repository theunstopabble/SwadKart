import crypto from "crypto";
import Razorpay from "razorpay";
import prisma from "../config/prisma.js";
import dotenv from "dotenv";
import sendEmail from "../utils/sendEmail.js";
import {
  getOrderConfirmationTemplate,
  getAdminOrderAlertTemplate,
  getRestaurantOrderAlertTemplate,
} from "../utils/emailTemplates.js";
import getAdminEmail from "../utils/getAdminEmail.js";

dotenv.config();

// Singleton Razorpay Instance
let razorpayInstance = null;
export const getRazorpayInstance = () => {
  if (!razorpayInstance) {
    razorpayInstance = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
  }
  return razorpayInstance;
};

// @desc    Get Razorpay Key for Frontend
export const getRazorpayKey = (req, res) => {
  res.status(200).json({ key: process.env.RAZORPAY_KEY_ID });
};

// @desc    Create Razorpay Order (Step 1)
export const createRazorpayOrder = async (req, res) => {
  try {
    const { orderId } = req.body;
    const instance = getRazorpayInstance();

    if (!orderId) {
      return res.status(400).json({ success: false, message: "orderId is required" });
    }

    const dbOrder = await prisma.order.findUnique({ where: { id: orderId } });
    if (!dbOrder) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    const userId = req.user.id || req.user._id;
    if (dbOrder.userId !== userId) {
      return res.status(403).json({ success: false, message: "Not authorized for this order" });
    }

    const verifiedAmount = dbOrder.totalPrice;

    const options = {
      amount: Math.round(verifiedAmount * 100), // Convert to Paisa
      currency: "INR",
      receipt: `swad_rcpt_${Date.now()}`,
      notes: { orderId },
    };

    const order = await instance.orders.create(options);
    res.status(201).json({ success: true, order });
  } catch (error) {
    console.error("Razorpay Initiation Error:", error);
    res.status(500).json({
      success: false,
      message: "Handshake with Payment Gateway failed.",
    });
  }
};

// @desc    Verify Payment & Execute Business Logic (Step 2)
export const verifyPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, orderId } = req.body;

    if (!orderId) {
      return res.status(400).json({ success: false, message: "Invalid or missing orderId" });
    }

    const instance = getRazorpayInstance();

    if (razorpay_order_id && razorpay_payment_id && razorpay_signature) {
      const generatedSignature = crypto
        .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
        .update(`${razorpay_order_id}|${razorpay_payment_id}`)
        .digest("hex");

      if (generatedSignature !== razorpay_signature) {
        return res.status(400).json({
          success: false,
          message: "Invalid payment signature. Possible tampering detected.",
        });
      }
    }

    let razorpayOrder;
    try {
      razorpayOrder = await instance.orders.fetch(razorpay_order_id);
    } catch {
      return res.status(502).json({ success: false, message: "Payment gateway unreachable" });
    }
    if (!razorpayOrder.notes?.orderId || razorpayOrder.notes.orderId !== orderId) {
      return res.status(400).json({ success: false, message: "Payment order does not match this order" });
    }

    let payment;
    try {
      payment = await instance.payments.fetch(razorpay_payment_id);
    } catch (rzpErr) {
      console.error("Razorpay fetch failed:", rzpErr.message);
      return res.status(502).json({ success: false, message: "Payment gateway unreachable. Please retry." });
    }

    if (payment.status === "captured" || payment.status === "authorized") {
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: { user: { select: { id: true, name: true, email: true } } },
      });

      if (!order) return res.status(404).json({ message: "Order not found" });

      const userId = req.user.id || req.user._id;
      if (order.userId !== userId) {
        return res.status(403).json({ success: false, message: "Not authorized for this order" });
      }

      const expectedAmount = Math.round(order.totalPrice * 100);
      if (payment.amount !== expectedAmount) {
        return res.status(400).json({ success: false, message: "Payment amount mismatch — possible tampering" });
      }

      if (order.isPaid) {
        return res.status(200).json({ success: true, message: "Payment already verified", order });
      }

      const updatedOrder = await prisma.order.update({
        where: { id: orderId },
        data: {
          isPaid: true,
          paidAt: new Date(),
          orderStatus: order.orderStatus === "Payment Pending" ? "Placed" : order.orderStatus,
          paymentResult: {
            id: payment.id,
            status: payment.status,
            update_time: payment.created_at,
            email_address: payment.email || order.user?.email || "",
          },
        },
      });

      if (order.couponCode && order.userId) {
        const coupon = await prisma.coupon.findUnique({
          where: { code: order.couponCode.toUpperCase() },
        });
        if (coupon) {
          try {
            await prisma.couponUsage.create({
              data: {
                userId: order.userId,
                couponId: coupon.id,
                orderId: order.id,
                discountApplied: order.couponDiscount,
              },
            });
          } catch (upsertErr) {
            console.error("CouponUsage error:", upsertErr.message);
          }
        }
      }

      if (req.io && order.restaurantId) {
        const restaurantDoc = await prisma.restaurant.findUnique({
          where: { id: order.restaurantId },
        });
        if (restaurantDoc?.ownerId) {
          req.io.to(restaurantDoc.ownerId).emit("newOrderReceived", updatedOrder);
          req.io.to(orderId).emit("orderUpdated", updatedOrder);
        }
      }

      if (order.user?.email) {
        sendEmail({
          email: order.user.email,
          subject: `SwadKart: Payment Received! Order #${order.id.slice(-6).toUpperCase()}`,
          html: getOrderConfirmationTemplate(updatedOrder, true),
        }).catch(() => {});
      }

      res.status(200).json({
        success: true,
        message: "Payment Authorized",
        order: updatedOrder,
      });
    } else {
      res.status(400).json({ success: false, message: "Payment Verification Failed" });
    }
  } catch (error) {
    console.error("Verification Critical Error:", error);
    res.status(500).json({ success: false, message: "System failure during verification" });
  }
};

// ============================================================
// RAZORPAY WEBHOOK HANDLER
// ============================================================
export const razorpayWebhook = async (req, res) => {
  try {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.error("❌ RAZORPAY_WEBHOOK_SECRET is not set");
      return res.status(500).json({ error: "Webhook misconfigured" });
    }
    const signature = req.headers["x-razorpay-signature"];
    const rawBody = Buffer.isBuffer(req.body) ? req.body.toString("utf8") : JSON.stringify(req.body);

    const expectedSignature = crypto
      .createHmac("sha256", webhookSecret)
      .update(rawBody)
      .digest("hex");

    const isValid =
      signature &&
      expectedSignature.length === signature.length &&
      crypto.timingSafeEqual(Buffer.from(expectedSignature), Buffer.from(signature));

    if (isValid) {
      const body = Buffer.isBuffer(req.body) ? JSON.parse(rawBody) : req.body;

      if (body.event === "payment.captured" || body.event === "payment.authorized") {
        const paymentData = body.payload.payment.entity;
        const orderId = paymentData.notes ? paymentData.notes.orderId : null;

        if (orderId) {
          const order = await prisma.order.findUnique({ where: { id: orderId } });
          if (order && !order.isPaid) {
            const updated = await prisma.order.update({
              where: { id: orderId },
              data: {
                isPaid: true,
                paidAt: new Date(),
                orderStatus: "Placed",
                paymentResult: {
                  id: paymentData.id,
                  status: paymentData.status,
                  update_time: paymentData.created_at,
                  email_address: paymentData.email,
                },
              },
              include: { user: true },
            });

            console.log(`✅ Webhook Success: Order ${orderId} marked as PAID.`);

            if (updated.user?.email) {
              sendEmail({
                email: updated.user.email,
                subject: `SwadKart: Payment Received! Order #${updated.id.slice(-6).toUpperCase()}`,
                html: getOrderConfirmationTemplate(updated, true),
              }).catch(() => {});
            }
          }
        }
      }

      res.status(200).json({ status: "ok" });
    } else {
      console.warn("🚨 Invalid Razorpay Webhook Signature!");
      return res.status(400).json({ error: "Invalid signature" });
    }
  } catch (error) {
    console.error("Webhook Error:", error.message);
    res.status(500).json({ error: "Server Error" });
  }
};
