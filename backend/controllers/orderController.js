import Order from "../models/orderModel.js";
import Product from "../models/productModel.js";
import Restaurant from "../models/restaurantModel.js";
import User from "../models/userModel.js"; // 👈 YEH LINE ADD KAREIN
import Coupon from "../models/couponModel.js";
import CouponUsage from "../models/couponUsageModel.js";
import mongoose from "mongoose";
import asyncHandler from "express-async-handler";
import Razorpay from "razorpay";
import { sendPush } from "../utils/pushNotification.js";
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
    const user = await User.findById(req.user._id).session(session);

    // 💳 WALLET SYSTEM (STEP 2): Check and deduct balance
    let orderIsPaid = false;
    let orderPaidAt = null;

    // 0. 🎟️ STRICT COUPON VALIDATION BEFORE ORDER PROCESSING
    if (couponCode) {
      const coupon = await Coupon.findOne({ code: couponCode.toUpperCase() }).session(session);
      if (!coupon) throw new Error("Invalid Coupon Code");
      if (!coupon.isActive) throw new Error("Coupon is no longer active");
      if (new Date() > new Date(coupon.expirationDate)) throw new Error("Coupon has expired");
      if (itemsPrice < coupon.minOrderValue) throw new Error(`Minimum order for this coupon is ₹${coupon.minOrderValue}`);

      const alreadyUsed = await CouponUsage.findOne({ user: req.user._id, coupon: coupon._id }).session(session);
      if (alreadyUsed) throw new Error("Coupon already used by this account");
    }

    if (paymentMethod === "Wallet") {
      if (user.walletBalance < totalPrice) {
        throw new Error(
          `Insufficient Wallet Balance. You only have ₹${user.walletBalance}.`,
        );
      }

      // Deduct balance and record transaction
      user.walletBalance -= totalPrice;
      user.walletTransactions.push({
        amount: totalPrice,
        type: "Debit",
        description: "Payment for Order",
        date: Date.now(),
      });
      await user.save({ session }); // Save user strictly inside transaction

      orderIsPaid = true;
      orderPaidAt = Date.now();
    }

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
      isPaid: orderIsPaid, // 👈 Set from wallet logic
      paidAt: orderPaidAt, // 👈 Set from wallet logic
    });

    // 3. Save order using the same transaction session
    const createdOrder = await order.save({ session });

    // 4. Create CouponUsage record to prevent reuse
    if (couponCode) {
      const coupon = await Coupon.findOne({ code: couponCode.toUpperCase() }).session(session);
      if (coupon) {
        await CouponUsage.create([{
          user: req.user._id,
          coupon: coupon._id,
          order: createdOrder._id,
        }], { session });
      }
    }

    // 5. Commit the transaction if everything is successful
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
    const order = await Order.findById(req.params.id)
      .populate("user", "name email")
      .populate("deliveryPartner", "name phone")
      .populate({
        path: "orderItems.product",
        select: "name image category",
      })
      .lean();

    if (!order) {
      return res.status(404).json({ message: "Order not found." });
    }

    // 🛡️ SECURITY FIX (SEC-2): Authorization check — only order owner, admin, restaurant owner, or assigned delivery partner can view
    const isOwner = order.user._id.toString() === req.user._id.toString();
    const isAdmin = req.user.role === "admin";
    const isRestaurantOwner = req.user.role === "restaurant_owner";
    const isAssignedDriver = order.deliveryPartner && order.deliveryPartner._id.toString() === req.user._id.toString();

    if (!isOwner && !isAdmin && !isRestaurantOwner && !isAssignedDriver) {
      return res.status(403).json({ message: "Not authorized to view this order" });
    }

    // 🛡️ SECURITY FIX: Completely remove OTP if the user is a delivery partner
    if (req.user && req.user.role === "delivery_partner") {
      delete order.deliveryOTP;
    }
    res.json(order);
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

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    // 🛡️ SECURITY FIX (SEC-2/BUG-1): Only the order owner or admin can mark as paid
    const isOwner = order.user.toString() === req.user._id.toString();
    const isAdmin = req.user.role === "admin";
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: "Not authorized to update this order" });
    }

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
// 🛠️ 5. UPDATE ORDER STATUS (Generic with Auto-Assign)
// ==========================================
export const updateOrderStatus = async (req, res) => {
  const { status } = req.body;
  try {
    const order = await Order.findById(req.params.id).populate(
      "user",
      "fcmToken _id",
    );
    if (!order) return res.status(404).json({ message: "Order not found" });

    order.orderStatus = status;

    if (status === "Delivered") {
      order.isDelivered = true;
      order.deliveredAt = Date.now();
      if (order.paymentMethod === "COD") {
        order.isPaid = true;
        order.paidAt = Date.now();
      }

      // Free up the delivery partner
      if (order.deliveryPartner) {
        await User.findByIdAndUpdate(order.deliveryPartner, {
          isAvailable: true,
        });
      }
    }

    // 🛰️ GEOSPATIAL AI: Auto-Assign Nearest Delivery Partner
    if (
      status === "Ready" &&
      !order.deliveryPartner &&
      order.orderItems.length > 0
    ) {
      const restaurant = await Restaurant.findById(
        order.orderItems[0].restaurant,
      );

      if (
        restaurant &&
        restaurant.location &&
        restaurant.location.coordinates
      ) {
        // Query nearest partner within 5 KM radius using GeoJSON
        const nearestPartner = await User.findOne({
          role: "delivery_partner",
          isAvailable: true,
          currentLocation: {
            $nearSphere: {
              $geometry: {
                type: "Point",
                coordinates: restaurant.location.coordinates, // [longitude, latitude]
              },
              $maxDistance: 5000, // 5000 meters = 5 KM
            },
          },
        });

        if (nearestPartner) {
          order.deliveryPartner = nearestPartner._id;
          // Mark partner as busy
          nearestPartner.isAvailable = false;
          await nearestPartner.save();
          console.log(
            `🛵 Auto-Assigned Order to Partner: ${nearestPartner.name}`,
          );
        } else {
          console.log("⚠️ No delivery partner found within 5KM.");
        }
      }
    }

    const updatedOrder = await order.save();

    // 🔔 Notify via Firebase Cloud Messaging
    if (order.user && order.user.fcmToken) {
      await sendPush(
        order.user.fcmToken,
        "Order Update 📦",
        `Your order status is now: ${status}`,
        { orderId: order._id.toString(), status },
      );
    }

    // 🔔 Notify User & Delivery Partner via Socket.io
    if (req.io) {
      req.io.to(order.user._id.toString()).emit("orderUpdated", updatedOrder);

      // Tell specifically assigned partner securely
      if (status === "Ready" && updatedOrder.deliveryPartner) {
        req.io
          .to(updatedOrder.deliveryPartner.toString())
          .emit("orderAssigned", updatedOrder);
      } else if (status === "Ready") {
        // Fallback: Notify all if no one was assigned via AI
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
// ❌ CANCEL ORDER & WALLET REFUND LOGIC
// ==========================================
export const cancelOrder = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);

  if (!order) {
    res.status(404);
    throw new Error("Order not found");
  }

  // 🛡️ SECURITY FIX (SEC-2/BUG-2): Only order owner or admin can cancel
  const isOwner = order.user.toString() === req.user._id.toString();
  const isAdmin = req.user.role === "admin";
  if (!isOwner && !isAdmin) {
    res.status(403);
    throw new Error("Not authorized to cancel this order");
  }

  if (order.orderStatus === "Cancelled") {
    res.status(400);
    throw new Error("Order is already cancelled");
  }

  // 🛡️ BUG-9 FIX: Use MongoDB transaction for atomic cancel + refund + stock restore
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // 1. 💳 WALLET REFUND SYSTEM: Refund to Wallet instead of Payment Gateway
    if (
      order.isPaid === true &&
      (order.paymentMethod === "Online" || order.paymentMethod === "Wallet")
    ) {
      const buyer = await User.findById(order.user).session(session);
      if (buyer) {
        buyer.walletBalance += order.totalPrice;
        buyer.walletTransactions.push({
          amount: order.totalPrice,
          type: "Credit",
          description: `Refund for Cancelled Order #${order._id}`,
          date: Date.now(),
        });
        await buyer.save({ session });

        order.refundStatus = "Processed";
        console.log(
          `✅ Wallet Refund Processed: ₹${order.totalPrice} credited to ${buyer.name}`,
        );
      }
    }

    // 2. Restore the Product Stock safely (within transaction)
    for (const item of order.orderItems) {
      await Product.findByIdAndUpdate(
        item.product,
        { $inc: { countInStock: item.qty } },
        { session },
      );
    }

    // 3. Free up exactly the coupon used in this cancelled order
    if (order.couponCode) {
      await CouponUsage.deleteMany({ order: order._id }).session(session);
    }

    // 4. Update Order Status
    order.orderStatus = "Cancelled";
    order.cancelledAt = Date.now();
    const updatedOrder = await order.save({ session });

    // 4. Commit transaction
    await session.commitTransaction();
    session.endSession();

    // 5. Socket notification (outside transaction)
    if (req.io) {
      req.io.to(order.user.toString()).emit("orderUpdated", updatedOrder);
    }

    res.json(updatedOrder);
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    res.status(500);
    throw new Error(error.message);
  }
});
