import Order from "../models/orderModel.js";
import User from "../models/userModel.js";
import sendEmail from "../utils/sendEmail.js";
import {
  getDeliveryRequestTemplate,
  getUserDriverAssignedTemplate,
} from "../utils/emailTemplates.js";
import Emergency from "../models/emergencyModel.js";

// ============================================================
// 🛵 1. GET MY ASSIGNED DELIVERIES
// ============================================================
export const getMyDeliveryOrders = async (req, res) => {
  try {
    // Populate customer info and restaurant location if needed
    const orders = await Order.find({ deliveryPartner: req.user._id })
      .populate("user", "name email phone")
      .sort({ createdAt: -1 });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: "Error fetching your deliveries" });
  }
};

// ============================================================
// 👑 2. ASSIGN DELIVERY PARTNER (Admin/Restaurant)
// ============================================================
export const assignDeliveryPartner = async (req, res) => {
  const { deliveryPartnerId } = req.body;
  try {
    const order = await Order.findById(req.params.id).populate(
      "user",
      "name email phone"
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
      order.deliveryOTP = Math.floor(1000 + Math.random() * 9000);
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

    // Authorization: Only the assigned partner can act
    if (order.deliveryPartner.toString() !== req.user._id.toString()) {
      return res.status(401).json({ message: "Not authorized for this task" });
    }

    if (action === "accept") {
      order.deliveryStatus = "Accepted";
      order.orderStatus = "Out for Delivery";

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
              order.deliveryOTP
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

    // 🛡️ Security: OTP Check
    if (order.deliveryOTP !== Number(otp)) {
      return res
        .status(400)
        .json({
          message:
            "❌ Incorrect OTP! Please ask the customer for the correct code.",
        });
    }

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

    // 🔔 Notify Everyone
    if (req.io) {
      req.io.to(order._id.toString()).emit("orderUpdated", updatedOrder);
      req.io.emit("globalOrderUpdate", updatedOrder);
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

    // 🔔 Notify Admin via Socket
    if (req.io) {
      req.io.emit("emergencyAlert", {
        message: `🆘 EMERGENCY! Driver ${req.user.name} needs help!`,
        driverName: req.user.name,
        phone: req.user.phone, // Ensure phone is in user model
        location: { lat, lng },
        time: new Date(),
      });
    }

    res.status(201).json({ message: "SOS Sent! Help is on the way." });
  } catch (error) {
    res.status(500).json({ message: "SOS Failed: " + error.message });
  }
};