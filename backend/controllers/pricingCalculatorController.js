import asyncHandler from "express-async-handler";
import mongoose from "mongoose";
import Order from "../models/orderModel.js";
import Restaurant from "../models/restaurantModel.js";
import Product from "../models/productModel.js";

export const calculateCommission = asyncHandler(async (req, res) => {
  const { orderId } = req.params;

  const order = await Order.findById(orderId)
    .populate("orderItems.product", "name price")
    .populate("user", "name");

  if (!order) {
    res.status(404);
    throw new Error("Order not found");
  }

  // 🛡️ Restaurant owners can only see their own orders
  if (req.user.role === "restaurant_owner") {
    const owned = await Restaurant.find({ owner: req.user._id }).select("_id").lean();
    const ownedIds = owned.map(r => r._id.toString());
    const orderRestaurantIds = order.orderItems.map(i => i.restaurant?.toString());
    if (!orderRestaurantIds.some(id => ownedIds.includes(id))) {
      res.status(403);
      throw new Error("Not authorized to view this order's commission");
    }
  }

  const platformFeeRate = 0.15; // 15% standard
  const netItemsValue = order.itemsPrice - order.couponDiscount;
  const commission = Number((netItemsValue * platformFeeRate).toFixed(2));
  const restaurantPayout = Number((netItemsValue - commission).toFixed(2));

  res.json({
    orderId,
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
  const { restaurantId, startDate, endDate } = req.query;

  const safeRestaurantId = restaurantId && mongoose.Types.ObjectId.isValid(restaurantId)
    ? new mongoose.Types.ObjectId(restaurantId) : null;

  const dateFilter = {};
  if (startDate) {
    const sd = new Date(startDate);
    if (!isNaN(sd.getTime())) dateFilter.$gte = sd;
  }
  if (endDate) {
    const ed = new Date(endDate);
    if (!isNaN(ed.getTime())) dateFilter.$lte = ed;
  }

  const matchStage = { orderStatus: { $ne: "Cancelled" } };
  if (safeRestaurantId) matchStage["orderItems.restaurant"] = safeRestaurantId;
  if (Object.keys(dateFilter).length) matchStage.createdAt = dateFilter;

  const orders = await Order.aggregate([
    { $match: matchStage },
    { $unwind: "$orderItems" },
    {
      $group: {
        _id: "$orderItems.restaurant",
        totalRevenue: { $sum: "$orderItems.price" },
        totalOrders: { $sum: 1 },
        totalDiscount: { $sum: "$couponDiscount" },
        totalDeliveryFee: { $sum: "$deliveryFee" },
        totalTip: { $sum: "$tipAmount" },
      },
    },
  ]);

  const restaurants = await Restaurant.find({}).select("name owner");
  const restaurantMap = {};
  restaurants.forEach((r) => {
    restaurantMap[r._id.toString()] = r.name;
  });

  const breakdown = orders.map((r) => {
    const net = r.totalRevenue - r.totalDiscount;
    const commission = net * 0.15;
    const payout = net - commission;

    return {
      restaurantId: r._id,
      restaurantName: restaurantMap[r._id.toString()] || "Unknown",
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
    { name: "With Surge (1.5x)", price: Number((rawBase * 1.5).toFixed(2)), margin: surgeMargin },
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
    if (!mongoose.Types.ObjectId.isValid(restaurantId)) {
      return res.status(400).json({ message: "Invalid restaurantId" });
    }
    filter.restaurant = restaurantId;
  }
  if (category) {
    if (typeof category !== "string") {
      return res.status(400).json({ message: "Invalid category" });
    }
    filter.category = category;
  }

  const products = await Product
    .find(filter)
    .select("name price category restaurant")
    .populate("restaurant", "name")
    .lean();

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