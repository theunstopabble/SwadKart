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

dotenv.config();

// Initialize Razorpay Instance
const getRazorpayInstance = () => {
  return new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });
};

// @desc    Get Razorpay Key for Frontend
export const getRazorpayKey = (req, res) => {
  res.status(200).json({ key: process.env.RAZORPAY_KEY_ID });
};

// @desc    Create Razorpay Order (Step 1)
export const createRazorpayOrder = async (req, res) => {
  try {
    const { amount } = req.body;
    const instance = getRazorpayInstance();

    const options = {
      amount: Math.round(Number(amount) * 100), // Convert to Paisa
      currency: "INR",
      receipt: `swad_rcpt_${Date.now()}`,
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
    const { razorpay_payment_id, orderId } = req.body;
    const instance = getRazorpayInstance();

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
        email_address: payment.email || order.user.email,
      };

      const updatedOrder = await order.save();

      // 3. 🎫 Coupon Protocol: Mark as used
      if (order.couponCode) {
        await Coupon.findOneAndUpdate(
          { code: order.couponCode.toUpperCase() },
          { $addToSet: { usedBy: order.user._id } },
        );
      }

      // 4. 🔔 Real-time Socket: Notify Restaurant immediately
      if (req.io && order.orderItems.length > 0) {
        const restaurantId = order.orderItems[0].restaurant;
        const restaurantDoc = await Restaurant.findById(restaurantId);
        if (restaurantDoc?.owner) {
          req.io
            .to(restaurantDoc.owner.toString())
            .emit("orderUpdated", updatedOrder);
          req.io.to(orderId).emit("orderUpdated", updatedOrder);
        }
      }

      // 5. 📧 Email Dispatch (Non-blocking)
      try {
        // User Receipt
        sendEmail({
          email: order.user.email,
          subject: `SwadKart: Payment Received! ✅ Order #${order._id
            .toString()
            .slice(-6)}`,
          html: getOrderConfirmationTemplate(updatedOrder, true),
        });

        // Admin Alert
        User.findOne({ role: "admin" }).then((admin) => {
          if (admin)
            sendEmail({
              email: admin.email,
              subject: `💰 Revenue Alert: Order #${order._id
                .toString()
                .slice(-6)}`,
              html: getAdminOrderAlertTemplate(updatedOrder),
            });
        });

        // Restaurant Notification
        const restaurantId = order.orderItems[0].restaurant;
        Restaurant.findById(restaurantId)
          .populate("owner")
          .then((restro) => {
            if (
              restro?.owner?.email &&
              !restro.owner.email.includes("@dummy")
            ) {
              sendEmail({
                email: restro.owner.email,
                subject: `💰 New Paid Order for ${restro.name}`,
                html: getRestaurantOrderAlertTemplate(
                  updatedOrder,
                  restro.name,
                ),
              });
            }
          });
      } catch (err) {
        console.error("Alert System Delay:", err.message);
      }

      res.status(200).json({
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

    // 1. Verify webhook signature
    const expectedSignature = crypto
      .createHmac("sha256", webhookSecret)
      .update(JSON.stringify(req.body))
      .digest("hex");

    if (expectedSignature === signature) {
      // 2. Process only if payment is captured
      if (req.body.event === "payment.captured") {
        const paymentData = req.body.payload.payment.entity;

        // 3. Extract orderId from notes (Assuming frontend passes it during creation)
        const orderId = paymentData.notes ? paymentData.notes.orderId : null;

        if (orderId) {
          const order = await Order.findById(orderId);

          // 4. Update order if not already paid via frontend verifyPayment
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
            console.log(`✅ Webhook Success: Order ${orderId} marked as PAID.`);
          }
        }
      }

      // Return 200 OK to acknowledge receipt and prevent Razorpay retries
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
