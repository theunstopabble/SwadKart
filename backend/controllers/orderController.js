import Order from "../models/orderModel.js";
import User from "../models/userModel.js";
import Restaurant from "../models/restaurantModel.js"; // 👈 Required for Restaurant details
import sendEmail from "../utils/sendEmail.js";
import {
  getOrderConfirmationTemplate,
  getAdminOrderAlertTemplate,
  getRestaurantOrderAlertTemplate,
  getUserDriverAssignedTemplate,
  getDeliveryRequestTemplate, // 👈 For Driver Accept/Reject
  getOrderCancelledTemplate, // 👈 For Cancellation
} from "../utils/emailTemplates.js";

// =================================================================
// 📧 HELPER: NOTIFY ADMIN & RESTAURANT (DATABASE DRIVEN 🛡️)
// =================================================================
const notifyRestaurantAndAdmin = async (order) => {
  try {
    // 1. Notify Super Admin (FETCH FROM DB - NO HARDCODING) 🕵️‍♂️
    const adminUser = await User.findOne({ role: "admin" });

    if (adminUser && adminUser.email) {
      console.log(`📨 Found Admin in DB: ${adminUser.email}`);
      await sendEmail({
        email: adminUser.email,
        subject: `🚨 New Order: #${order._id.toString().slice(-6)}`,
        html: getAdminOrderAlertTemplate(order),
      });
    } else {
      console.error("❌ No Admin User found in Database to send alert!");
    }

    // 2. Notify Restaurant Owner (Dynamic via Restaurant Model)
    if (order.orderItems && order.orderItems.length > 0) {
      const restaurantId = order.orderItems[0].restaurant;

      if (restaurantId) {
        const restaurantDoc = await Restaurant.findById(restaurantId).populate(
          "owner"
        );

        if (restaurantDoc && restaurantDoc.owner) {
          const shopOwner = restaurantDoc.owner;
          const shopName = restaurantDoc.name;

          // Check if email exists and is NOT a dummy email
          if (shopOwner.email && !shopOwner.email.includes("@dummy.swadkart")) {
            console.log(`📨 Alerting Shop: ${shopName} (${shopOwner.email})`);

            await sendEmail({
              email: shopOwner.email,
              subject: `🔔 New Order for ${shopName}`,
              html: getRestaurantOrderAlertTemplate(order, shopName),
            });
          } else {
            console.log("⚠️ Dummy Shop or Missing Email. Skipping Shop Alert.");
          }
        }
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
    // 👇 ADDED: Coupon Data
    couponCode,
    couponDiscount,
  } = req.body;

  if (orderItems && orderItems.length === 0) {
    res.status(400);
    throw new Error("No order items");
  } else {
    const order = new Order({
      orderItems: orderItems.map((x) => ({
        ...x,
        product: x.product,
        restaurant: x.restaurant, // 👈 Ensures Restaurant ID is saved
        _id: undefined,
      })),
      user: req.user._id,
      shippingAddress,
      paymentMethod,
      itemsPrice,
      taxPrice,
      shippingPrice,
      totalPrice,
      // 👇 ADDED: Save Coupon Info to DB
      couponCode,
      couponDiscount,
    });

    const createdOrder = await order.save();

    // ==========================================
    // 🚚 COD EMAIL FLOW
    // ==========================================
    if (paymentMethod === "COD") {
      // 1. Send Receipt to USER
      try {
        await sendEmail({
          email: req.user.email,
          subject: `Order Confirmed: #${createdOrder._id.toString().slice(-6)}`,
          html: getOrderConfirmationTemplate(createdOrder, false), // false = Not Paid
        });
      } catch (error) {
        console.error("User COD Email Failed", error);
      }

      // 2. Notify Admin & Restaurant (DB Logic)
      await notifyRestaurantAndAdmin(createdOrder);
    }

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
// 🚚 DELIVERY & STATUS LOGIC
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
      order.deliveryStatus = "Delivered";
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

// @desc    Assign Delivery Partner (Sends Accept/Reject Request)
export const assignDeliveryPartner = async (req, res) => {
  const { deliveryPartnerId } = req.body;

  // 👇 Populate User & Partner for Email
  const order = await Order.findById(req.params.id)
    .populate("user", "name email phone")
    .populate("deliveryPartner", "name phone");

  if (order) {
    const User = (await import("../models/userModel.js")).default;
    const partner = await User.findById(deliveryPartnerId);

    if (!partner) {
      res.status(404);
      throw new Error("Partner not found");
    }

    // Update Order State
    order.deliveryPartner = deliveryPartnerId;
    order.deliveryStatus = "Assigned"; // 👈 Set status to Assigned
    order.orderStatus = "Ready"; // Food is ready

    const updatedOrder = await order.save();

    // 📧 SEND NEW "REQUEST" EMAIL TO PARTNER
    if (partner.email) {
      try {
        await sendEmail({
          email: partner.email,
          subject: `🛵 New Delivery Task: #${order._id.toString().slice(-6)}`,
          html: getDeliveryRequestTemplate(updatedOrder, partner), // ✨ Includes Accept/Reject Buttons
        });
        console.log(`✅ Delivery Request Sent to ${partner.name}`);
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

// @desc    Update Delivery Action (Accept/Reject by Driver)
export const updateDeliveryAction = async (req, res) => {
  const { action } = req.body; // 'accept' or 'reject'
  const order = await Order.findById(req.params.id);

  if (order) {
    // Security Check: Only assigned partner can accept/reject
    if (order.deliveryPartner.toString() !== req.user._id.toString()) {
      res.status(401);
      throw new Error("Not authorized");
    }

    if (action === "accept") {
      order.deliveryStatus = "Accepted";
      order.orderStatus = "Out for Delivery";

      // Notify User: Driver is coming!
      const user = await User.findById(order.user);
      const partner = await User.findById(order.deliveryPartner);
      if (user && partner) {
        try {
          await sendEmail({
            email: user.email,
            subject: `🛵 Driver is on the way!`,
            html: getUserDriverAssignedTemplate(order, partner),
          });
        } catch (e) {}
      }
    } else if (action === "reject") {
      order.deliveryStatus = "Rejected";
      order.deliveryPartner = null; // Unassign so Admin/Restaurant can re-assign
    }

    const updatedOrder = await order.save();
    req.io.to(order._id.toString()).emit("orderUpdated", updatedOrder);
    res.json(updatedOrder);
  } else {
    res.status(404);
    throw new Error("Order not found");
  }
};

// =================================================================
// 🚫 CANCELLATION LOGIC
// =================================================================

// @desc    Cancel Order (User/Admin)
export const cancelOrder = async (req, res) => {
  const { reason } = req.body;
  const order = await Order.findById(req.params.id).populate(
    "user",
    "email name"
  );

  if (order) {
    // Permissions Check
    if (
      order.user._id.toString() !== req.user._id.toString() &&
      req.user.role !== "admin"
    ) {
      res.status(401);
      throw new Error("Not authorized");
    }

    // Restriction: Can't cancel if food is out
    if (
      order.orderStatus === "Out for Delivery" ||
      order.orderStatus === "Delivered"
    ) {
      res.status(400);
      throw new Error("Cannot cancel order at this stage.");
    }

    // Update State
    order.orderStatus = "Cancelled";
    order.deliveryStatus = "None";
    order.cancellationReason = reason || "User cancelled";
    order.cancelledAt = Date.now();

    const updatedOrder = await order.save();

    // 📧 Notify User
    try {
      await sendEmail({
        email: order.user.email,
        subject: `Order Cancelled: #${order._id.toString().slice(-6)}`,
        html: getOrderCancelledTemplate(updatedOrder, reason),
      });
    } catch (e) {
      console.error("Cancel Email Failed", e);
    }

    req.io.to(order._id.toString()).emit("orderUpdated", updatedOrder);
    res.json({ message: "Order Cancelled", order: updatedOrder });
  } else {
    res.status(404);
    throw new Error("Order not found");
  }
};

// =================================================================
// 👑 ADMIN & DASHBOARD ROUTES
// =================================================================

export const updateOrderToPaid = async (req, res) => {
  const order = await Order.findById(req.params.id).populate(
    "user",
    "name email"
  );
  if (order) {
    order.isPaid = true;
    order.paidAt = Date.now();
    order.paymentResult = {
      id: req.body.id || "Manual",
      status: "completed",
      update_time: Date.now(),
      email_address: order.user.email,
    };
    const updatedOrder = await order.save();
    try {
      await sendEmail({
        email: order.user.email,
        subject: `Payment Confirmed`,
        html: getOrderConfirmationTemplate(updatedOrder, true),
      });
    } catch (e) {}
    req.io.to(order._id.toString()).emit("orderUpdated", updatedOrder);
    res.json(updatedOrder);
  } else {
    res.status(404);
    throw new Error("Order not found");
  }
};

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

// @desc    Get Dashboard Analytics (Role Based: Admin vs Restaurant)
export const getDashboardStats = async (req, res) => {
  try {
    let query = {}; // Default: Empty query means ALL data (For Admin)

    // 🔒 IF RESTAURANT OWNER: Filter data strictly for their restaurant
    if (req.user.role === "restaurant_owner") {
      // 1. Find the restaurant belonging to this logged-in user
      const restaurantDoc = await Restaurant.findOne({ owner: req.user._id });

      if (!restaurantDoc) {
        return res
          .status(404)
          .json({ message: "No restaurant found for this owner." });
      }

      // 2. Query Logic: Order items must belong to this restaurant
      query = { "orderItems.restaurant": restaurantDoc._id };
    }

    // ===============================================
    // 📊 FETCH ANALYTICS
    // ===============================================
    const totalOrders = await Order.countDocuments(query);
    const paidOrders = await Order.find({ ...query, isPaid: true });
    const totalSales = paidOrders.reduce(
      (acc, order) => acc + order.totalPrice,
      0
    );

    const breakdown = {
      placed: await Order.countDocuments({ ...query, orderStatus: "Placed" }),
      preparing: await Order.countDocuments({
        ...query,
        orderStatus: "Preparing",
      }),
      ready: await Order.countDocuments({ ...query, orderStatus: "Ready" }),
      outForDelivery: await Order.countDocuments({
        ...query,
        orderStatus: "Out for Delivery",
      }),
      delivered: await Order.countDocuments({
        ...query,
        orderStatus: "Delivered",
      }),
      cancelled: await Order.countDocuments({
        ...query,
        orderStatus: "Cancelled",
      }),
    };

    const recentOrders = await Order.find(query)
      .sort({ createdAt: -1 })
      .limit(5)
      .populate("user", "name");

    res.json({
      role: req.user.role,
      totalOrders,
      totalSales,
      breakdown,
      recentOrders,
    });
  } catch (error) {
    console.error("Dashboard Stats Error:", error);
    res.status(500).json({ message: "Server Error in Stats" });
  }
};
