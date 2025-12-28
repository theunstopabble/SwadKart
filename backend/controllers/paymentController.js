import Razorpay from "razorpay";
import Order from "../models/orderModel.js";
import User from "../models/userModel.js"; // 👈 Required to find Restaurant Owner
import dotenv from "dotenv";
import sendEmail from "../utils/sendEmail.js";
import {
  getOrderConfirmationTemplate,
  getAdminOrderAlertTemplate,
  getRestaurantOrderAlertTemplate,
} from "../utils/emailTemplates.js"; // 👈 All Professional Templates Imported

dotenv.config();

// Helper to get Instance
const getRazorpayInstance = () => {
  return new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });
};

// ============================================================
// 💳 PAYMENT CONTROLLER FUNCTIONS
// ============================================================

/**
 * @desc    Get Razorpay Key to Frontend
 */
export const getRazorpayKey = (req, res) => {
  res.status(200).json({
    key: process.env.RAZORPAY_KEY_ID,
  });
};

/**
 * @desc    Create Razorpay Order (Step 1)
 */
export const createRazorpayOrder = async (req, res) => {
  try {
    const { amount } = req.body;
    const instance = getRazorpayInstance();

    const options = {
      amount: Number(amount * 100), // ₹1 = 100 paise
      currency: "INR",
      receipt: `receipt_order_${Date.now()}`,
    };

    const order = await instance.orders.create(options);

    res.status(201).json({
      success: true,
      order,
    });
  } catch (error) {
    console.error("Razorpay Order Creation Error:", error);
    res.status(500).json({
      success: false,
      message: "Payment initiation failed. Check .env keys.",
    });
  }
};

/**
 * @desc    Verify Payment DIRECTLY via Razorpay Server & SEND EMAILS (User + Admin + Restaurant)
 */
export const verifyPayment = async (req, res) => {
  try {
    const { razorpay_payment_id, orderId } = req.body;
    const instance = getRazorpayInstance();

    // 1. Fetch Payment Details directly from Razorpay
    const payment = await instance.payments.fetch(razorpay_payment_id);

    // 2. Check if Payment is Real
    if (payment.status === "captured" || payment.status === "authorized") {
      const order = await Order.findById(orderId).populate(
        "user",
        "name email"
      );

      if (order) {
        // 3. Mark Order as Paid
        order.isPaid = true;
        order.paidAt = Date.now();
        order.paymentResult = {
          id: payment.id,
          status: payment.status,
          update_time: payment.created_at,
          email_address: payment.email || order.user.email,
        };

        const updatedOrder = await order.save();

        // ==========================================
        // 📧 SEND PAYMENT SUCCESS EMAILS (User + Admin + Restaurant)
        // ==========================================
        try {
          console.log("📨 Sending Online Payment Emails...");

          // 1️⃣ USER RECEIPT (Links to My Orders)
          await sendEmail({
            email: order.user.email,
            subject: `Payment Successful! ✅`,
            html: getOrderConfirmationTemplate(updatedOrder, true), // true = Paid
          });

          // 2️⃣ ADMIN ALERT (Links to Admin Dashboard)
          await sendEmail({
            email: "ganand62077@gmail.com", // 👈 FIXED SUPER ADMIN
            subject: `💰 Payment Received`,
            html: getAdminOrderAlertTemplate(updatedOrder),
          });

          // 3️⃣ RESTAURANT ALERT (Dynamic Logic)
          const restaurantId = order.orderItems[0].restaurant;
          if (restaurantId) {
            const shopOwner = await User.findById(restaurantId);
            if (shopOwner && shopOwner.email) {
              console.log(`📨 Alerting Shop Owner: ${shopOwner.email}`);
              await sendEmail({
                email: shopOwner.email,
                subject: `💰 New Online Order: ${shopOwner.name}`,
                html: getRestaurantOrderAlertTemplate(
                  updatedOrder,
                  shopOwner.name
                ),
              });
            }
          }

          console.log("✅ Emails Sent to Admin, User & Restaurant");
        } catch (emailErr) {
          console.error("Failed to send email alerts:", emailErr);
          // Don't fail the response if email fails
        }
        // ==========================================
        // 📧 EMAIL LOGIC END
        // ==========================================

        res.status(200).json({
          success: true,
          message: "Payment Verified & Emails Sent",
          order: updatedOrder,
        });
      } else {
        res.status(404).json({ success: false, message: "Order not found" });
      }
    } else {
      // Payment Failed logic
      res.status(400).json({
        success: false,
        message: "Payment Failed. Status: " + payment.status,
      });
    }
  } catch (error) {
    console.error("Verification Error:", error);
    res.status(500).json({
      success: false,
      message: "Payment Verification Failed: " + error.message,
    });
  }
};
