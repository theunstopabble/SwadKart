import asyncHandler from "express-async-handler";
import prisma from "../config/prisma.js";
import { sanitizeObjectId } from "../utils/sanitize.js";

export const calculateCommission = asyncHandler(async (req, res) => {
  const currentUserId = req.user.id || req.user._id;
  const { orderId } = req.params;
  const cleanOrderId = sanitizeObjectId(orderId);

  const order = await prisma.order.findUnique({
    where: { id: cleanOrderId },
    include: {
      user: { select: { id: true, name: true } },
    },
  });

  if (!order) {
    res.status(404);
    throw new Error("Order not found");
  }

  // Restaurant owners can only see their own orders
  if (req.user.role === "restaurant_owner") {
    const owned = await prisma.restaurant.findMany({
      where: { ownerId: currentUserId },
      select: { id: true },
    });
    const ownedIds = owned.map((r) => r.id.toString());
    const orderItems = Array.isArray(order.orderItems) ? order.orderItems : [];
    const orderRestaurantIds = orderItems.map((i) => (i.restaurant || i.restaurantId)?.toString());
    if (
      !orderRestaurantIds.some((id) => ownedIds.includes(id)) &&
      (!order.restaurantId || !ownedIds.includes(order.restaurantId.toString()))
    ) {
      res.status(403);
      throw new Error("Not authorized to view this order's commission");
    }
  }

  const platformFeeRate = 0.15; // 15% standard
  const netItemsValue = (order.itemsPrice || 0) - (order.couponDiscount || 0);
  const commission = Number((netItemsValue * platformFeeRate).toFixed(2));
  const restaurantPayout = Number((netItemsValue - commission).toFixed(2));

  res.json({
    orderId: cleanOrderId,
    orderTotal: order.totalPrice,
    itemsPrice: order.itemsPrice,
    couponDiscount: order.couponDiscount || 0,
    netItemsValue: Number(netItemsValue.toFixed(2)),
    platformFeeRate: platformFeeRate * 100,
    platformCommission: commission,
    restaurantPayout,
    deliveryFeeCover: order.deliveryFee || 0,
    surgeRevenue: order.surgePrice || 0,
    tipAmount: order.tipAmount || 0,
    breakEvenForRestaurant: Number(restaurantPayout.toFixed(2)),
  });
});

export const getCommissionBreakdown = asyncHandler(async (req, res) => {
  const currentUserId = req.user.id || req.user._id;
  let { restaurantId, startDate, endDate } = req.query;

  if (!restaurantId && req.user.role === "restaurant_owner") {
    const owned = await prisma.restaurant.findFirst({
      where: { ownerId: currentUserId },
      select: { id: true },
    });
    if (owned) restaurantId = owned.id.toString();
  }

  let cleanRestaurantId = null;
  if (restaurantId) {
    try {
      cleanRestaurantId = sanitizeObjectId(restaurantId);
    } catch {
      cleanRestaurantId = null;
    }
  }

  const dateFilter = {};
  if (startDate) {
    const sd = new Date(startDate);
    if (!isNaN(sd.getTime())) dateFilter.gte = sd;
  }
  if (endDate) {
    const ed = new Date(endDate);
    if (!isNaN(ed.getTime())) dateFilter.lte = ed;
  }

  const matchStage = { orderStatus: { not: "Cancelled" } };
  if (cleanRestaurantId) matchStage.restaurantId = cleanRestaurantId;
  if (Object.keys(dateFilter).length) matchStage.createdAt = dateFilter;

  const orders = await prisma.order.findMany({
    where: matchStage,
    select: {
      restaurantId: true,
      orderItems: true,
      couponDiscount: true,
      deliveryFee: true,
      tipAmount: true,
    },
  });

  const restaurantDataMap = {};
  for (const o of orders) {
    const restId = o.restaurantId || "unknown";
    if (!restaurantDataMap[restId]) {
      restaurantDataMap[restId] = {
        _id: restId,
        totalRevenue: 0,
        totalOrders: 0,
        totalDiscount: 0,
        totalDeliveryFee: 0,
        totalTip: 0,
      };
    }
    const items = Array.isArray(o.orderItems) ? o.orderItems : [];
    for (const item of items) {
      restaurantDataMap[restId].totalRevenue += Number(item.price || 0) * Number(item.qty || 1);
      restaurantDataMap[restId].totalOrders += Number(item.qty || 1);
    }
    restaurantDataMap[restId].totalDiscount += (o.couponDiscount || 0);
    restaurantDataMap[restId].totalDeliveryFee += (o.deliveryFee || 0);
    restaurantDataMap[restId].totalTip += (o.tipAmount || 0);
  }

  const restaurants = await prisma.restaurant.findMany({
    select: { id: true, name: true },
  });
  const restaurantMap = Object.fromEntries(restaurants.map((r) => [r.id, r.name]));

  const breakdown = Object.values(restaurantDataMap).map((r) => {
    const net = r.totalRevenue - r.totalDiscount;
    const commission = net * 0.15;
    const payout = net - commission;

    return {
      restaurantId: r._id,
      restaurantName: restaurantMap[r._id] || "Unknown",
      totalOrders: r.totalOrders,
      grossRevenue: Number(r.totalRevenue.toFixed(2)),
      totalDiscount: Number(r.totalDiscount.toFixed(2)),
      netRevenue: Number(net.toFixed(2)),
      platformCommission: Number(commission.toFixed(2)),
      platformFeeRate: 15,
      restaurantPayout: Number(payout.toFixed(2)),
      deliveryFeeCover: Number(r.totalDeliveryFee.toFixed(2)),
      grossTip: Number(r.totalTip.toFixed(2)),
    };
  });

  res.json(breakdown);
});

export const calculatePricingTiers = asyncHandler(async (req, res) => {
  const rawBase = Number(req.body.basePrice);
  const rawCost = Number(req.body.costPrice);
  const surgeMultiplier = Number(req.body.surgeMultiplier) || 1;

  if (!Number.isFinite(rawBase) || !Number.isFinite(rawCost) || rawBase <= 0 || rawCost <= 0) {
    res.status(400);
    throw new Error("basePrice and costPrice must be positive numbers");
  }

  const profit = rawBase - rawCost;
  const margin = (profit / rawBase) * 100;
  const withSurge = Number((rawBase * surgeMultiplier).toFixed(2));
  const surgeProfit = withSurge - rawCost;
  const surgeMargin = ((surgeProfit / withSurge) * 100).toFixed(2);

  const tiers = [
    { name: "Minimum (Cost + 10%)", price: Number((rawCost * 1.1).toFixed(2)), margin: 9.09 },
    { name: "Standard (25% margin)", price: Number((rawCost / 0.75).toFixed(2)), margin: 25 },
    { name: "Premium (35% margin)", price: Number((rawCost / 0.65).toFixed(2)), margin: 35 },
    { name: "Competitive (15% margin)", price: Number((rawCost / 0.85).toFixed(2)), margin: 15 },
    {
      name: `With Surge (${surgeMultiplier}x)`,
      price: Number((rawBase * 1.5).toFixed(2)),
      margin: Number(surgeMargin),
    },
  ];

  res.json({
    basePrice: rawBase,
    costPrice: rawCost,
    currentProfit: Number(profit.toFixed(2)),
    currentMargin: Number(margin.toFixed(2)),
    surgeMultiplier,
    withSurge,
    surgeProfit: Number(surgeProfit.toFixed(2)),
    surgeMargin: Number(surgeMargin),
    recommendedPrice: tiers[1].price,
    tiers,
  });
});

export const getMarketPricing = asyncHandler(async (req, res) => {
  const { restaurantId, category } = req.query;

  const filter = {};
  if (restaurantId) {
    try {
      filter.restaurantId = sanitizeObjectId(restaurantId);
    } catch {
      return res.status(400).json({ message: "Invalid restaurantId" });
    }
  }
  if (category) {
    if (typeof category !== "string") {
      return res.status(400).json({ message: "Invalid category" });
    }
    filter.category = category;
  }

  const products = await prisma.product.findMany({
    where: filter,
    select: {
      id: true,
      name: true,
      price: true,
      category: true,
      restaurantId: true,
      restaurant: { select: { name: true } },
    },
  });

  if (!products.length) {
    return res.json({ categoryAverages: [], priceDistribution: {} });
  }

  const byCategory = {};
  products.forEach((p) => {
    const cat = p.category || "General";
    if (!byCategory[cat]) byCategory[cat] = [];
    byCategory[cat].push(p.price);
  });

  const categoryAverages = Object.entries(byCategory).map(([cat, prices]) => {
    const sum = prices.reduce((a, b) => a + b, 0);
    const avg = sum / prices.length;
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const sorted = [...prices].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    const median = sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;

    return {
      category: cat,
      count: prices.length,
      average: Number(avg.toFixed(2)),
      median: Number(median.toFixed(2)),
      min: Number(min.toFixed(2)),
      max: Number(max.toFixed(2)),
    };
  });

  const priceRanges = {
    "₹0-100": products.filter((p) => p.price <= 100).length,
    "₹101-200": products.filter((p) => p.price > 100 && p.price <= 200).length,
    "₹201-300": products.filter((p) => p.price > 200 && p.price <= 300).length,
    "₹301-500": products.filter((p) => p.price > 300 && p.price <= 500).length,
    "₹500+": products.filter((p) => p.price > 500).length,
  };

  res.json({ categoryAverages, priceDistribution: priceRanges, totalProducts: products.length });
});
