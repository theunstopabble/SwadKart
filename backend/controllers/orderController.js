import Order from "../models/orderModel.js";
import Product from "../models/productModel.js";
import Restaurant from "../models/restaurantModel.js"; // 👈 YE LINE ADD KAREIN
import mongoose from "mongoose";
import asyncHandler from "express-async-handler";
import Razorpay from "razorpay"; // 👈 YE IMPORT ADD KAREIN

// ==========================================
// 🛒 1. CREATE NEW ORDER
// ==========================================

// @desc    Create new order with Stock Race-Condition protection
// @route   POST /api/v1/orders
// @access  Private
export const addOrderItems = asyncHandler(async (req, res) => {
  const {
    orderItems,
    shippingAddress,
    paymentMethod,
    itemsPrice,
    taxPrice,
    shippingPrice,
    totalPrice,
    couponCode,
    discountAmount,
  } = req.body;

  if (orderItems && orderItems.length === 0) {
    res.status(400);
    throw new Error("No order items found");
    return;
  }

  // ==========================================
  // 🛡️ SECURITY FIX: Single Restaurant Validation
  // ==========================================
  const firstRestaurantId = orderItems[0].restaurant;
  const hasMultipleRestaurants = orderItems.some(
    (item) => item.restaurant.toString() !== firstRestaurantId.toString(),
  );

  if (hasMultipleRestaurants) {
    res.status(400);
    throw new Error("Items must be from a single restaurant");
    return;
  }
  // ==========================================

  // Start a MongoDB Transaction Session
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // 1. Loop through items to strictly verify and decrement stock atomically
    for (const item of orderItems) {
      const product = await Product.findById(item.product).session(session);

      if (!product) {
        throw new Error(`Product not found: ${item.name}`);
      }

      // Explicit check to prevent negative stock
      if (product.countInStock < item.qty) {
        throw new Error(
          `Out of stock: ${product.name}. Only ${product.countInStock} items left.`,
        );
      }

      // Decrement stock strictly using $inc and the transaction session
      await Product.findByIdAndUpdate(
        item.product,
        { $inc: { countInStock: -item.qty } },
        { session },
      );
    }

    // 2. Map items and create Order instance
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
      couponCode,
      discountAmount,
    });

    // 3. Save order using the same transaction session
    const createdOrder = await order.save({ session });

    // 4. Commit the transaction if everything is successful
    await session.commitTransaction();
    session.endSession();

    res.status(201).json(createdOrder);
  } catch (error) {
    // 🚨 If anything fails (like stock finishes), abort the entire transaction
    await session.abortTransaction();
    session.endSession();

    res.status(400);
    throw new Error(error.message);
  }
});

// ==========================================
// 🔍 2. GET ORDER BY ID
// ==========================================
export const getOrderById = async (req, res) => {
  try {
    // 🛡️ SECURITY FIX: Added .lean() to allow modifying the result object
    const order = await Order.findById(req.params.id)
      .populate("user", "name email")
      .populate("deliveryPartner", "name phone")
      .populate({
        path: "orderItems.product",
        select: "name image category",
      })
      .lean();

    if (order) {
      // 🛡️ SECURITY FIX: Completely remove OTP if the user is a delivery partner
      if (req.user && req.user.role === "delivery_partner") {
        delete order.deliveryOTP;
      }
      res.json(order);
    } else {
      res.status(404).json({ message: "Order not found." });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ==========================================
// 💳 3. UPDATE ORDER TO PAID
// ==========================================
export const updateOrderToPaid = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);

    if (order) {
      order.isPaid = true;
      order.paidAt = Date.now();
      order.paymentResult = {
        id: req.body.id,
        status: req.body.status,
        update_time: req.body.update_time,
        email_address: req.body.email_address,
      };

      const updatedOrder = await order.save();

      if (req.io) {
        req.io
          .to(updatedOrder._id.toString())
          .emit("orderUpdated", updatedOrder);
      }

      res.json(updatedOrder);
    } else {
      res.status(404).json({ message: "Order not found" });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ==========================================
// 🚚 4. UPDATE ORDER TO DELIVERED
// ==========================================
export const updateOrderToDelivered = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);

    if (order) {
      order.isDelivered = true;
      order.deliveredAt = Date.now();
      order.orderStatus = "Delivered";

      if (order.paymentMethod === "COD") {
        order.isPaid = true;
        order.paidAt = Date.now();
      }

      const updatedOrder = await order.save();

      if (req.io) {
        req.io
          .to(updatedOrder._id.toString())
          .emit("orderUpdated", updatedOrder);
      }

      res.json(updatedOrder);
    } else {
      res.status(404).json({ message: "Order not found" });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ==========================================
// 🛠️ 5. UPDATE ORDER STATUS (Generic)
// ==========================================
export const updateOrderStatus = async (req, res) => {
  const { status } = req.body;
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: "Order not found" });

    order.orderStatus = status;

    if (status === "Delivered") {
      order.isDelivered = true;
      order.deliveredAt = Date.now();
      if (order.paymentMethod === "COD") {
        order.isPaid = true;
        order.paidAt = Date.now();
      }
    }

    const updatedOrder = await order.save();

    // 🔔 Notify User & Delivery Partner
    if (req.io) {
      req.io.to(order._id.toString()).emit("orderUpdated", updatedOrder);

      // If ready, notify delivery partners
      if (status === "Ready") {
        req.io.emit("newDeliveryTask", updatedOrder);
      }
    }

    res.json(updatedOrder);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ==========================================
// 📜 6. USER ORDER HISTORY
// ==========================================
export const getMyOrders = async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user._id }).sort({
      createdAt: -1,
    });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ==========================================
// 👨‍🍳 7. RESTAURANT OWNER ORDERS (FIXED)
// ==========================================
export const getMyRestaurantOrders = async (req, res) => {
  console.log("🔥 Controller Hit: getMyRestaurantOrders");
  console.log("👤 User ID:", req.user._id);
  try {
    // 1. Find the restaurant owned by this user
    const restaurant = await Restaurant.findOne({ owner: req.user._id });

    if (!restaurant) {
      console.log("❌ Error: No Restaurant Profile found for this user.");
      return res
        .status(404)
        .json({ message: "No restaurant profile found. Please create one." });
    }
    console.log("✅ Restaurant Found:", restaurant.name);

    // 2. Find orders that contain items from this restaurant
    const orders = await Order.find({
      "orderItems.restaurant": restaurant._id,
    })
      .populate("user", "name email")
      .populate("deliveryPartner", "name phone")
      .sort({ createdAt: -1 });
    console.log(`📦 Orders Found: ${orders.length}`);

    res.json(orders);
  } catch (error) {
    console.error("Error in getMyRestaurantOrders:", error);
    res.status(500).json({ message: error.message });
  }
};

// ==========================================
// 👑 8. ADMIN: ALL ORDERS
// ==========================================
export const getOrders = async (req, res) => {
  try {
    // 🚀 PERFORMANCE FIX: Extracted Page & Limit
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const count = await Order.countDocuments({});

    const orders = await Order.find({})
      .populate("user", "id name email")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(); // Faster JSON conversion

    res.json({
      data: orders,
      metadata: {
        total: count,
        page,
        pages: Math.ceil(count / limit),
        limit,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ==========================================
// 📈 9. SALES ANALYTICS
// ==========================================
export const getSalesStats = async (req, res) => {
  try {
    const stats = await Order.aggregate([
      { $match: { isPaid: true } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          sales: { $sum: "$totalPrice" },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
      { $limit: 7 },
    ]);
    res.json(stats);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ==========================================
// ❌ CANCEL ORDER & REFUND LOGIC
// ==========================================

// @desc    Cancel an order, process refund & restore stock
// @route   PUT /api/v1/orders/:id/cancel
// @access  Private
export const cancelOrder = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);

  if (!order) {
    res.status(404);
    throw new Error("Order not found");
  }

  if (order.status === "Cancelled" || order.orderStatus === "Cancelled") {
    res.status(400);
    throw new Error("Order is already cancelled");
  }

  // 1. Process Razorpay Refund if previously paid online
  if (
    order.isPaid === true &&
    order.paymentMethod === "Online" &&
    order.paymentResult?.id
  ) {
    try {
      const razorpayInstance = new Razorpay({
        key_id: process.env.RAZORPAY_KEY_ID,
        key_secret: process.env.RAZORPAY_KEY_SECRET,
      });

      // Initiate full refund via Razorpay API
      await razorpayInstance.payments.refund(order.paymentResult.id, {
        amount: Math.round(order.totalPrice * 100), // convert to paise
        notes: {
          reason: "Order Cancelled by User/Admin",
          orderId: order._id.toString(),
        },
      });

      console.log(`✅ Refund processed successfully for order ${order._id}`);
      order.refundStatus = "Processed"; // Track refund state
    } catch (error) {
      console.error("Razorpay Refund Error:", error);
      res.status(500);
      throw new Error("Refund failed to process at payment gateway");
    }
  }

  // 2. Restore the Product Stock safely
  for (const item of order.orderItems) {
    await Product.findByIdAndUpdate(item.product, {
      $inc: { countInStock: item.qty },
    });
  }

  // 3. Update Order Status
  order.orderStatus = "Cancelled";

  const updatedOrder = await order.save();

  // 4. (Optional) Socket notification goes here if configured
  if (req.io) {
    req.io.to(order._id.toString()).emit("orderUpdated", updatedOrder);
  }

  res.json(updatedOrder);
});
