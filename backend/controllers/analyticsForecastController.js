import asyncHandler from "express-async-handler";
import mongoose from "mongoose";
import Order from "../models/orderModel.js";
import Restaurant from "../models/restaurantModel.js";

const validateRestaurantAccess = async (restaurantId, user) => {
  if (!restaurantId) {
    if (user.role === "restaurant_owner") {
      const owned = await Restaurant.findOne({ owner: user._id }).select("_id").lean();
      if (owned) return owned._id;
    }
    return null;
  }
  if (!mongoose.Types.ObjectId.isValid(restaurantId)) {
    throw Object.assign(new Error("Invalid restaurant ID"), { status: 400 });
  }
  if (user.role === "restaurant_owner") {
    const restaurant = await Restaurant.findById(restaurantId).select("owner").lean();
    if (!restaurant || restaurant.owner?.toString() !== user._id.toString()) {
      const owned = await Restaurant.findOne({ owner: user._id }).select("_id").lean();
      if (owned) return owned._id;
      throw Object.assign(new Error("Not authorized"), { status: 403 });
    }
  }
  return new mongoose.Types.ObjectId(restaurantId);
};

const parseDays = (days) => {
  const n = parseInt(days, 10);
  return Number.isFinite(n) ? Math.max(1, Math.min(n, 365)) : 30;
};

export const getRevenueProjection = asyncHandler(async (req, res) => {
  const { restaurantId, days = 30 } = req.query;

  const safeRestaurantId = await validateRestaurantAccess(restaurantId, req.user);
  const daysNum = parseDays(days);

  const matchFilter = { orderStatus: { $ne: "Cancelled" } };
  if (safeRestaurantId) matchFilter["orderItems.restaurant"] = safeRestaurantId;

  const now = new Date();
  const startDate = new Date(now.getTime() - daysNum * 24 * 60 * 60 * 1000);

  const dailyRevenue = await Order.aggregate([
    { $match: { ...matchFilter, createdAt: { $gte: startDate } } },
    {
      $group: {
        _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
        revenue: { $sum: "$totalPrice" },
        orders: { $sum: 1 },
        avgOrderValue: { $avg: "$totalPrice" },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  const totalRevenue = dailyRevenue.reduce((s, d) => s + d.revenue, 0);
  const totalOrders = dailyRevenue.reduce((s, d) => s + d.orders, 0);
  const avgOrderValue = totalOrders ? totalRevenue / totalOrders : 0;
  const avgDailyRevenue = dailyRevenue.length > 0 ? totalRevenue / dailyRevenue.length : 0;

  const revenueValues = dailyRevenue.map((d) => d.revenue);
  const mean = avgDailyRevenue;
  const variance = revenueValues.length > 0 ? revenueValues.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / revenueValues.length : 0;
  const stdDev = Math.sqrt(variance);

  const projected7Days = [];
  const last7DaysAvg = dailyRevenue.slice(-7).reduce((s, d) => s + d.revenue, 0) / 7;
  for (let i = 1; i <= 7; i++) {
    const projectedDate = new Date(now);
    projectedDate.setDate(projectedDate.getDate() + i);
    const dayOfWeek = projectedDate.getDay();
    const dayMultiplier = [0.6, 1.0, 0.9, 1.1, 1.2, 1.4, 1.3][dayOfWeek];
    const projected = Number((last7DaysAvg * dayMultiplier).toFixed(2));
    projected7Days.push({
      date: projectedDate.toISOString().split("T")[0],
      projectedRevenue: projected,
      confidence: i <= 3 ? "high" : i <= 5 ? "medium" : "low",
    });
  }

  const weeklyProjection = Number((avgDailyRevenue * 7).toFixed(2));
  const monthlyProjection = Number((avgDailyRevenue * 30).toFixed(2));

  res.json({
    period: `${days} days`,
    dailyRevenue,
    totalRevenue: Number(totalRevenue.toFixed(2)),
    totalOrders,
    avgOrderValue: Number(avgOrderValue.toFixed(2)),
    avgDailyRevenue: Number(avgDailyRevenue.toFixed(2)),
    revenueStdDev: Number(stdDev.toFixed(2)),
    variance,
    weeklyProjection,
    monthlyProjection,
    projected7Days,
  });
});

export const getOrderVolumeForecast = asyncHandler(async (req, res) => {
  const { restaurantId, days = 30 } = req.query;

  const safeRestaurantId = await validateRestaurantAccess(restaurantId, req.user);
  const daysNum = parseDays(days);

  const matchFilter = { orderStatus: { $ne: "Cancelled" } };
  if (safeRestaurantId) matchFilter["orderItems.restaurant"] = safeRestaurantId;

  const now = new Date();
  const startDate = new Date(now.getTime() - daysNum * 24 * 60 * 60 * 1000);

  const hourlyVolume = await Order.aggregate([
    { $match: { ...matchFilter, createdAt: { $gte: startDate } } },
    {
      $group: {
        _id: { $hour: "$createdAt" },
        count: { $sum: 1 },
        avgOrderValue: { $avg: "$totalPrice" },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  const dayOfWeekVolume = await Order.aggregate([
    { $match: { ...matchFilter, createdAt: { $gte: startDate } } },
    {
      $group: {
        _id: { $dayOfWeek: "$createdAt" },
        count: { $sum: 1 },
        revenue: { $sum: "$totalPrice" },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const formattedDayVolume = dayOfWeekVolume.map((d) => ({
    day: dayNames[d._id - 1],
    dayNum: d._id,
    orders: d.count,
    revenue: Number(d.revenue.toFixed(2)),
  }));

  const peakHours = hourlyVolume.filter((h) => h.count >= 5).map((h) => h._id);
  const offPeakHours = hourlyVolume.filter((h) => h.count <= 2).map((h) => h._id);

  const avgDailyOrders = hourlyVolume.reduce((s, h) => s + h.count, 0) / daysNum;
  const projectedNext7Days = Math.round(avgDailyOrders * 7);
  const projectedNext30Days = Math.round(avgDailyOrders * 30);

  res.json({
    hourlyVolume: hourlyVolume.map((h) => ({ hour: h._id, orders: h.count, avgValue: Number(h.avgOrderValue?.toFixed(2) || 0) })),
    dayVolume: formattedDayVolume,
    peakHours,
    offPeakHours,
    avgDailyOrders: Number(avgDailyOrders.toFixed(2)),
    projectedNext7Days,
    projectedNext30Days,
  });
});

export const getDemandAnalytics = asyncHandler(async (req, res) => {
  const { restaurantId, days = 30 } = req.query;

  const safeRestaurantId = await validateRestaurantAccess(restaurantId, req.user);
  const daysNum = parseDays(days);

  const matchFilter = { orderStatus: { $ne: "Cancelled" } };
  if (safeRestaurantId) matchFilter["orderItems.restaurant"] = safeRestaurantId;

  const now = new Date();
  const startDate = new Date(now.getTime() - daysNum * 24 * 60 * 60 * 1000);
  matchFilter.createdAt = { $gte: startDate };

  const productDemand = await Order.aggregate([
    { $match: matchFilter },
    { $unwind: "$orderItems" },
    { $match: { "orderItems.product": { $exists: true } } },
    {
      $group: {
        _id: "$orderItems.product",
        name: { $first: "$orderItems.name" },
        quantitySold: { $sum: "$orderItems.qty" },
        revenue: { $sum: { $multiply: ["$orderItems.price", "$orderItems.qty"] } },
        avgPrice: { $avg: "$orderItems.price" },
        orderCount: { $sum: 1 },
      },
    },
    { $sort: { quantitySold: -1 } },
    { $limit: 20 },
  ]);

  const categoryDemand = await Order.aggregate([
    { $match: matchFilter },
    { $unwind: "$orderItems" },
    {
      $group: {
        _id: "$orderItems.category",
        quantitySold: { $sum: "$orderItems.qty" },
        revenue: { $sum: { $multiply: ["$orderItems.price", "$orderItems.qty"] } },
        avgOrderValue: { $avg: "$totalPrice" },
      },
    },
    { $sort: { revenue: -1 } },
  ]);

  const totalProducts = productDemand.length;
  const topProduct = productDemand[0];
  const fastMoving = productDemand.filter((p) => p.quantitySold >= 10).length;
  const slowMoving = productDemand.filter((p) => p.quantitySold <= 2).length;

  res.json({
    period: `${days} days`,
    topProducts: productDemand.map((p, idx) => ({
      rank: idx + 1,
      productId: p._id,
      name: p.name,
      quantitySold: p.quantitySold,
      revenue: Number(p.revenue.toFixed(2)),
      avgPrice: Number(p.avgPrice?.toFixed(2) || 0),
      orderCount: p.orderCount,
    })),
    categoryDemand: categoryDemand.map((c) => ({
      category: c._id || "Uncategorized",
      quantitySold: c.quantitySold,
      revenue: Number(c.revenue.toFixed(2)),
      avgOrderValue: Number(c.avgOrderValue?.toFixed(2) || 0),
    })),
    summary: { totalProducts, fastMoving, slowMoving, topProductName: topProduct?.name || null },
  });
});

export const getProfitLossProjection = asyncHandler(async (req, res) => {
  const { restaurantId, days = 30 } = req.query;

  const safeRestaurantId = await validateRestaurantAccess(restaurantId, req.user);
  const daysNum = parseDays(days);

  const matchFilter = { orderStatus: { $ne: "Cancelled" } };
  if (safeRestaurantId) matchFilter["orderItems.restaurant"] = safeRestaurantId;

  const now = new Date();
  const startDate = new Date(now.getTime() - daysNum * 24 * 60 * 60 * 1000);

  const orders = await Order.find({ ...matchFilter, createdAt: { $gte: startDate } })
    .select("itemsPrice totalPrice deliveryFee tipAmount couponDiscount restaurantPayout restaurantCommission")
    .lean();

  const grossRevenue = orders.reduce((s, o) => s + (o.itemsPrice || 0), 0);
  const totalRevenue = orders.reduce((s, o) => s + (o.totalPrice || 0), 0);
  const totalDeliveryFees = orders.reduce((s, o) => s + (o.deliveryFee || 0), 0);
  const totalTips = orders.reduce((s, o) => s + (o.tipAmount || 0), 0);
  const totalDiscounts = orders.reduce((s, o) => s + (o.couponDiscount || 0), 0);
  const platformRevenue = orders.reduce((s, o) => s + (o.restaurantCommission || 0), 0);
  const restaurantPayoutTotal = orders.reduce((s, o) => s + (o.restaurantPayout || 0), 0);

  const netPlatformRevenue = platformRevenue + totalDeliveryFees - totalDiscounts;
  const netMargin = totalRevenue > 0 ? ((netPlatformRevenue / totalRevenue) * 100).toFixed(2) : 0;

  res.json({
    period: `${days} days`,
    grossRevenue: Number(grossRevenue.toFixed(2)),
    totalRevenue: Number(totalRevenue.toFixed(2)),
    deliveryFeesCollected: Number(totalDeliveryFees.toFixed(2)),
    tipsCollected: Number(totalTips.toFixed(2)),
    discountsGiven: Number(totalDiscounts.toFixed(2)),
    platformCommission: Number(platformRevenue.toFixed(2)),
    restaurantPayouts: Number(restaurantPayoutTotal.toFixed(2)),
    netPlatformRevenue: Number(netPlatformRevenue.toFixed(2)),
    netMarginPercent: Number(netMargin),
    orderCount: orders.length,
    avgOrderValue: Number((totalRevenue / orders.length).toFixed(2)),
  });
});