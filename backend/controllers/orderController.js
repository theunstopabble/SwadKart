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
import sendEmail from "../utils/sendEmail.js";
import {
  getOrderConfirmationTemplate,
  getAdminOrderAlertTemplate,
  getRestaurantOrderAlertTemplate,
} from "../utils/emailTemplates.js";
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
    couponDiscount,
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

    // BUG-03 FIX: Server-side restaurant open/close validation
    const restaurantDoc =
      await Restaurant.findById(firstRestaurantId).session(session);
    if (
      restaurantDoc &&
      restaurantDoc.openingTime &&
      restaurantDoc.closingTime
    ) {
      const IST_OFFSET = 330;
      const now = new Date();
      const utcMinutes = now.getUTCHours() * 60 + now.getUTCMinutes();
      const currentMinutes = (utcMinutes + IST_OFFSET) % (24 * 60);
      const [openH, openM] = restaurantDoc.openingTime.split(":").map(Number);
      const [closeH, closeM] = restaurantDoc.closingTime.split(":").map(Number);
      const startMinutes = openH * 60 + openM;
      const endMinutes = closeH * 60 + closeM;
      const isOpen =
        endMinutes > startMinutes
          ? currentMinutes >= startMinutes && currentMinutes <= endMinutes
          : currentMinutes >= startMinutes || currentMinutes <= endMinutes;
      if (!isOpen)
        throw new Error(
          `${restaurantDoc.name} is currently closed. Please order during opening hours.`,
        );
    }

    // 💳 WALLET SYSTEM (STEP 2): Check and deduct balance
    let orderIsPaid = false;
    let orderPaidAt = null;

    // 1. Fetch all products ONCE and validate stock
    const dbProducts = [];
    for (const item of orderItems) {
      const product = await Product.findById(item.product).session(session);
      if (!product) throw new Error(`Product not found: ${item.name}`);
      if (product.countInStock < item.qty) {
        throw new Error(
          `Out of stock: ${product.name}. Only ${product.countInStock} left.`,
        );
      }
      dbProducts.push(product);
    }

    // Decrement stock atomically
    // BUG-06 FIX: Atomic stock decrement with floor guard — prevents negative stock
    for (const item of orderItems) {
      const updated = await Product.findOneAndUpdate(
        { _id: item.product, countInStock: { $gte: item.qty } },
        { $inc: { countInStock: -item.qty } },
        { session, new: true },
      );
      if (!updated) {
        const product = dbProducts.find(
          (p) => p._id.toString() === item.product.toString(),
        );
        throw new Error(
          `"${product?.name || "A product"}" just went out of stock. Please update your cart.`,
        );
      }
    }

    // SERVER-SIDE PRICE RECALCULATION (never trust frontend prices)
    const serverItemsPrice = orderItems.reduce((acc, item) => {
      const dbProduct = dbProducts.find(
        (p) => p._id.toString() === item.product.toString(),
      );
      if (!dbProduct) return acc;

      let itemTotal = dbProduct.price;

      // 🛡️ Map Variant
      if (item.selectedVariant && item.selectedVariant.name) {
        const dbVariant = dbProduct.variants.find(
          (v) => v.name === item.selectedVariant.name,
        );
        if (dbVariant) {
          itemTotal = dbVariant.price;
          item.selectedVariant.price = dbVariant.price; // Sync DB truth
        }
      }

      // 🛡️ Map Addons
      if (item.selectedAddons && Array.isArray(item.selectedAddons)) {
        item.selectedAddons = item.selectedAddons.map((addon) => {
          const dbAddon = dbProduct.addons.find((a) => a.name === addon.name);
          if (dbAddon) {
            itemTotal += dbAddon.price;
            return { name: dbAddon.name, price: dbAddon.price };
          }
          return addon;
        });
      }

      // Overwrite base item price with calculated secure total
      item.price = itemTotal;

      return acc + itemTotal * item.qty;
    }, 0);

    // 0. 🎟️ STRICT COUPON VALIDATION & MATH BEFORE ORDER PROCESSING
    let serverCouponDiscount = 0;
    if (couponCode) {
      const coupon = await Coupon.findOne({
        code: couponCode.toUpperCase(),
      }).session(session);

      if (!coupon) throw new Error("Invalid Coupon Code");
      if (!coupon.isActive) throw new Error("Coupon is no longer active");
      if (new Date() > new Date(coupon.expirationDate))
        throw new Error("Coupon has expired");
      if (serverItemsPrice < coupon.minOrderValue)
        // Validate against SERVER price
        throw new Error(
          `Minimum order for this coupon is ₹${coupon.minOrderValue}`,
        );

      const alreadyUsed = await CouponUsage.findOne({
        user: req.user._id,
        coupon: coupon._id,
      }).session(session);
      if (alreadyUsed) throw new Error("Coupon already used by this account");

      // SECURE CALCULATION: Recalculate discount entirely on the backend
      serverCouponDiscount =
        (serverItemsPrice * coupon.discountPercentage) / 100;
      if (
        coupon.maxDiscountAmount > 0 &&
        serverCouponDiscount > coupon.maxDiscountAmount
      ) {
        serverCouponDiscount = coupon.maxDiscountAmount;
      }
      serverCouponDiscount = Number(serverCouponDiscount.toFixed(2));
    }

    const serverShippingPrice = serverItemsPrice > 500 ? 0 : 40;
    const serverTaxPrice = parseFloat((0.05 * serverItemsPrice).toFixed(2));
    const serverTotalPrice = parseFloat(
      Math.max(
        0,
        serverItemsPrice +
          serverShippingPrice +
          serverTaxPrice -
          serverCouponDiscount, // Use SERVER calculated discount
      ).toFixed(2),
    );

    // Remove the old serverShippingPrice logic here since it's now integrated above

    // WALLET: Now deduct using serverTotalPrice (not frontend totalPrice)
    if (paymentMethod === "Wallet") {
      // BUG-01 FIX: Atomic wallet deduction using findOneAndUpdate to prevent race condition
      const buyer = await User.findOneAndUpdate(
        { _id: req.user._id, walletBalance: { $gte: serverTotalPrice } },
        {
          $inc: { walletBalance: -serverTotalPrice },
          $push: {
            walletTransactions: {
              amount: serverTotalPrice,
              type: "Debit",
              description: "Payment for Order",
              date: Date.now(),
            },
          },
        },
        { new: true, session },
      );
      if (!buyer) throw new Error("Insufficient Wallet Balance.");
      orderIsPaid = true;
      orderPaidAt = Date.now();
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
      itemsPrice: serverItemsPrice,
      taxPrice: serverTaxPrice,
      shippingPrice: serverShippingPrice,
      totalPrice: serverTotalPrice,
      couponCode,
      couponDiscount: serverCouponDiscount, // 👈 Strict mathematical calculation used here
      isPaid: orderIsPaid, // 👈 Set from wallet logic
      paidAt: orderPaidAt, // 👈 Set from wallet logic
    });

    // 3. Save order using the same transaction session
    const createdOrder = await order.save({ session });

    // 4. Create CouponUsage record to prevent reuse
    // BUG-08 FIX: For Online payment, coupon usage is recorded only after payment is verified
    if (couponCode && paymentMethod !== "Online") {
      const coupon = await Coupon.findOne({
        code: couponCode.toUpperCase(),
      }).session(session);
      if (coupon) {
        await CouponUsage.create(
          [{ user: req.user._id, coupon: coupon._id, order: createdOrder._id }],
          { session },
        );
      }
    }

    // 5. Commit the transaction if everything is successful
    await session.commitTransaction();
    session.endSession();

    // 6. NON-BLOCKING: Email & Socket notifications for COD/Wallet orders
    // Online orders get notified inside paymentController.verifyPayment instead
    if (paymentMethod !== "Online") {
      try {
        // Populate user data for email template
        const populatedOrder = await Order.findById(createdOrder._id)
          .populate("user", "name email")
          .lean();

        if (populatedOrder) {
          // 📧 Customer: Order Confirmation
          sendEmail({
            email: populatedOrder.user.email,
            subject: `SwadKart: Order Confirmed! ✅ #${createdOrder._id.toString().slice(-6).toUpperCase()}`,
            html: getOrderConfirmationTemplate(
              populatedOrder,
              paymentMethod === "Wallet",
            ),
          });

          // 📧 Admin: New Order Alert
          User.findOne({ role: "admin" }).then((admin) => {
            if (admin) {
              sendEmail({
                email: admin.email,
                subject: `🔔 New ${paymentMethod} Order #${createdOrder._id.toString().slice(-6).toUpperCase()}`,
                html: getAdminOrderAlertTemplate(populatedOrder),
              });
            }
          });

          // 📧 Restaurant: Kitchen Alert
          const restaurantId = createdOrder.orderItems[0]?.restaurant;
          if (restaurantId) {
            Restaurant.findById(restaurantId)
              .populate("owner")
              .then((restro) => {
                if (restro?.owner?.email && !restro.owner.email.includes("@dummy")) {
                  sendEmail({
                    email: restro.owner.email,
                    subject: `🔔 New Order for ${restro.name}`,
                    html: getRestaurantOrderAlertTemplate(populatedOrder, restro.name),
                  });
                }
                // 🔔 Socket: Real-time notification to restaurant dashboard
                if (req.io && restro?.owner) {
                  req.io
                    .to(restro.owner._id.toString())
                    .emit("newOrderReceived", populatedOrder);
                }
              });
          }
        }
      } catch (emailErr) {
        // Non-blocking: log but don't fail the order
        console.error("📧 Post-order notification error (non-blocking):", emailErr.message);
      }
    }

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
    // NEW-05 FIX: Use _id instead of .id since .lean() strips Mongoose virtuals
    const isAssignedDriver =
      order.deliveryPartner &&
      order.deliveryPartner._id?.toString() === req.user._id.toString();

    if (!isOwner && !isAdmin && !isRestaurantOwner && !isAssignedDriver) {
      return res
        .status(403)
        .json({ message: "Not authorized to view this order" });
    }

    // 🛡️ SECURITY FIX: Completely remove OTP if the user is a delivery partner
    // BUG-04 FIX: Also strip OTP from restaurant owner view
    if (
      req.user &&
      (req.user.role === "delivery_partner" ||
        req.user.role === "restaurant_owner")
    ) {
      delete order.deliveryOTP;
    }
    res.json(order);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ==========================================
// 🚚 4. UPDATE ORDER TO DELIVERED (DEPRECATED - use deliveryController.js with OTP)
// ==========================================

// ==========================================
export const updateOrderToPaid = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    // BUG-09 FIX: Idempotency check — do not overwrite already-paid orders
    if (order.isPaid) {
      return res
        .status(400)
        .json({ message: "Order is already marked as paid." });
    }

    // 🛡️ SECURITY FIX (SEC-2/BUG-1): Only the order owner or admin can mark as paid
    const isOwner = order.user.toString() === req.user._id.toString();
    const isAdmin = req.user.role === "admin";
    if (!isOwner && !isAdmin) {
      return res
        .status(403)
        .json({ message: "Not authorized to update this order" });
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
      req.io.to(updatedOrder._id.toString()).emit("orderUpdated", updatedOrder);
    }

    res.json(updatedOrder);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ==========================================
// 🚚 4. UPDATE ORDER TO DELIVERED (DEPRECATED - use deliveryController.js with OTP)
// ==========================================

// ==========================================
// 🛠️ 5. UPDATE ORDER STATUS (Generic with Auto-Assign)
// ==========================================
export const updateOrderStatus = async (req, res) => {
  // NEW-02 FIX: Only admin or restaurant owner can update order status
  const isAdmin = req.user.role === "admin";
  const isRestaurantOwner = req.user.role === "restaurant_owner";
  if (!isAdmin && !isRestaurantOwner) {
    return res
      .status(403)
      .json({ message: "Not authorized to update order status." });
  }

  const { status } = req.body;
  try {
    // NEW-03 FIX: Block 'Delivered' status via this route — use deliveryController OTP flow instead
    if (status === "Delivered") {
      return res.status(400).json({
        message:
          "Use the OTP delivery verification endpoint to mark orders as Delivered.",
      });
    }

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
          console.log(
            `🛵 Auto-Assigned Order to Partner: ${nearestPartner.name}`,
          );
        } else {
          console.log("⚠️ No delivery partner found within 5KM.");
        }
      }
    }

    const updatedOrder = await order.save();

    // Only mark partner unavailable after order is successfully saved
    if (status === "Ready" && updatedOrder.deliveryPartner) {
      const nearestPartner = await User.findById(updatedOrder.deliveryPartner);
      if (nearestPartner) {
        nearestPartner.isAvailable = false;
        await nearestPartner.save();
      }
    }

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
    // BUG-11 FIX: Add pagination to getMyOrders
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const count = await Order.countDocuments({ user: req.user._id });

    const orders = await Order.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();
    res.json({
      data: orders,
      metadata: { total: count, page, pages: Math.ceil(count / limit) },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ==========================================
// 👨‍🍳 7. RESTAURANT OWNER ORDERS (FIXED)
// ==========================================
export const getMyRestaurantOrders = async (req, res) => {
  try {
    // 1. Find the restaurant owned by this user
    const restaurant = await Restaurant.findOne({ owner: req.user._id });

    if (!restaurant) {
      return res
        .status(404)
        .json({ message: "No restaurant profile found. Please create one." });
    }

    // 2. Find orders that contain items from this restaurant
    const orders = await Order.find({
      "orderItems.restaurant": restaurant._id,
    })
      .populate("user", "name email")
      .populate("deliveryPartner", "name phone")
      .sort({ createdAt: -1 });

    // BUG-04 FIX: Strip deliveryOTP from restaurant owner's view
    const securedOrders = orders.map((order) => {
      const obj = order.toObject ? order.toObject() : order;
      delete obj.deliveryOTP;
      return obj;
    });

    res.json(securedOrders);
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
      .populate("deliveryPartner", "name phone")
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
    let matchQuery = { isPaid: true, orderStatus: { $ne: "Cancelled" } };

    if (req.user.role === "restaurant_owner") {
      const restaurantDoc = await Restaurant.findOne({ owner: req.user._id });
      if (!restaurantDoc)
        return res.status(404).json({ message: "Restaurant not found." });
      matchQuery["orderItems.restaurant"] = restaurantDoc._id;
    }

    const stats = await Order.aggregate([
      { $match: matchQuery },
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

  // BUG-02 FIX: Prevent cancellation of delivered orders
  if (order.orderStatus === "Delivered") {
    res.status(400);
    throw new Error("Delivered orders cannot be cancelled.");
  }

  // Also block cancellation for orders that are Out for Delivery
  if (order.orderStatus === "Out for Delivery") {
    res.status(400);
    throw new Error(
      "Order is already out for delivery. Contact support to cancel.",
    );
  }

  // 🛡️ BUG-9 FIX: Use MongoDB transaction for atomic cancel + refund + stock restore
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // 1. 💳 WALLET REFUND SYSTEM: Refund to Wallet instead of Payment Gateway
    // NEW-04 FIX: Atomic wallet refund using $inc to prevent race condition on credit
    if (
      order.isPaid === true &&
      (order.paymentMethod === "Online" || order.paymentMethod === "Wallet")
    ) {
      const refundedBuyer = await User.findByIdAndUpdate(
        order.user,
        {
          $inc: { walletBalance: order.totalPrice },
          $push: {
            walletTransactions: {
              amount: order.totalPrice,
              type: "Credit",
              description: `Refund for Cancelled Order ${order.id}`,
              date: Date.now(),
            },
          },
        },
        { new: true, session },
      );
      if (!refundedBuyer) throw new Error("User not found for refund.");
      order.refundStatus = "Processed";
      console.log(`Wallet Refund Processed: ${order.totalPrice} credited`);
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

    // BUG-12 FIX: Free up delivery partner when order is cancelled
    if (order.deliveryPartner) {
      await User.findByIdAndUpdate(
        order.deliveryPartner,
        { $set: { isAvailable: true } },
        { session },
      );
    }

    // 4. Update Order Status
    order.orderStatus = "Cancelled";
    order.cancelledAt = Date.now();
    const updatedOrder = await order.save({ session });

    // 5. Commit transaction
    await session.commitTransaction();
    session.endSession();

    // 6. Socket notification (outside transaction)
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
