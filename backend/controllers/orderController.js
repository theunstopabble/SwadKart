import Order from "../models/orderModel.js";
import Product from "../models/productModel.js";
import Restaurant from "../models/restaurantModel.js";
import User from "../models/userModel.js";
import Coupon from "../models/couponModel.js";
import CouponUsage from "../models/couponUsageModel.js";
import mongoose from "mongoose";
import asyncHandler from "express-async-handler";
import { sanitizeObjectId } from "../utils/sanitize.js";
import crypto from "crypto";
import { getRazorpayInstance } from "./paymentController.js";
import { sendPush } from "../utils/pushNotification.js";
import sendEmail from "../utils/sendEmail.js";
import {
  getOrderConfirmationTemplate,
  getAdminOrderAlertTemplate,
  getRestaurantOrderAlertTemplate,
  getOrderCancelledTemplate,
} from "../utils/emailTemplates.js";
import getAdminEmail from "../utils/getAdminEmail.js";
import { awardCoinsToUser } from "./loyaltyController.js";
import { createNotification } from "./notificationController.js";
import { calculateOrderETA, recalculateETA } from "./etaController.js";
import { calculateSurgeMultiplier } from "./surgePricingController.js";
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
    tipAmount,
  } = req.body;

  if (orderItems && orderItems.length === 0) {
    res.status(400);
    throw new Error("No order items found");
  }

  if (orderItems.some(item => item.qty <= 0 || !Number.isInteger(item.qty))) {
    res.status(400);
    throw new Error("Invalid item quantity");
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

    // 1. Fetch all products ONCE and validate stock & availability
    const dbProducts = [];
    for (const item of orderItems) {
      const product = await Product.findById(item.product).session(session);
      if (!product) throw new Error(`Product not found: ${item.name}`);
      if (product.isAvailable === false) {
        throw new Error(
          `${product.name} is currently unavailable.`,
        );
      }
      if (product.countInStock < item.qty) {
        throw new Error(
          `Out of stock: ${product.name}. Only ${product.countInStock} left.`,
        );
      }

      // ⏰ FEAT-7: Availability Schedule Check
      if (product.scheduleEnabled === true && product.schedule?.days?.length > 0) {
        const now = new Date();
        const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
        const today = dayNames[now.getDay()];
        if (!product.schedule.days.includes(today)) {
          throw new Error(`${product.name} is not available today.`);
        }
        const currentMinutes = now.getHours() * 60 + now.getMinutes();
        const [startH, startM] = (product.schedule.startTime || "00:00").split(":").map(Number);
        const [endH, endM] = (product.schedule.endTime || "23:59").split(":").map(Number);
        const startMinutes = startH * 60 + startM;
        const endMinutes = endH * 60 + endM;
        if (currentMinutes < startMinutes || currentMinutes > endMinutes) {
          throw new Error(
            `${product.name} is only available from ${product.schedule.startTime} to ${product.schedule.endTime}.`,
          );
        }
      }

      dbProducts.push(product);
    }

    // Decrement stock atomically
    // BUG-06 FIX: Atomic stock decrement with floor guard — prevents negative stock
    const stockUpdatedProducts = [];
    for (const item of orderItems) {
      const updated = await Product.findOneAndUpdate(
        { _id: item.product, countInStock: { $gte: item.qty } },
        { $inc: { countInStock: -item.qty } },
        { session, returnDocument: "after" },
      );
      if (!updated) {
        const product = dbProducts.find(
          (p) => p._id.toString() === item.product.toString(),
        );
        throw new Error(
          `"${product?.name || "A product"}" just went out of stock. Please update your cart.`,
        );
      }
      // 📦 FEAT-14: Smart Inventory Auto-Disable
      if (updated.countInStock === 0 && updated.autoDisable === true) {
        updated.isAvailable = false;
        await Product.findByIdAndUpdate(
          item.product,
          { isAvailable: false },
          { session },
        );
      }
      stockUpdatedProducts.push(updated);
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

    // 🎟️ SWADPASS FREE DELIVERY (FEAT-3)
    const hasSwadPass = req.user.hasSwadPass && req.user.swadPassExpiry && new Date(req.user.swadPassExpiry) > new Date();

    let baseShippingPrice = serverItemsPrice > 500 ? 0 : 40;
    if (hasSwadPass) baseShippingPrice = 0;
    const { multiplier: surgeMultiplier } = await calculateSurgeMultiplier();
    let serverDeliveryFee = baseShippingPrice;
    if (surgeMultiplier > 1 && baseShippingPrice > 0) {
      serverDeliveryFee = parseFloat((baseShippingPrice * surgeMultiplier).toFixed(2));
    }
    const serverSurgePrice = baseShippingPrice > 0 ? parseFloat((baseShippingPrice * (surgeMultiplier - 1)).toFixed(2)) : 0;
    // 💼 RESTAURANT COMMISSION (FEAT-2) — 15% standard
    const commissionRate = 0.15;
    const netItemsValue = Math.max(0, serverItemsPrice - serverCouponDiscount);
    const serverCommission = parseFloat((netItemsValue * commissionRate).toFixed(2));
    const serverRestaurantPayout = parseFloat((netItemsValue - serverCommission).toFixed(2));

    // 🛡️ SECURITY: Recalculate tax server-side — never trust frontend
    const serverTaxPrice = Number((serverItemsPrice * 0.05).toFixed(2));
    // Validate tip: cap at ₹500 max, floor at 0
    const serverTipAmount = Math.min(Math.max(0, Number(tipAmount) || 0), 500);

    // 🛡️ CRITICAL FIX: serverDeliveryFee already includes base shipping + surge.
    // Do NOT add serverShippingPrice and serverSurgePrice again — that triple-charges delivery.
    const serverTotalPrice = parseFloat(
      Math.max(
        0,
        serverItemsPrice +
          serverTaxPrice +
          serverTipAmount +
          serverDeliveryFee -
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
        { returnDocument: "after", session },
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
      shippingPrice: serverDeliveryFee,
      totalPrice: serverTotalPrice,
      couponCode,
      couponDiscount: serverCouponDiscount,
      tipAmount: serverTipAmount,
      deliveryFee: serverDeliveryFee,
      surgePrice: serverSurgePrice,
      restaurantCommission: serverCommission,
      restaurantPayout: serverRestaurantPayout,
      payoutStatus: "pending",
      isPaid: orderIsPaid,
      paidAt: orderPaidAt,
      orderStatus: paymentMethod === "Online" ? "Payment Pending" : "Placed",
      expiresAt: paymentMethod === "Online" ? new Date(Date.now() + 30 * 60 * 1000) : null,
    });

    // ⏰ FEAT-12: Calculate estimated delivery time
    const { estimatedDeliveryAt, estimatedMinutes } = calculateOrderETA(order);
    order.estimatedDeliveryAt = estimatedDeliveryAt;
    order.etaUpdates.push({ estimatedMinutes, reason: "order_placed" });

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

    // 6. NON-BLOCKING: SwadCoins Loyalty Award (1 coin per ₹10 spent)
    try {
      const earnedCoins = Math.floor(serverItemsPrice / 10);
      if (earnedCoins > 0) {
        await awardCoinsToUser(
          req.user._id,
          earnedCoins,
          "Earn",
          `Earned ${earnedCoins} SwadCoins for order #${createdOrder._id.toString().slice(-6).toUpperCase()}`,
          createdOrder._id,
        );
      }
      // First order bonus
      const orderCount = await Order.countDocuments({ user: req.user._id });
      if (orderCount === 1) {
        await awardCoinsToUser(
          req.user._id,
          500,
          "Bonus",
          "🎉 First Order Bonus: 500 SwadCoins",
          createdOrder._id,
        );
      }
    } catch (coinErr) {
      console.error("🪙 Loyalty award error (non-blocking):", coinErr.message);
    }

    // 7. NON-BLOCKING: Email & Socket notifications for COD/Wallet orders
    // Online orders get notified inside paymentController.verifyPayment instead
    if (paymentMethod !== "Online") {
      const populatedOrder = await Order.findById(createdOrder._id)
        .populate("user", "name email")
        .lean();

      if (populatedOrder && populatedOrder.user && populatedOrder.user.email) {
        // 📧 Customer: Order Confirmation
        try {
          await sendEmail({
            email: populatedOrder.user.email,
            subject: `SwadKart: Order Confirmed! #${createdOrder._id.toString().slice(-6).toUpperCase()}`,
            html: getOrderConfirmationTemplate(
              populatedOrder,
              paymentMethod === "Wallet",
            ),
          });
        } catch (emailErr) {
          console.error("📧 Customer confirmation email failed:", emailErr.message);
        }

        // 📧 Admin: New Order Alert
        try {
          const adminEmail = await getAdminEmail();
          if (adminEmail) {
            await sendEmail({
              email: adminEmail,
              subject: `New ${paymentMethod} Order #${createdOrder._id.toString().slice(-6).toUpperCase()}`,
              html: getAdminOrderAlertTemplate(populatedOrder),
            });
          }
        } catch (emailErr) {
          console.error("📧 Admin alert email failed:", emailErr.message);
        }

        // 📧 Restaurant: Kitchen Alert
        const restaurantId = createdOrder.orderItems[0]?.restaurant;
        if (restaurantId) {
          try {
            const restro = await Restaurant.findById(restaurantId).populate("owner");
            if (restro?.owner?.email && !restro.owner.email.includes("@dummy")) {
              await sendEmail({
                email: restro.owner.email,
                subject: `New Order for ${restro.name}`,
                html: getRestaurantOrderAlertTemplate(populatedOrder, restro.name),
              });
            }
          } catch (emailErr) {
            console.error("📧 Restaurant alert email failed:", emailErr.message);
          }

          // 🔔 Socket: Real-time notification to restaurant dashboard
          if (req.io && restro?.owner) {
            req.io
              .to(restro.owner._id.toString())
              .emit("newOrderReceived", populatedOrder);
          }

          // 🔥 FEAT-20: Push Notifications (non-blocking)
          try {
            await createNotification(
              req.user._id,
              "Order Confirmed",
              `Your order #${createdOrder._id.toString().slice(-6).toUpperCase()} is confirmed!`,
              "order",
              { orderId: createdOrder._id.toString(), totalPrice: createdOrder.totalPrice },
            );
            if (restro?.owner?._id) {
              await createNotification(
                restro.owner._id,
                "New Order Received",
                `New order worth ₹${createdOrder.totalPrice} from ${populatedOrder.user?.name || "a customer"}`,
                "order",
                { orderId: createdOrder._id.toString(), totalPrice: createdOrder.totalPrice },
              );
            }
          } catch (notifErr) {
            console.error("🔔 Push notification error (non-blocking):", notifErr.message);
          }
        }
      }
    }

    // 🔔 Socket: Real-time stock updates to all viewers
    if (req.io && stockUpdatedProducts.length > 0) {
      for (const prod of stockUpdatedProducts) {
        req.io.emit("productUpdated", prod);
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
      .populate("orderItems.restaurant", "name")
      .lean();

    if (!order) {
      return res.status(404).json({ message: "Order not found." });
    }

    // 🛡️ SECURITY FIX (SEC-2): Authorization check — only order owner, admin, restaurant owner, or assigned delivery partner can view
    const isAdmin = req.user.role === "admin";
    const isOwner = order.user && order.user._id?.toString() === req.user._id.toString();

    // NEW-05 FIX: Use _id instead of .id since .lean() strips Mongoose virtuals
    const isAssignedDriver =
      order.deliveryPartner &&
      order.deliveryPartner._id?.toString() === req.user._id.toString();

    // BUG-OWNER FIX: Restaurant owner can ONLY view orders from THEIR restaurant
    let isRestaurantOwner = false;
    if (req.user.role === "restaurant_owner") {
      const restaurantDoc = await Restaurant.findOne({ owner: req.user._id }).lean();
      const orderRestaurantId = order.orderItems[0]?.restaurant?._id?.toString();
      if (restaurantDoc && orderRestaurantId === restaurantDoc._id.toString()) {
        isRestaurantOwner = true;
      }
    }

    if (!isOwner && !isAdmin && !isRestaurantOwner && !isAssignedDriver) {
      return res
        .status(403)
        .json({ message: "Not authorized to view this order" });
    }

    // Strip OTP from restaurant owner view only — delivery partner needs it
    if (req.user && req.user.role === "restaurant_owner") {
      delete order.deliveryOTP;
    }
    res.json(order);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ==========================================
// 📝 3. MARK ORDER AS PAID (Razorpay callback)
// ==========================================
export const updateOrderToPaid = async (req, res) => {
  try {
    const orderId = sanitizeObjectId(req.params.id);
    const order = await Order.findById(orderId);

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
    const isOwner = order.user ? order.user.toString() === req.user._id.toString() : false;
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
// 📝 4. UPDATE ORDER STATUS (Generic with Auto-Assign)
// ==========================================
// Valid status transitions map
const VALID_TRANSITIONS = {
  "Payment Pending": ["Placed", "Cancelled"],
  Placed: ["Preparing", "Cancelled"],
  Preparing: ["Ready", "Cancelled"],
  Ready: ["Out for Delivery"],
  "Out for Delivery": ["Delivered"],
  Delivered: [],
};

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
    const order = await Order.findById(req.params.id).populate(
      "user",
      "fcmToken _id phone",
    );
    if (!order) return res.status(404).json({ message: "Order not found" });

    // BUG-OWNER FIX: Restaurant owner can ONLY update orders from THEIR restaurant
    if (isRestaurantOwner && !isAdmin) {
      const restaurantDoc = await Restaurant.findOne({ owner: req.user._id }).lean();
      const orderRestaurantId = order.orderItems[0]?.restaurant?.toString();
      if (!restaurantDoc || orderRestaurantId !== restaurantDoc._id.toString()) {
        return res.status(403).json({ message: "Not authorized to update this order." });
      }
    }

    // 🛡️ BUG-TRANSITION FIX: Validate status transitions to prevent invalid jumps
    const currentStatus = order.orderStatus;
    if (!VALID_TRANSITIONS[currentStatus]?.includes(status)) {
      return res.status(400).json({
        message: `Invalid status transition: cannot move from "${currentStatus}" to "${status}".`,
      });
    }

    // NEW-03 FIX: Block 'Delivered' status via this route — use deliveryController OTP flow instead
    if (status === "Delivered") {
      return res.status(400).json({
        message:
          "Use the OTP delivery verification endpoint to mark orders as Delivered.",
      });
    }

    order.orderStatus = status;

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
        const nearestPartner = await User.findOneAndUpdate(
          {
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
          },
          { $set: { isAvailable: false } },
          { returnDocument: "after" },
        );

        if (nearestPartner) {
          order.deliveryPartner = nearestPartner._id;
          if (!order.deliveryOTP) {
            order.deliveryOTP = crypto.randomInt(1000, 10000);
          }
          console.log(
            `🛵 Auto-Assigned Order to Partner: ${nearestPartner.name}`,
          );
        } else {
          console.log("⚠️ No delivery partner found within 5KM.");
        }
      }

      // ⏰ FEAT-12: Recalculate ETA when order is Ready and partner assigned
      if (order.deliveryPartner) {
        try {
          const { estimatedDeliveryAt, estimatedMinutes, reason } = recalculateETA(order, "restaurant_ready");
          order.estimatedDeliveryAt = estimatedDeliveryAt;
          order.etaUpdates.push({ estimatedMinutes, reason });
        } catch (etaErr) {
          console.error("⚠️ ETA recalculation failed:", etaErr.message);
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
      // Strip OTP from customer-facing emit
      const safeOrder = updatedOrder.toObject();
      delete safeOrder.deliveryOTP;

      if (order.user && order.user._id) {
        req.io.to(order.user._id.toString()).emit("orderUpdated", safeOrder);
      }

      // Tell specifically assigned partner (with OTP — they need it)
      if (status === "Ready" && updatedOrder.deliveryPartner) {
        req.io
          .to(updatedOrder.deliveryPartner.toString())
          .emit("orderAssigned", updatedOrder);
      } else if (status === "Ready") {
        // Fallback: Notify all (without OTP)
        req.io.emit("newDeliveryTask", safeOrder);
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
      .populate("orderItems.restaurant", "name")
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
    const restaurant = await Restaurant.findOne({ owner: req.user._id }).lean();

    if (!restaurant) {
      return res
        .status(404)
        .json({ message: "No restaurant profile found. Please create one." });
    }

    // 2. Find orders that contain items from this restaurant
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const [orders, total] = await Promise.all([
      Order.find({ "orderItems.restaurant": restaurant._id, orderStatus: { $ne: "Payment Pending" } })
        .populate("user", "name email")
        .populate("deliveryPartner", "name phone")
        .populate("orderItems.restaurant", "name")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Order.countDocuments({ "orderItems.restaurant": restaurant._id }),
    ]);

    // BUG-04 FIX: Strip deliveryOTP from restaurant owner's view
    const securedOrders = orders.map((order) => {
      const { deliveryOTP, ...rest } = order;
      return rest;
    });

    res.json({ orders: securedOrders, page, pages: Math.ceil(total / limit), total });
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

    const orders = await Order.find({ orderStatus: { $ne: "Payment Pending" } })
      .populate("user", "id name email")
      .populate("deliveryPartner", "name phone")
      .populate("orderItems.restaurant", "name")
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
  const order = await Order.findById(sanitizeObjectId(req.params.id));

  if (!order) {
    res.status(404);
    throw new Error("Order not found");
  }

  // 🛡️ Only order owner, admin, or the restaurant owner can cancel
  const isOwner = order.user.toString() === req.user._id.toString();
  const isAdmin = req.user.role === "admin";
  let isRestaurantOwner = false;
  if (!isOwner && !isAdmin && req.user.role === "restaurant_owner") {
    const restaurantDoc = await Restaurant.findOne({ owner: req.user._id }).lean();
    const orderRestaurantId = order.orderItems[0]?.restaurant?.toString();
    isRestaurantOwner = !!(restaurantDoc && orderRestaurantId === restaurantDoc._id.toString());
  }
  if (!isOwner && !isAdmin && !isRestaurantOwner) {
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
      // 🛡️ SECURITY FIX: Initiate Razorpay refund for Online payments
      if (order.paymentMethod === "Online" && order.paymentResult?.id) {
        try {
          const instance = getRazorpayInstance();
          await instance.payments.refund(order.paymentResult.id, {
            amount: Math.round(order.totalPrice * 100),
          });
          console.log(`Razorpay Refund Initiated: ${order.totalPrice}`);
        } catch (rzpErr) {
          console.error("Razorpay refund failed:", rzpErr.message);
          throw new Error("Refund processing failed — cancellation aborted");
        }
      }

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
        { returnDocument: "after", session },
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

    // 🔔 Socket: Real-time stock restore to all viewers
    if (req.io) {
      for (const item of order.orderItems) {
        const restored = await Product.findById(item.product).select("name countInStock isAvailable image price").lean();
        if (restored) req.io.emit("productUpdated", restored);
      }
    }

    // 7. 📧 Send cancellation email (non-blocking)
    try {
      const user = await User.findById(order.user).lean();
      if (user?.email) {
        const cancelReason = req.body?.reason?.trim() || "Cancelled by request";
        await sendEmail({
          email: user.email,
          subject: `SwadKart: Order Cancelled #${updatedOrder._id.toString().slice(-6).toUpperCase()}`,
          html: getOrderCancelledTemplate(updatedOrder, cancelReason),
        });
      }
    } catch (emailErr) {
      console.error("📧 Cancellation email failed:", emailErr.message);
    }

    res.json(updatedOrder);
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    res.status(500);
    throw new Error(error.message);
  }
});

// ==========================================
// ❌ CANCEL PENDING ONLINE ORDER
// ==========================================
export const cancelPendingOrder = asyncHandler(async (req, res) => {
  const order = await Order.findById(sanitizeObjectId(req.params.id));

  if (!order) {
    res.status(404);
    throw new Error("Order not found");
  }

  const isOwner = order.user.toString() === req.user._id.toString();
  if (!isOwner) {
    res.status(403);
    throw new Error("Not authorized to cancel this order");
  }

  if (order.orderStatus !== "Payment Pending") {
    res.status(400);
    throw new Error("Only pending orders can be cancelled via this endpoint");
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    for (const item of order.orderItems) {
      await Product.findByIdAndUpdate(
        item.product,
        { $inc: { countInStock: item.qty } },
        { session },
      );
    }

    if (order.couponCode) {
      await CouponUsage.deleteMany({ order: order._id }).session(session);
    }

    await Order.findByIdAndDelete(order._id, { session });

    await session.commitTransaction();
    session.endSession();

    // 🔔 Socket: Real-time stock restore to all viewers
    if (req.io) {
      for (const item of order.orderItems) {
        const restored = await Product.findById(item.product).select("name countInStock isAvailable image price").lean();
        if (restored) req.io.emit("productUpdated", restored);
      }
    }

    res.json({ success: true, message: "Pending order cancelled successfully" });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    res.status(500);
    throw new Error(error.message);
  }
});
