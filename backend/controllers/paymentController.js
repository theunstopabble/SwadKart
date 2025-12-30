import Razorpay from "razorpay";
import Order from "../models/orderModel.js";
import Restaurant from "../models/restaurantModel.js"; // 👈 Required for Restaurant details
import User from "../models/userModel.js"; // 👈 Required for Admin lookup
import dotenv from "dotenv";
import sendEmail from "../utils/sendEmail.js";
import {
  getOrderConfirmationTemplate,
  getAdminOrderAlertTemplate,
  getRestaurantOrderAlertTemplate,
} from "../utils/emailTemplates.js";

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
      // 👇 FIX: Math.round() prevents decimal errors (e.g. 14344.99 -> 14345)
      amount: Math.round(Number(amount) * 100),
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
        // 📧 SEND EMAILS (DB DYNAMIC ADMIN & RESTAURANT)
        // ==========================================
        try {
          console.log("📨 Sending Online Payment Emails...");

          // 1️⃣ USER RECEIPT (Links to My Orders)
          await sendEmail({
            email: order.user.email,
            subject: `Payment Successful! ✅`,
            html: getOrderConfirmationTemplate(updatedOrder, true), // true = Paid
          });

          // 2️⃣ ADMIN ALERT (FETCH FROM DB) 🕵️‍♂️
          const adminUser = await User.findOne({ role: "admin" });

          if (adminUser && adminUser.email) {
            console.log(`📨 Found Admin in DB: ${adminUser.email}`);
            await sendEmail({
              email: adminUser.email,
              subject: `💰 Payment Received`,
              html: getAdminOrderAlertTemplate(updatedOrder),
            });
          } else {
            console.error("❌ No Admin found in DB to send alert!");
          }

          // 3️⃣ RESTAURANT ALERT (Via Restaurant Model)
          if (order.orderItems && order.orderItems.length > 0) {
            const restaurantId = order.orderItems[0].restaurant;

            if (restaurantId) {
              const restaurantDoc = await Restaurant.findById(
                restaurantId
              ).populate("owner");

              if (restaurantDoc && restaurantDoc.owner) {
                const shopOwner = restaurantDoc.owner;
                const shopName = restaurantDoc.name;

                // Skip Dummy Shops
                if (
                  shopOwner.email &&
                  !shopOwner.email.includes("@dummy.swadkart")
                ) {
                  console.log(`📨 Alerting Shop: ${shopName}`);
                  await sendEmail({
                    email: shopOwner.email,
                    subject: `💰 New Online Order: ${shopName}`,
                    html: getRestaurantOrderAlertTemplate(
                      updatedOrder,
                      shopName
                    ),
                  });
                }
              }
            }
          }

          console.log("✅ Emails Sent!");
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
