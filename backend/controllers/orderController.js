import Order from "../models/orderModel.js";
import User from "../models/userModel.js"; // 👈 Required to find Restaurant Owner
import sendEmail from "../utils/sendEmail.js";
import {
  getOrderConfirmationTemplate,
  getAdminOrderAlertTemplate,
  getRestaurantOrderAlertTemplate,
  getUserDriverAssignedTemplate,
} from "../utils/emailTemplates.js"; // 👈 Imported Professional Templates

// =================================================================
// 📧 HELPER: NOTIFY ADMIN & RESTAURANT (Multi-Vendor Logic)
// =================================================================
const notifyRestaurantAndAdmin = async (order) => {
  try {
    // 1. Notify Super Admin (Fixed Email as requested)
    // Links to: /admin/dashboard
    await sendEmail({
      email: "ganand62077@gmail.com",
      subject: `🚨 New Order: #${order._id.toString().slice(-6)}`,
      html: getAdminOrderAlertTemplate(order),
    });

    // 2. Notify Restaurant Owner (Dynamic)
    // Links to: /restaurant/dashboard
    // Logic: Look at the first item to find the restaurant ID
    const restaurantId = order.orderItems[0].restaurant;

    if (restaurantId) {
      const shopOwner = await User.findById(restaurantId);
      if (shopOwner && shopOwner.email) {
        console.log(`📨 Alerting Shop Owner: ${shopOwner.email}`);
        await sendEmail({
          email: shopOwner.email,
          subject: `🔔 New Order for ${shopOwner.name}`,
          html: getRestaurantOrderAlertTemplate(order, shopOwner.name),
        });
      }
    }
  } catch (err) {
    console.error("Notification Error:", err.message);
  }
};

// =================================================================
// 🛒 ORDER CREATION (Handles COD Emails Instantly)
// =================================================================

// @desc    Create new order
export const addOrderItems = async (req, res) => {
  const {
    orderItems,
    shippingAddress,
    paymentMethod,
    itemsPrice,
    taxPrice,
    shippingPrice,
    totalPrice,
  } = req.body;

  if (orderItems && orderItems.length === 0) {
    res.status(400);
    throw new Error("No order items");
  } else {
    const order = new Order({
      orderItems: orderItems.map((x) => ({
        ...x,
        product: x.product,
        _id: undefined,
      })),
      user: req.user._id,
      shippingAddress,
      paymentMethod,
      itemsPrice,
      taxPrice,
      shippingPrice,
      totalPrice,
    });

    const createdOrder = await order.save();

    // ==========================================
    // 🚚 COD EMAIL FLOW
    // ==========================================
    if (paymentMethod === "COD") {
      // 1. Send Receipt to USER (Links to My Orders)
      try {
        await sendEmail({
          email: req.user.email,
          subject: `Order Confirmed: #${createdOrder._id.toString().slice(-6)}`,
          html: getOrderConfirmationTemplate(createdOrder, false), // false = Not Paid
        });
      } catch (error) {
        console.error("User COD Email Failed", error);
      }

      // 2. Notify Admin & Restaurant
      await notifyRestaurantAndAdmin(createdOrder);
    }
    // ==========================================

    res.status(201).json(createdOrder);
  }
};

// =================================================================
// 🔍 ORDER FETCHING
// =================================================================

// @desc    Get order by ID
export const getOrderById = async (req, res) => {
  const order = await Order.findById(req.params.id)
    .populate("user", "name email")
    .populate("deliveryPartner", "name phone");

  if (order) {
    res.json(order);
  } else {
    res.status(404);
    throw new Error("Order not found");
  }
};

// @desc    Get logged in user orders
export const getMyOrders = async (req, res) => {
  const orders = await Order.find({ user: req.user._id }).sort({
    createdAt: -1,
  });
  res.json(orders);
};

// =================================================================
// 🚚 STATUS UPDATES & DRIVER ASSIGNMENT
// =================================================================

// @desc    Update order status (Kitchen/Delivery)
export const updateOrderStatus = async (req, res) => {
  const { status } = req.body;
  const order = await Order.findById(req.params.id);

  if (order) {
    order.orderStatus = status;
    if (status === "Delivered") {
      order.isDelivered = true;
      order.deliveredAt = Date.now();
    }
    const updatedOrder = await order.save();
    req.io.to(order._id.toString()).emit("orderUpdated", updatedOrder);
    req.io.emit("globalOrderUpdate", updatedOrder);
    res.json(updatedOrder);
  } else {
    res.status(404);
    throw new Error("Order not found");
  }
};

// @desc    Update order to paid (Manual Admin Action)
export const updateOrderToPaid = async (req, res) => {
  const order = await Order.findById(req.params.id).populate(
    "user",
    "name email"
  );

  if (order) {
    order.isPaid = true;
    order.paidAt = Date.now();
    order.paymentResult = {
      id: req.body.id || "Manual_Admin_Update",
      status: req.body.status || "completed",
      update_time: req.body.update_time || Date.now(),
      email_address: req.body.email_address || order.user.email,
    };

    const updatedOrder = await order.save();

    // Manual Update Email (User Only)
    try {
      await sendEmail({
        email: order.user.email,
        subject: `Payment Confirmed: Order #${order._id.toString().slice(-6)}`,
        html: getOrderConfirmationTemplate(updatedOrder, true), // true = Paid
      });
    } catch (e) {
      console.log("Manual update email failed");
    }

    req.io.to(order._id.toString()).emit("orderUpdated", updatedOrder);
    res.json(updatedOrder);
  } else {
    res.status(404);
    throw new Error("Order not found");
  }
};

// @desc    Update order to delivered
export const updateOrderToDelivered = async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (order) {
    order.isDelivered = true;
    order.deliveredAt = Date.now();
    order.orderStatus = "Delivered";
    const updatedOrder = await order.save();
    req.io.to(order._id.toString()).emit("orderUpdated", updatedOrder);
    res.json(updatedOrder);
  } else {
    res.status(404);
    throw new Error("Order not found");
  }
};

// @desc    Assign delivery partner
export const assignDeliveryPartner = async (req, res) => {
  const { deliveryPartnerId } = req.body;

  // 👇 Populate User (to send email) AND Partner (to get details)
  const order = await Order.findById(req.params.id)
    .populate("user", "name email")
    .populate("deliveryPartner", "name phone");

  if (order) {
    // Manually fetch partner if populate failed (since it's being assigned now)
    const partner = await User.findById(deliveryPartnerId);

    order.deliveryPartner = deliveryPartnerId;
    order.orderStatus = "Out for Delivery";
    const updatedOrder = await order.save();

    // 📧 SEND EMAIL TO USER: "Driver Assigned"
    // Links to: /orders/:id (Track Live)
    if (order.user && order.user.email && partner) {
      try {
        await sendEmail({
          email: order.user.email,
          subject: `🛵 Out for Delivery: Order #${order._id
            .toString()
            .slice(-6)}`,
          html: getUserDriverAssignedTemplate(order, partner), // ✨ PRO TEMPLATE
        });
        console.log("✅ Driver Assigned Email Sent to User");
      } catch (e) {
        console.error("Delivery Email Failed", e);
      }
    }

    req.io.to(order._id.toString()).emit("orderUpdated", updatedOrder);
    res.json(updatedOrder);
  } else {
    res.status(404);
    throw new Error("Order not found");
  }
};

// =================================================================
// 👑 ADMIN ROUTES
// =================================================================

export const getAllOrdersAdmin = async (req, res) => {
  const orders = await Order.find({})
    .populate("user", "id name")
    .populate("deliveryPartner", "name")
    .sort({ createdAt: -1 });
  res.json(orders);
};

export const getOrders = async (req, res) => {
  const orders = await Order.find({})
    .populate("user", "id name")
    .populate("deliveryPartner", "name")
    .sort({ createdAt: -1 });
  res.json(orders);
};

export const getMyDeliveryOrders = async (req, res) => {
  const orders = await Order.find({ deliveryPartner: req.user._id })
    .populate("user", "name email phone")
    .sort({ createdAt: -1 });
  res.json(orders);
};
