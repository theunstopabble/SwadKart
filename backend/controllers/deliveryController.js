import crypto from "crypto";
import prisma from "../config/prisma.js";
import sendEmail from "../utils/sendEmail.js";
import {
  getDeliveryRequestTemplate,
  getUserDriverAssignedTemplate,
} from "../utils/emailTemplates.js";
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
    const userId = req.user.id || req.user._id;

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where: { deliveryPartnerId: userId },
        include: { user: { select: { id: true, name: true, phone: true } } },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.order.count({ where: { deliveryPartnerId: userId } }),
    ]);

    res.json({ orders, page, pages: Math.ceil(total / limit), total });
  } catch (error) {
    res.status(500).json({ message: "Error fetching your deliveries" });
  }
};

// ============================================================
// 👑 2. ASSIGN DELIVERY PARTNER
// ============================================================
export const assignDeliveryPartner = async (req, res) => {
  try {
    const orderId = req.params.id;
    const deliveryPartnerId = req.body.deliveryPartnerId;
    const currentUserId = req.user.id || req.user._id;

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { user: { select: { id: true, name: true, email: true, phone: true } } },
    });

    if (!order) return res.status(404).json({ message: "Order not found" });

    if (req.user.role === "restaurant_owner") {
      const restaurant = await prisma.restaurant.findFirst({
        where: { ownerId: currentUserId },
      });
      if (!restaurant) {
        return res.status(404).json({ message: "Restaurant not found" });
      }
      if (order.restaurantId !== restaurant.id) {
        return res.status(403).json({ message: "Not authorized to assign partner for this order" });
      }
    }

    if (order.orderStatus === "Delivered" || order.orderStatus === "Cancelled") {
      return res.status(400).json({ message: `Cannot assign partner to a ${order.orderStatus.toLowerCase()} order` });
    }

    const partner = await prisma.user.findFirst({
      where: { id: deliveryPartnerId, role: "delivery_partner", isAvailable: true },
    });
    if (!partner) {
      return res.status(400).json({ message: "Delivery partner is not available or not found" });
    }

    await prisma.user.update({
      where: { id: deliveryPartnerId },
      data: { isAvailable: false },
    });

    const deliveryOTP = order.deliveryOTP || crypto.randomInt(1000, 10000);

    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: {
        deliveryPartnerId,
        deliveryStatus: "Assigned",
        orderStatus: "Ready",
        deliveryOTP,
      },
    });

    if (req.io) {
      req.io.to(deliveryPartnerId).emit("orderAssigned", updatedOrder);
      const { deliveryOTP: _, ...customerView } = updatedOrder;
      req.io.to(order.id).emit("orderUpdated", customerView);
    }

    if (partner.email) {
      sendEmail({
        email: partner.email,
        subject: `New Delivery Task: #${order.id.slice(-6).toUpperCase()}`,
        html: getDeliveryRequestTemplate(updatedOrder, partner),
      }).catch(() => {});
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
  const currentUserId = req.user.id || req.user._id;

  try {
    const order = await prisma.order.findUnique({
      where: { id: req.params.id },
      include: { user: true },
    });

    if (!order) return res.status(404).json({ message: "Order not found" });

    if (!order.deliveryPartnerId) {
      return res.status(400).json({ message: "No delivery partner assigned to this order" });
    }
    if (order.deliveryPartnerId !== currentUserId) {
      return res.status(401).json({ message: "Not authorized for this task" });
    }

    let updatedOrder;
    if (action === "accept") {
      const { estimatedDeliveryAt } = recalculateETA(order, "driver_assigned");

      updatedOrder = await prisma.order.update({
        where: { id: order.id },
        data: {
          deliveryStatus: "Accepted",
          orderStatus: "Out for Delivery",
          estimatedDeliveryAt,
        },
      });

      if (order.user?.email) {
        sendEmail({
          email: order.user.email,
          subject: "Your SwadKart order is Out for Delivery!",
          html: getUserDriverAssignedTemplate(order, req.user, order.deliveryOTP),
        }).catch(() => {});
      }
    } else {
      const newStatus =
        order.orderStatus === "Preparing" || order.orderStatus === "Placed"
          ? "Placed"
          : "Ready";

      await prisma.user.update({
        where: { id: currentUserId },
        data: { isAvailable: true },
      });

      updatedOrder = await prisma.order.update({
        where: { id: order.id },
        data: {
          deliveryStatus: "Rejected",
          deliveryPartnerId: null,
          orderStatus: newStatus,
        },
      });
    }

    if (req.io) {
      const { deliveryOTP: _, ...orderData } = updatedOrder;
      req.io.to(order.id).emit("orderUpdated", orderData);
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
  const currentUserId = req.user.id || req.user._id;

  try {
    const order = await prisma.order.findUnique({
      where: { id: req.params.id },
    });

    if (!order) return res.status(404).json({ message: "Order not found" });

    if (req.user.role !== "admin") {
      if (!order.deliveryPartnerId || order.deliveryPartnerId !== currentUserId) {
        return res.status(403).json({ message: "Not authorized to deliver this order" });
      }
    }

    if (order.otpAttempts >= 5) {
      return res.status(429).json({
        message: "Too many OTP attempts. Contact support.",
      });
    }

    if (order.deliveryOTP !== Number(otp)) {
      const newAttempts = order.otpAttempts + 1;
      await prisma.order.update({
        where: { id: order.id },
        data: { otpAttempts: newAttempts },
      });
      const remaining = 5 - newAttempts;
      return res.status(400).json({
        message:
          remaining > 0
            ? `❌ Incorrect OTP! ${remaining} attempt${remaining !== 1 ? "s" : ""} remaining.`
            : "❌ No OTP attempts remaining. Contact support.",
      });
    }

    const updatedOrder = await prisma.order.update({
      where: { id: order.id },
      data: {
        otpAttempts: 0,
        isDelivered: true,
        deliveredAt: new Date(),
        orderStatus: "Delivered",
        deliveryStatus: "Delivered",
        isPaid: order.paymentMethod === "COD" ? true : order.isPaid,
        paidAt: order.paymentMethod === "COD" ? new Date() : order.paidAt,
      },
    });

    updateOrderStreak(order.userId).catch(() => {});

    await prisma.user.update({
      where: { id: currentUserId },
      data: { isAvailable: true },
    });

    try {
      await processReferralReward(order.userId, order.id);
    } catch (refErr) {
      console.error("🔗 Referral processing error:", refErr.message);
    }

    if (req.io) {
      const { deliveryOTP: _, ...orderData } = updatedOrder;
      req.io.to(order.id).emit("orderUpdated", orderData);
      req.io.emit("globalOrderUpdate", orderData);
    }

    try {
      createNotification(
        order.userId,
        "Order Delivered",
        `Your order #${order.id.slice(-6).toUpperCase()} has been delivered. Enjoy!`,
        "delivery",
        { orderId: order.id, deliveredAt: updatedOrder.deliveredAt },
      );
    } catch {}

    res.json(updatedOrder);
  } catch (err) {
    res.status(500).json({ message: "Server error during delivery completion." });
  }
};

// ============================================================
// 🆘 5. TRIGGER SOS (Driver Emergency)
// ============================================================
export const triggerSOS = async (req, res) => {
  const { lat, lng, address } = req.body;
  const currentUserId = req.user.id || req.user._id;

  try {
    const emergency = await prisma.emergency.create({
      data: {
        driverId: currentUserId,
        location: { lat, lng, address },
      },
    });

    if (req.io) {
      req.io.emit("emergencyAlert", {
        message: `🆘 EMERGENCY! Driver ${req.user.name} needs help!`,
        driverId: currentUserId,
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
