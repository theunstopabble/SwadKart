import crypto from "crypto";
import Order from "../models/orderModel.js";
import User from "../models/userModel.js";
import Restaurant from "../models/restaurantModel.js";
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
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const [orders, total] = await Promise.all([
      Order.find({ deliveryPartner: req.user._id })
        .populate("user", "name phone")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Order.countDocuments({ deliveryPartner: req.user._id }),
    ]);

    res.json({ orders, page, pages: Math.ceil(total / limit), total });
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

    // 🛡️ Restaurant owner can only assign for their own restaurant's orders
    if (req.user.role === "restaurant_owner") {
      const restaurant = await Restaurant.findOne({ owner: req.user._id });
      if (!restaurant) {
        return res.status(404).json({ message: "Restaurant not found" });
      }
      const orderHasRestaurantItem = order.orderItems.some(
        (item) => item.restaurant?.toString() === restaurant._id.toString(),
      );
      if (!orderHasRestaurantItem) {
        return res.status(403).json({ message: "Not authorized to assign partner for this order" });
      }
    }

    // Cannot assign to delivered or cancelled orders
    if (order.orderStatus === "Delivered" || order.orderStatus === "Cancelled") {
      return res.status(400).json({ message: `Cannot assign partner to a ${order.orderStatus.toLowerCase()} order` });
    }

    // 🛡️ ATOMIC: findOneAndUpdate prevents race condition where two admins
    // assign the same partner simultaneously. Only matches if available=true.
    const partner = await User.findOneAndUpdate(
      { _id: deliveryPartnerId, role: "delivery_partner", isAvailable: true },
      { $set: { isAvailable: false } },
      { returnDocument: "after" }
    );
    if (!partner) {
      return res.status(400).json({ message: "Delivery partner is not available or not found" });
    }

    order.deliveryPartner = deliveryPartnerId;
    order.deliveryStatus = "Assigned";
    order.orderStatus = "Ready";

    // OTP logic (Already generated in orderController, but safe to check/refresh here)
    if (!order.deliveryOTP) {
      // 🛡️ SECURITY FIX (BUG-4): Use cryptographically secure OTP
      order.deliveryOTP = crypto.randomInt(1000, 10000);
    }

    const updatedOrder = await order.save();

    // 🔔 Notify Driver via Socket (with OTP)
    if (req.io) {
      req.io
        .to(deliveryPartnerId.toString())
        .emit("orderAssigned", updatedOrder);
      // Notify customer WITHOUT OTP
      const customerView = updatedOrder.toObject();
      delete customerView.deliveryOTP;
      req.io.to(order._id.toString()).emit("orderUpdated", customerView);
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

    // 💬 WhatsApp notify customer + driver (non-blocking)
    try {
      const { sendText } = await import("../services/whatsapp/whatsappService.js");
      const orderRef = updatedOrder._id.toString().slice(-6).toUpperCase();
      const customer = order.user;
      if (customer?.whatsappNotifications?.orders && customer.phone) {
        sendText("default", `91${customer.phone}@c.us`, `🛵 Delivery partner assigned for order #${orderRef}.`).catch(() => {});
      }
      if (partner?.whatsappNotifications?.orders && partner.phone) {
        sendText("default", `91${partner.phone}@c.us`, `🛵 New delivery task: Order #${orderRef}. Pickup and deliver to customer.`).catch(() => {});
      }
    } catch (waErr) {
      console.error("💬 WhatsApp assignment error (non-blocking):", waErr.message);
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
      if (order.orderStatus === "Preparing" || order.orderStatus === "Placed") {
        order.orderStatus = "Placed";
      } else {
        order.orderStatus = "Ready";
      }
      order.deliveryStatus = "Rejected";
      order.deliveryPartner = null;
      await User.findByIdAndUpdate(req.user._id, { isAvailable: true });
    }

    const updatedOrder = await order.save();

    // 🔔 Real-time Updates — strip OTP from customer-facing emits
    if (req.io) {
      const orderData = updatedOrder.toObject();
      delete orderData.deliveryOTP;
      req.io.to(order._id.toString()).emit("orderUpdated", orderData);
      req.io.emit("globalOrderUpdate", orderData);
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

    // 🛡️ Auth check: only assigned partner can deliver (admins bypass)
    if (req.user.role !== "admin") {
      if (
        !order.deliveryPartner ||
        order.deliveryPartner.toString() !== req.user._id.toString()
      ) {
        return res.status(403).json({ message: "Not authorized to deliver this order" });
      }
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
      const remaining = 5 - order.otpAttempts;
      return res.status(400).json({
        message: remaining > 0
          ? `❌ Incorrect OTP! ${remaining} attempt${remaining !== 1 ? 's' : ''} remaining.`
          : "❌ No OTP attempts remaining. Contact support.",
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

    // 🔔 Notify Everyone — strip OTP from customer-facing emits
    if (req.io) {
      const orderData = updatedOrder.toObject();
      delete orderData.deliveryOTP;
      req.io.to(order._id.toString()).emit("orderUpdated", orderData);
      req.io.emit("globalOrderUpdate", orderData);
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

    // 💬 WhatsApp delivery confirmation (non-blocking)
    try {
      const deliveredUser = await User.findById(order.user).select("phone whatsappNotifications").lean();
      if (deliveredUser?.whatsappNotifications?.orders && deliveredUser.phone) {
        const { sendText } = await import("../services/whatsapp/whatsappService.js");
        sendText("default", `91${deliveredUser.phone}@c.us`, `✅ Delivered! Your SwadKart order #${updatedOrder._id.toString().slice(-6).toUpperCase()} has arrived. Enjoy your meal! 🍽️`).catch(() => {});
      }
    } catch (waErr) {
      console.error("💬 WhatsApp delivery notification error (non-blocking):", waErr.message);
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
