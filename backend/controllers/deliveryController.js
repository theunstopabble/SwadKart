import crypto from "crypto";
import Order from "../models/orderModel.js";
import User from "../models/userModel.js";
import sendEmail from "../utils/sendEmail.js";
import {
  getDeliveryRequestTemplate,
  getUserDriverAssignedTemplate,
} from "../utils/emailTemplates.js";
import { sanitizeObjectId } from "../utils/sanitize.js";
import Emergency from "../models/emergencyModel.js";
import { processReferralReward } from "./referralController.js";
import { createNotification } from "./notificationController.js";
import { recalculateETA } from "./etaController.js";
import { updateOrderStreak } from "./gamificationController.js";

// ============================================================
// 🛵 1. GET MY ASSIGNED DELIVERIES
// ============================================================
export const getMyDeliveryOrders = async (req, res) => {
  try {
    // Populate customer info and restaurant location if needed
    // 🛡️ SECURITY FIX: Added .lean()
    const orders = await Order.find({ deliveryPartner: req.user._id })
      .populate("user", "name phone")
      .sort({ createdAt: -1 })
      .lean();

    // 🛡️ SECURITY FIX: Strip out the deliveryOTP from every order in the array
    const securedOrders = orders.map((order) => {
      delete order.deliveryOTP;
      return order;
    });

    res.json(securedOrders);
  } catch (error) {
    res.status(500).json({ message: "Error fetching your deliveries" });
  }
};

// ============================================================
// 👑 2. ASSIGN DELIVERY PARTNER (Admin/Restaurant)
// ============================================================
export const assignDeliveryPartner = async (req, res) => {
  try {
    const orderId = sanitizeObjectId(req.params.id);
    const deliveryPartnerId = sanitizeObjectId(req.body.deliveryPartnerId);

    const order = await Order.findById(orderId).populate(
      "user",
      "name email phone",
    );

    if (!order) return res.status(404).json({ message: "Order not found" });

    const partner = await User.findById(deliveryPartnerId);
    if (!partner)
      return res.status(404).json({ message: "Delivery partner not found" });

    order.deliveryPartner = deliveryPartnerId;
    order.deliveryStatus = "Assigned";
    order.orderStatus = "Ready";

    // OTP logic (Already generated in orderController, but safe to check/refresh here)
    if (!order.deliveryOTP) {
      // 🛡️ SECURITY FIX (BUG-4): Use cryptographically secure OTP
      order.deliveryOTP = crypto.randomInt(1000, 10000);
    }

    const updatedOrder = await order.save();

    // 🔔 Notify Driver via Socket
    if (req.io) {
      req.io
        .to(deliveryPartnerId.toString())
        .emit("orderAssigned", updatedOrder);
      req.io.to(order._id.toString()).emit("orderUpdated", updatedOrder);
    }

    // 📧 Send Email to Driver
    try {
      await sendEmail({
        email: partner.email,
        subject: `🛵 New Delivery Task Assigned: #${order._id
          .toString()
          .slice(-6)}`,
        html: getDeliveryRequestTemplate(updatedOrder, partner),
      });
    } catch (err) {
      console.log("Driver email notification failed.");
    }

    res.json(updatedOrder);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ============================================================
// 🚦 3. UPDATE DELIVERY ACTION (Accept/Reject)
// ============================================================
export const updateDeliveryAction = async (req, res) => {
  const { action } = req.body;
  try {
    const order = await Order.findById(req.params.id);

    if (!order) return res.status(404).json({ message: "Order not found" });

    // Authorization: Guard and verify
    if (!order.deliveryPartner) {
      return res.status(400).json({ message: "No delivery partner assigned to this order" });
    }
    if (order.deliveryPartner.toString() !== req.user._id.toString()) {
      return res.status(401).json({ message: "Not authorized for this task" });
    }

    if (action === "accept") {
      order.deliveryStatus = "Accepted";
      order.orderStatus = "Out for Delivery";

      // ⏰ FEAT-12: Recalculate ETA on driver accept
      const { estimatedDeliveryAt, estimatedMinutes, reason } = recalculateETA(order, "driver_assigned");
      order.estimatedDeliveryAt = estimatedDeliveryAt;
      order.etaUpdates.push({ estimatedMinutes, reason });

      // 📧 Notify Customer that driver is on the way
      const user = await User.findById(order.user);
      if (user && user.email) {
        try {
          await sendEmail({
            email: user.email,
            subject: `🛵 Your SwadKart order is Out for Delivery!`,
            html: getUserDriverAssignedTemplate(
              order,
              req.user,
              order.deliveryOTP,
            ),
          });
        } catch (err) {
          console.log("Customer notification email failed.");
        }
      }
    } else {
      // Reject logic: Set back to Ready so it can be reassigned
      order.deliveryStatus = "Rejected";
      order.deliveryPartner = null;
      order.orderStatus = "Ready";
    }

    const updatedOrder = await order.save();

    // 🔔 Real-time Updates to Customer, Restaurant, and Driver
    if (req.io) {
      req.io.to(order._id.toString()).emit("orderUpdated", updatedOrder);
      req.io.emit("globalOrderUpdate", updatedOrder);
    }

    res.json(updatedOrder);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ============================================================
// ✅ 4. VERIFY OTP AND DELIVER
// ============================================================
export const updateOrderToDelivered = async (req, res) => {
  const { otp } = req.body;
  try {
    const order = await Order.findById(req.params.id);

    if (!order) return res.status(404).json({ message: "Order not found" });

    // 🛡️ Auth check: only assigned partner can deliver
    if (
      !order.deliveryPartner ||
      order.deliveryPartner.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({ message: "Not authorized to deliver this order" });
    }

    // 🛡️ Security: OTP attempt limiting
    if (!order.otpAttempts) order.otpAttempts = 0;
    if (order.otpAttempts >= 5) {
      return res.status(429).json({
        message: "Too many OTP attempts. Contact support.",
      });
    }

    if (order.deliveryOTP !== Number(otp)) {
      order.otpAttempts += 1;
      await order.save();
      return res.status(400).json({
        message: `❌ Incorrect OTP! ${5 - order.otpAttempts} attempts remaining.`,
      });
    }

    // Reset attempts on success
    order.otpAttempts = 0;

    order.isDelivered = true;
    order.deliveredAt = Date.now();
    order.orderStatus = "Delivered";
    order.deliveryStatus = "Delivered";

    // COD Handling
    if (order.paymentMethod === "COD") {
      order.isPaid = true;
      order.paidAt = Date.now();
    }

    const updatedOrder = await order.save();

    // 🏆 FEAT-7: Update gamification streak (non-blocking)
    updateOrderStreak(order.user.toString()).catch(() => {});

    // 🛸 FIX: Free up delivery partner for the next order
    await User.findByIdAndUpdate(req.user._id, {
      isAvailable: true,
    });

    // 🪙 NON-BLOCKING: Process referral rewards on first delivered order
    try {
      await processReferralReward(order.user, order._id);
    } catch (refErr) {
      console.error("🔗 Referral processing error (non-blocking):", refErr.message);
    }

    // 🔔 Notify Everyone
    if (req.io) {
      req.io.to(order._id.toString()).emit("orderUpdated", updatedOrder);
      req.io.emit("globalOrderUpdate", updatedOrder);
    }

    // 🔥 FEAT-20: Push notification to customer (non-blocking)
    try {
      createNotification(
        order.user,
        "Order Delivered",
        `Your order #${order._id.toString().slice(-6).toUpperCase()} has been delivered. Enjoy!`,
        "delivery",
        { orderId: order._id.toString(), deliveredAt: order.deliveredAt },
      );
    } catch (notifErr) {
      console.error("🔔 Delivery notification error (non-blocking):", notifErr.message);
    }

    res.json(updatedOrder);
  } catch (err) {
    res
      .status(500)
      .json({ message: "Server error during delivery completion." });
  }
};

// ============================================================
// 🆘 5. TRIGGER SOS (Driver Emergency)
// ============================================================
export const triggerSOS = async (req, res) => {
  const { lat, lng, address } = req.body;

  try {
    const emergency = new Emergency({
      driver: req.user._id,
      location: { lat, lng, address },
    });

    const savedEmergency = await emergency.save();

    // 🔔 Notify Admin via Socket (Privacy Hardened)
    if (req.io) {
      req.io.emit("emergencyAlert", {
        message: `🆘 EMERGENCY! Driver ${req.user.name} needs help!`,
        driverId: req.user._id,
        driverName: req.user.name,
        location: { lat, lng },
        time: new Date(),
      });
    }

    res.status(201).json({ message: "SOS Sent! Help is on the way." });
  } catch (error) {
    res.status(500).json({ message: "SOS Failed: " + error.message });
  }
};
