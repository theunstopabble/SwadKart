import prisma from "../config/prisma.js";
import asyncHandler from "express-async-handler";
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
export const addOrderItems = asyncHandler(async (req, res) => {
  const {
    orderItems,
    shippingAddress,
    paymentMethod,
    couponCode,
    tipAmount,
  } = req.body;

  if (!orderItems || orderItems.length === 0) {
    res.status(400);
    throw new Error("No order items found");
  }

  if (orderItems.some((item) => item.qty <= 0 || !Number.isInteger(item.qty))) {
    res.status(400);
    throw new Error("Invalid item quantity");
  }

  const firstRestaurantId = orderItems[0].restaurant;
  const hasMultipleRestaurants = orderItems.some(
    (item) => String(item.restaurant) !== String(firstRestaurantId),
  );

  if (hasMultipleRestaurants) {
    res.status(400);
    throw new Error("Items must be from a single restaurant");
  }

  const userId = req.user.id || req.user._id;

  try {
    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({ where: { id: userId } });
      if (!user) throw new Error("User not found");

      const restaurantDoc = await tx.restaurant.findUnique({
        where: { id: firstRestaurantId },
      });

      if (restaurantDoc && restaurantDoc.openingTime && restaurantDoc.closingTime) {
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
        if (!isOpen) {
          throw new Error(
            `${restaurantDoc.name} is currently closed. Please order during opening hours.`,
          );
        }
      }

      const dbProducts = [];
      for (const item of orderItems) {
        const product = await tx.product.findUnique({ where: { id: item.product } });
        if (!product) throw new Error(`Product not found: ${item.name}`);
        if (!product.isAvailable) {
          throw new Error(`${product.name} is currently unavailable.`);
        }
        if (product.countInStock < item.qty) {
          throw new Error(
            `Out of stock: ${product.name}. Only ${product.countInStock} left.`,
          );
        }

        if (product.scheduleEnabled && product.schedule?.days?.length > 0) {
          const now = new Date();
          const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
          const today = dayNames[now.getDay()];
          if (!product.schedule.days.includes(today)) {
            throw new Error(`${product.name} is not available today.`);
          }
        }

        dbProducts.push(product);
      }

      // Decrement stock atomically
      for (const item of orderItems) {
        const updated = await tx.product.update({
          where: { id: item.product },
          data: {
            countInStock: { decrement: item.qty },
          },
        });

        if (updated.countInStock <= 0 && updated.autoDisable) {
          await tx.product.update({
            where: { id: item.product },
            data: { isAvailable: false },
          });
        }
      }

      // Server-side price calculation
      const serverItemsPrice = orderItems.reduce((acc, item) => {
        const dbProduct = dbProducts.find((p) => p.id === item.product);
        if (!dbProduct) return acc;

        let itemTotal = dbProduct.price;
        if (item.selectedVariant && item.selectedVariant.name) {
          const variants = Array.isArray(dbProduct.variants) ? dbProduct.variants : [];
          const dbVariant = variants.find((v) => v.name === item.selectedVariant.name);
          if (dbVariant) {
            itemTotal = dbVariant.price;
            item.selectedVariant.price = dbVariant.price;
          }
        }

        if (item.selectedAddons && Array.isArray(item.selectedAddons)) {
          const addons = Array.isArray(dbProduct.addons) ? dbProduct.addons : [];
          item.selectedAddons = item.selectedAddons.map((addon) => {
            const dbAddon = addons.find((a) => a.name === addon.name);
            if (dbAddon) {
              itemTotal += dbAddon.price;
              return { name: dbAddon.name, price: dbAddon.price };
            }
            return addon;
          });
        }

        item.price = itemTotal;
        return acc + itemTotal * item.qty;
      }, 0);

      // Coupon Validation
      let serverCouponDiscount = 0;
      let validCoupon = null;
      if (couponCode) {
        validCoupon = await tx.coupon.findUnique({
          where: { code: couponCode.toUpperCase() },
        });

        if (!validCoupon) throw new Error("Invalid Coupon Code");
        if (!validCoupon.isActive) throw new Error("Coupon is no longer active");
        if (new Date() > new Date(validCoupon.expirationDate)) {
          throw new Error("Coupon has expired");
        }
        if (serverItemsPrice < validCoupon.minOrderValue) {
          throw new Error(
            `Minimum order for this coupon is ₹${validCoupon.minOrderValue}`,
          );
        }

        const alreadyUsed = await tx.couponUsage.findFirst({
          where: { userId, couponId: validCoupon.id },
        });
        if (alreadyUsed) throw new Error("Coupon already used by this account");

        serverCouponDiscount =
          (serverItemsPrice * validCoupon.discountPercentage) / 100;
        if (
          validCoupon.maxDiscountAmount > 0 &&
          serverCouponDiscount > validCoupon.maxDiscountAmount
        ) {
          serverCouponDiscount = validCoupon.maxDiscountAmount;
        }
        serverCouponDiscount = Number(serverCouponDiscount.toFixed(2));
      }

      const hasSwadPass =
        user.hasSwadPass &&
        user.swadPassExpiry &&
        new Date(user.swadPassExpiry) > new Date();

      let baseShippingPrice = serverItemsPrice > 500 ? 0 : 40;
      if (hasSwadPass) baseShippingPrice = 0;

      const { multiplier: surgeMultiplier } = await calculateSurgeMultiplier();
      let serverDeliveryFee = baseShippingPrice;
      if (surgeMultiplier > 1 && baseShippingPrice > 0) {
        serverDeliveryFee = parseFloat((baseShippingPrice * surgeMultiplier).toFixed(2));
      }
      const serverSurgePrice =
        baseShippingPrice > 0
          ? parseFloat((baseShippingPrice * (surgeMultiplier - 1)).toFixed(2))
          : 0;

      const commissionRate = 0.15;
      const netItemsValue = Math.max(0, serverItemsPrice - serverCouponDiscount);
      const serverCommission = parseFloat((netItemsValue * commissionRate).toFixed(2));
      const serverRestaurantPayout = parseFloat((netItemsValue - serverCommission).toFixed(2));

      const serverTaxPrice = Number((serverItemsPrice * 0.05).toFixed(2));
      const serverTipAmount = Math.min(Math.max(0, Number(tipAmount) || 0), 500);

      const serverTotalPrice = parseFloat(
        Math.max(
          0,
          serverItemsPrice +
            serverTaxPrice +
            serverTipAmount +
            serverDeliveryFee -
            serverCouponDiscount,
        ).toFixed(2),
      );

      let orderIsPaid = false;
      let orderPaidAt = null;

      if (paymentMethod === "Wallet") {
        if (user.walletBalance < serverTotalPrice) {
          throw new Error("Insufficient Wallet Balance.");
        }

        const currentTransactions = Array.isArray(user.walletTransactions)
          ? user.walletTransactions
          : [];
        const newTransaction = {
          amount: serverTotalPrice,
          type: "Debit",
          description: "Payment for Order",
          date: new Date(),
        };

        await tx.user.update({
          where: { id: user.id },
          data: {
            walletBalance: { decrement: serverTotalPrice },
            walletTransactions: [...currentTransactions, newTransaction].slice(-100),
          },
        });

        orderIsPaid = true;
        orderPaidAt = new Date();
      }

      const { estimatedDeliveryAt } = calculateOrderETA({
        orderItems,
        shippingAddress,
      });

      const order = await tx.order.create({
        data: {
          userId,
          restaurantId: firstRestaurantId,
          orderItems,
          shippingAddress,
          paymentMethod,
          itemsPrice: serverItemsPrice,
          taxPrice: serverTaxPrice,
          shippingPrice: serverDeliveryFee,
          totalPrice: serverTotalPrice,
          couponCode: couponCode || "",
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
          estimatedDeliveryAt,
        },
      });

      if (couponCode && validCoupon && paymentMethod !== "Online") {
        await tx.couponUsage.create({
          data: {
            userId,
            couponId: validCoupon.id,
            orderId: order.id,
            discountApplied: serverCouponDiscount,
          },
        });
      }

      return { order, serverItemsPrice };
    });

    const createdOrder = result.order;

    // Non-blocking loyalty coin award
    try {
      const earnedCoins = Math.floor(result.serverItemsPrice / 10);
      if (earnedCoins > 0) {
        await awardCoinsToUser(
          userId,
          earnedCoins,
          "Earn",
          `Earned ${earnedCoins} SwadCoins for order #${createdOrder.id.slice(-6).toUpperCase()}`,
          createdOrder.id,
        );
      }
    } catch (coinErr) {
      console.error("🪙 Loyalty award error:", coinErr.message);
    }

    // Non-blocking email & socket
    if (paymentMethod !== "Online") {
      const populatedOrder = await prisma.order.findUnique({
        where: { id: createdOrder.id },
        include: {
          user: { select: { id: true, name: true, email: true } },
          restaurant: { include: { owner: true } },
        },
      });

      if (populatedOrder?.user?.email) {
        sendEmail({
          email: populatedOrder.user.email,
          subject: `SwadKart: Order Confirmed! #${createdOrder.id.slice(-6).toUpperCase()}`,
          html: getOrderConfirmationTemplate(
            populatedOrder,
            paymentMethod === "Wallet",
          ),
        }).catch((e) => console.error("Customer confirmation email error:", e.message));

        getAdminEmail().then((adminEmail) => {
          if (adminEmail) {
            sendEmail({
              email: adminEmail,
              subject: `New ${paymentMethod} Order #${createdOrder.id.slice(-6).toUpperCase()}`,
              html: getAdminOrderAlertTemplate(populatedOrder),
            }).catch((e) => console.error("Admin alert email error:", e.message));
          }
        });

        if (populatedOrder.restaurant?.owner?.email) {
          sendEmail({
            email: populatedOrder.restaurant.owner.email,
            subject: `New Order for ${populatedOrder.restaurant.name}`,
            html: getRestaurantOrderAlertTemplate(populatedOrder, populatedOrder.restaurant.name),
          }).catch((e) => console.error("Restaurant alert email error:", e.message));

          if (req.io) {
            req.io
              .to(populatedOrder.restaurant.owner.id)
              .emit("newOrderReceived", populatedOrder);
          }
        }
      }
    }

    res.status(201).json(createdOrder);
  } catch (error) {
    res.status(400);
    throw new Error(error.message);
  }
});

// ==========================================
// 🔍 2. GET ORDER BY ID
// ==========================================
export const getOrderById = async (req, res) => {
  try {
    const order = await prisma.order.findUnique({
      where: { id: req.params.id },
      include: {
        user: { select: { id: true, name: true, email: true } },
        deliveryPartner: { select: { id: true, name: true, phone: true } },
        restaurant: { select: { id: true, name: true, ownerId: true } },
      },
    });

    if (!order) {
      return res.status(404).json({ message: "Order not found." });
    }

    const userId = req.user.id || req.user._id;
    const isAdmin = req.user.role === "admin";
    const isOwner = order.userId === userId;
    const isAssignedDriver = order.deliveryPartnerId === userId;
    let isRestaurantOwner = false;

    if (req.user.role === "restaurant_owner") {
      const restaurantDoc = await prisma.restaurant.findFirst({
        where: { ownerId: userId },
      });
      if (restaurantDoc && order.restaurantId === restaurantDoc.id) {
        isRestaurantOwner = true;
      }
    }

    if (!isOwner && !isAdmin && !isRestaurantOwner && !isAssignedDriver) {
      return res.status(403).json({ message: "Not authorized to view this order" });
    }

    if (req.user.role === "restaurant_owner") {
      delete order.deliveryOTP;
    }

    res.json(order);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ==========================================
// 📝 3. MARK ORDER AS PAID
// ==========================================
export const updateOrderToPaid = async (req, res) => {
  try {
    const orderId = req.params.id;
    const order = await prisma.order.findUnique({ where: { id: orderId } });

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    if (order.isPaid) {
      return res.status(400).json({ message: "Order is already marked as paid." });
    }

    const userId = req.user.id || req.user._id;
    const isOwner = order.userId === userId;
    const isAdmin = req.user.role === "admin";
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: "Not authorized to update this order" });
    }

    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: {
        isPaid: true,
        paidAt: new Date(),
        paymentResult: {
          id: req.body.id,
          status: req.body.status,
          update_time: req.body.update_time,
          email_address: req.body.email_address,
        },
      },
    });

    if (req.io) {
      req.io.to(updatedOrder.id).emit("orderUpdated", updatedOrder);
    }

    res.json(updatedOrder);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ==========================================
// 📝 4. UPDATE ORDER STATUS
// ==========================================
const VALID_TRANSITIONS = {
  "Payment Pending": ["Placed", "Cancelled"],
  Placed: ["Preparing", "Cancelled"],
  Preparing: ["Ready", "Cancelled"],
  Ready: ["Out for Delivery"],
  "Out for Delivery": ["Delivered"],
  Delivered: [],
};

export const updateOrderStatus = async (req, res) => {
  const isAdmin = req.user.role === "admin";
  const isRestaurantOwner = req.user.role === "restaurant_owner";
  if (!isAdmin && !isRestaurantOwner) {
    return res.status(403).json({ message: "Not authorized to update order status." });
  }

  const { status } = req.body;
  const userId = req.user.id || req.user._id;

  try {
    const order = await prisma.order.findUnique({
      where: { id: req.params.id },
      include: {
        user: { select: { id: true, fcmToken: true, phone: true } },
      },
    });

    if (!order) return res.status(404).json({ message: "Order not found" });

    if (isRestaurantOwner && !isAdmin) {
      const restaurantDoc = await prisma.restaurant.findFirst({
        where: { ownerId: userId },
      });
      if (!restaurantDoc || order.restaurantId !== restaurantDoc.id) {
        return res.status(403).json({ message: "Not authorized to update this order." });
      }
    }

    const currentStatus = order.orderStatus;
    if (!VALID_TRANSITIONS[currentStatus]?.includes(status)) {
      return res.status(400).json({
        message: `Invalid status transition: cannot move from "${currentStatus}" to "${status}".`,
      });
    }

    if (status === "Delivered") {
      return res.status(400).json({
        message: "Use the OTP delivery verification endpoint to mark orders as Delivered.",
      });
    }

    let deliveryPartnerId = order.deliveryPartnerId;
    let deliveryOTP = order.deliveryOTP;

    if (status === "Ready" && !order.deliveryPartnerId) {
      const nearestPartner = await prisma.user.findFirst({
        where: {
          role: "delivery_partner",
          isAvailable: true,
        },
      });

      if (nearestPartner) {
        deliveryPartnerId = nearestPartner.id;
        deliveryOTP = deliveryOTP || crypto.randomInt(1000, 10000);
        await prisma.user.update({
          where: { id: nearestPartner.id },
          data: { isAvailable: false },
        });
      }
    }

    const updatedOrder = await prisma.order.update({
      where: { id: order.id },
      data: {
        orderStatus: status,
        deliveryPartnerId,
        deliveryOTP,
      },
    });

    if (order.user?.fcmToken) {
      sendPush(
        order.user.fcmToken,
        "Order Update 📦",
        `Your order status is now: ${status}`,
        { orderId: order.id, status },
      ).catch(() => {});
    }

    if (req.io) {
      const { deliveryOTP: _, ...safeOrder } = updatedOrder;
      if (order.userId) {
        req.io.to(order.userId).emit("orderUpdated", safeOrder);
      }
      if (status === "Ready" && updatedOrder.deliveryPartnerId) {
        req.io
          .to(updatedOrder.deliveryPartnerId)
          .emit("orderAssigned", updatedOrder);
      } else if (status === "Ready") {
        req.io.emit("newDeliveryTask", safeOrder);
      }
    }

    res.json(updatedOrder);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ==========================================
// 📜 5. USER ORDER HISTORY
// ==========================================
export const getMyOrders = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const userId = req.user.id || req.user._id;

    const count = await prisma.order.count({ where: { userId } });
    const orders = await prisma.order.findMany({
      where: { userId },
      include: {
        restaurant: { select: { id: true, name: true, image: true } },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    });

    res.json({
      data: orders,
      metadata: { total: count, page, pages: Math.ceil(count / limit) },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ==========================================
// 👨‍🍳 6. RESTAURANT OWNER ORDERS
// ==========================================
export const getMyRestaurantOrders = async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const restaurant = await prisma.restaurant.findFirst({
      where: { ownerId: userId },
    });

    if (!restaurant) {
      return res
        .status(404)
        .json({ message: "No restaurant profile found. Please create one." });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const where = {
      restaurantId: restaurant.id,
      orderStatus: { not: "Payment Pending" },
    };

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          user: { select: { id: true, name: true, email: true } },
          deliveryPartner: { select: { id: true, name: true, phone: true } },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.order.count({ where }),
    ]);

    const securedOrders = orders.map(({ deliveryOTP: _, ...rest }) => rest);
    res.json({
      orders: securedOrders,
      page,
      pages: Math.ceil(total / limit),
      total,
    });
  } catch (error) {
    console.error("Error in getMyRestaurantOrders:", error);
    res.status(500).json({ message: error.message });
  }
};

// ==========================================
// 👑 7. ADMIN: ALL ORDERS
// ==========================================
export const getOrders = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const where = { orderStatus: { not: "Payment Pending" } };
    const count = await prisma.order.count({ where });

    const orders = await prisma.order.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, email: true } },
        deliveryPartner: { select: { id: true, name: true, phone: true } },
        restaurant: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    });

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
// 📈 8. SALES ANALYTICS
// ==========================================
export const getSalesStats = async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const where = { isPaid: true, orderStatus: { not: "Cancelled" } };

    if (req.user.role === "restaurant_owner") {
      const restaurantDoc = await prisma.restaurant.findFirst({
        where: { ownerId: userId },
      });
      if (!restaurantDoc) {
        return res.status(404).json({ message: "Restaurant not found." });
      }
      where.restaurantId = restaurantDoc.id;
    }

    const paidOrders = await prisma.order.findMany({
      where,
      select: { totalPrice: true, createdAt: true },
    });

    const dateMap = {};
    for (const order of paidOrders) {
      const dateKey = new Date(order.createdAt).toISOString().split("T")[0];
      if (!dateMap[dateKey]) {
        dateMap[dateKey] = { sales: 0, count: 0 };
      }
      dateMap[dateKey].sales += order.totalPrice;
      dateMap[dateKey].count += 1;
    }

    const stats = Object.keys(dateMap)
      .sort()
      .slice(-7)
      .map((date) => ({
        _id: date,
        sales: parseFloat(dateMap[date].sales.toFixed(2)),
        count: dateMap[date].count,
      }));

    res.json(stats);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ==========================================
// ❌ 9. CANCEL ORDER & REFUND LOGIC
// ==========================================
export const cancelOrder = asyncHandler(async (req, res) => {
  const orderId = req.params.id;
  const userId = req.user.id || req.user._id;
  const order = await prisma.order.findUnique({ where: { id: orderId } });

  if (!order) {
    res.status(404);
    throw new Error("Order not found");
  }

  const isOwner = order.userId === userId;
  const isAdmin = req.user.role === "admin";
  let isRestaurantOwner = false;

  if (!isOwner && !isAdmin && req.user.role === "restaurant_owner") {
    const restaurantDoc = await prisma.restaurant.findFirst({
      where: { ownerId: userId },
    });
    isRestaurantOwner = !!(restaurantDoc && order.restaurantId === restaurantDoc.id);
  }

  if (!isOwner && !isAdmin && !isRestaurantOwner) {
    res.status(403);
    throw new Error("Not authorized to cancel this order");
  }

  if (order.orderStatus === "Cancelled") {
    res.status(400);
    throw new Error("Order is already cancelled");
  }

  if (order.orderStatus === "Delivered") {
    res.status(400);
    throw new Error("Delivered orders cannot be cancelled.");
  }

  if (order.orderStatus === "Out for Delivery") {
    res.status(400);
    throw new Error("Order is already out for delivery. Contact support to cancel.");
  }

  try {
    const updatedOrder = await prisma.$transaction(async (tx) => {
      // 1. Wallet / Razorpay refund
      if (order.isPaid && (order.paymentMethod === "Online" || order.paymentMethod === "Wallet")) {
        if (order.paymentMethod === "Online" && order.paymentResult?.id) {
          try {
            const instance = getRazorpayInstance();
            await instance.payments.refund(order.paymentResult.id, {
              amount: Math.round(order.totalPrice * 100),
            });
          } catch (rzpErr) {
            console.error("Razorpay refund failed:", rzpErr.message);
            throw new Error("Refund processing failed — cancellation aborted");
          }
        }

        const buyer = await tx.user.findUnique({ where: { id: order.userId } });
        if (buyer) {
          const currentTxs = Array.isArray(buyer.walletTransactions)
            ? buyer.walletTransactions
            : [];
          const newTx = {
            amount: order.totalPrice,
            type: "Credit",
            description: `Refund for Cancelled Order ${order.id}`,
            date: new Date(),
          };

          await tx.user.update({
            where: { id: buyer.id },
            data: {
              walletBalance: { increment: order.totalPrice },
              walletTransactions: [...currentTxs, newTx].slice(-100),
            },
          });
        }
      }

      // 2. Restore product stock
      const items = Array.isArray(order.orderItems) ? order.orderItems : [];
      for (const item of items) {
        if (item.product) {
          await tx.product.update({
            where: { id: item.product },
            data: { countInStock: { increment: item.qty } },
          });
        }
      }

      // 3. Free up coupon
      if (order.couponCode) {
        await tx.couponUsage.deleteMany({ where: { orderId: order.id } });
      }

      // 4. Free up delivery partner
      if (order.deliveryPartnerId) {
        await tx.user.update({
          where: { id: order.deliveryPartnerId },
          data: { isAvailable: true },
        });
      }

      // 5. Update Order Status
      return await tx.order.update({
        where: { id: order.id },
        data: {
          orderStatus: "Cancelled",
          cancelledAt: new Date(),
          refundStatus: order.isPaid ? "Processed" : "None",
        },
      });
    });

    if (req.io) {
      req.io.to(order.userId).emit("orderUpdated", updatedOrder);
    }

    // Cancellation email (non-blocking)
    prisma.user.findUnique({ where: { id: order.userId } }).then((user) => {
      if (user?.email) {
        const cancelReason = req.body?.reason?.trim() || "Cancelled by request";
        sendEmail({
          email: user.email,
          subject: `SwadKart: Order Cancelled #${updatedOrder.id.slice(-6).toUpperCase()}`,
          html: getOrderCancelledTemplate(updatedOrder, cancelReason),
        }).catch(() => {});
      }
    });

    res.json(updatedOrder);
  } catch (error) {
    res.status(500);
    throw new Error(error.message);
  }
});

// ==========================================
// ❌ 10. CANCEL PENDING ONLINE ORDER
// ==========================================
export const cancelPendingOrder = asyncHandler(async (req, res) => {
  const orderId = req.params.id;
  const userId = req.user.id || req.user._id;
  const order = await prisma.order.findUnique({ where: { id: orderId } });

  if (!order) {
    res.status(404);
    throw new Error("Order not found");
  }

  if (order.userId !== userId) {
    res.status(403);
    throw new Error("Not authorized to cancel this order");
  }

  if (order.orderStatus !== "Payment Pending") {
    res.status(400);
    throw new Error("Only pending orders can be cancelled via this endpoint");
  }

  try {
    await prisma.$transaction(async (tx) => {
      const items = Array.isArray(order.orderItems) ? order.orderItems : [];
      for (const item of items) {
        if (item.product) {
          await tx.product.update({
            where: { id: item.product },
            data: { countInStock: { increment: item.qty } },
          });
        }
      }

      if (order.couponCode) {
        await tx.couponUsage.deleteMany({ where: { orderId: order.id } });
      }

      await tx.order.delete({ where: { id: order.id } });
    });

    res.json({ success: true, message: "Pending order cancelled successfully" });
  } catch (error) {
    res.status(500);
    throw new Error(error.message);
  }
});
