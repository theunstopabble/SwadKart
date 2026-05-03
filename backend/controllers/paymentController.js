import crypto from "crypto";
import Razorpay from "razorpay";
import Order from "../models/orderModel.js";
import Restaurant from "../models/restaurantModel.js";
import User from "../models/userModel.js";
import Coupon from "../models/couponModel.js";
import dotenv from "dotenv";
import sendEmail from "../utils/sendEmail.js";
import {
  getOrderConfirmationTemplate,
  getAdminOrderAlertTemplate,
  getRestaurantOrderAlertTemplate,
} from "../utils/emailTemplates.js";
import CouponUsage from "../models/couponUsageModel.js";
import { sanitizeObjectId } from "../utils/sanitize.js";

dotenv.config();

// Singleton Razorpay Instance
let razorpayInstance = null;
const getRazorpayInstance = () => {
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
// 🛡️ SECURITY FIX (SEC-1): Validate amount from DB, never trust frontend
export const createRazorpayOrder = async (req, res) => {
  try {
    const { amount, orderId: rawOrderId } = req.body;
    const instance = getRazorpayInstance();
    const orderId = rawOrderId ? sanitizeObjectId(rawOrderId) : null;

    // 🛡️ Server-side price validation: If orderId provided, use DB amount
    let verifiedAmount = Number(amount);
    if (orderId) {
      const dbOrder = await Order.findById(orderId);
      if (!dbOrder) {
        return res.status(404).json({ success: false, message: "Order not found" });
      }
      verifiedAmount = dbOrder.totalPrice;
    }

    if (!verifiedAmount || verifiedAmount <= 0) {
      return res.status(400).json({ success: false, message: "Invalid payment amount" });
    }

    const options = {
      amount: Math.round(verifiedAmount * 100), // Convert to Paisa
      currency: "INR",
      receipt: `swad_rcpt_${Date.now()}`,
      notes: orderId ? { orderId } : {},
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
// 🛡️ SECURITY FIX: Added HMAC signature verification
export const verifyPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, orderId: rawOrderId } = req.body;
    
    let orderId;
    try {
      orderId = rawOrderId ? sanitizeObjectId(rawOrderId) : null;
    } catch {
      orderId = null;
    }
    if (!orderId) {
      return res.status(400).json({ success: false, message: "Invalid or missing orderId" });
    }
    
    const instance = getRazorpayInstance();

    // 🛡️ SECURITY FIX: Verify Razorpay signature using HMAC
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

    // 1. Verify payment status directly via Razorpay API for security
    const payment = await instance.payments.fetch(razorpay_payment_id);

    if (payment.status === "captured" || payment.status === "authorized") {
      const order = await Order.findById(orderId).populate(
        "user",
        "name email",
      );

      if (!order) return res.status(404).json({ message: "Order not found" });

      // 2. Mark as Paid
      order.isPaid = true;
      order.paidAt = Date.now();
      order.paymentResult = {
        id: payment.id,
        status: payment.status,
        update_time: payment.created_at,
        email_address: payment.email || (order.user && order.user.email) || "",
      };

      // BUG-08 FIX: Create CouponUsage only after successful payment
      if (order.couponCode && order.user && order.user._id) {
        const coupon = await Coupon.findOne({ code: order.couponCode.toUpperCase() });
        if (coupon) {
          const alreadyUsed = await CouponUsage.findOne({ user: order.user._id, coupon: coupon._id });
          if (!alreadyUsed) {
            await CouponUsage.create({ user: order.user._id, coupon: coupon._id, order: order._id });
          }
        }
      }

      const updatedOrder = await order.save();

      // 4. Real-time Socket: Notify Restaurant immediately
      if (req.io && order.orderItems.length > 0) {
        const restaurantId = order.orderItems[0].restaurant;
        const restaurantDoc = await Restaurant.findById(restaurantId);
        if (restaurantDoc?.owner) {
          req.io
            .to(restaurantDoc.owner.toString())
            .emit("newOrderReceived", updatedOrder);
          req.io.to(orderId).emit("orderUpdated", updatedOrder);
        }
      }

      // 5. Email Dispatch (Non-blocking)
      try {
        if (order.user && order.user.email) {
          await sendEmail({
            email: order.user.email,
            subject: `SwadKart: Payment Received! ✅ Order #${order._id.toString().slice(-6)}`,
          html: getOrderConfirmationTemplate(updatedOrder, true),
        });

        const admin = await User.findOne({ role: "admin" });
        if (admin) {
          await sendEmail({
            email: admin.email,
            subject: `💰 Revenue Alert: Order #${order._id.toString().slice(-6)}`,
            html: getAdminOrderAlertTemplate(updatedOrder),
          });
        }

        const restaurantId = order.orderItems[0].restaurant;
        const restro = await Restaurant.findById(restaurantId).populate("owner");
        if (
          restro?.owner?.email &&
          !restro.owner.email.includes("@dummy")
        ) {
          await sendEmail({
            email: restro.owner.email,
            subject: `💰 New Paid Order for ${restro.name}`,
            html: getRestaurantOrderAlertTemplate(
              updatedOrder,
              restro.name,
            ),
          });
        }
        }
      } catch (err) {
        console.error("Alert System Delay:", err.message);
      }

      res
        .status(200)
        .json({
          success: true,
          message: "Payment Authorized",
          order: updatedOrder,
        });
    } else {
      res
        .status(400)
        .json({ success: false, message: "Payment Verification Failed" });
    }
  } catch (error) {
    console.error("Verification Critical Error:", error);
    res
      .status(500)
      .json({ success: false, message: "System failure during verification" });
  }
};

// ============================================================
// RAZORPAY WEBHOOK HANDLER
// ============================================================

// @desc    Handle Razorpay Webhooks (Async Payment Updates)
// @route   POST /api/v1/payment/webhook
// @access  Public (Called by Razorpay bypassing auth)
export const razorpayWebhook = async (req, res) => {
  try {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    const signature = req.headers["x-razorpay-signature"];

    // 🛡️ SECURITY FIX (SEC-4): Use raw body for HMAC verification
    // express.raw() sends Buffer, so we use it directly for accurate hash computation
    const rawBody = Buffer.isBuffer(req.body) ? req.body.toString("utf8") : JSON.stringify(req.body);

    const expectedSignature = crypto
      .createHmac("sha256", webhookSecret)
      .update(rawBody)
      .digest("hex");

    // Use timing-safe comparison to prevent timing attacks
    const isValid = signature &&
      expectedSignature.length === signature.length &&
      crypto.timingSafeEqual(Buffer.from(expectedSignature), Buffer.from(signature));

    if (isValid) {
      // Parse body if it was raw Buffer
      const body = Buffer.isBuffer(req.body) ? JSON.parse(rawBody) : req.body;

      // Process only if payment is captured
      if (body.event === "payment.captured") {
        const paymentData = body.payload.payment.entity;

        const rawOrderId = paymentData.notes ? paymentData.notes.orderId : null;
        let orderId = null;
        if (rawOrderId) {
           try {
             orderId = sanitizeObjectId(rawOrderId);
           } catch {
             orderId = null;
           }
        }

        if (orderId) {
          const order = await Order.findById(orderId);

          if (order && !order.isPaid) {
            order.isPaid = true;
            order.paidAt = Date.now();
            order.paymentResult = {
              id: paymentData.id,
              status: paymentData.status,
              update_time: paymentData.created_at,
              email_address: paymentData.email,
            };

            await order.save();
            // NEW-07 FIX: Create CouponUsage on webhook payment success to prevent coupon reuse
            if (order.couponCode) {
              try {
                const coupon = await Coupon.findOne({ code: order.couponCode.toUpperCase() });
                if (coupon) {
                  const alreadyUsed = await CouponUsage.findOne({ user: order.user, coupon: coupon._id });
                  if (!alreadyUsed) {
                    await CouponUsage.create({ user: order.user, coupon: coupon._id, order: order._id });
                  }
                }
              } catch (couponErr) {
                console.error('Webhook CouponUsage creation failed:', couponErr.message);
              }
            }

            console.log(`✅ Webhook Success: Order ${orderId} marked as PAID.`);
          }
        }
      }

      res.status(200).json({ status: "ok" });
    } else {
      console.warn("🚨 Invalid Razorpay Webhook Signature!");
      res.status(400).json({ error: "Invalid signature" });
    }
  } catch (error) {
    console.error("Webhook Error:", error.message);
    res.status(500).json({ error: "Server Error" });
  }
};
