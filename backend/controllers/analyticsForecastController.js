import asyncHandler from "express-async-handler";
import prisma from "../config/prisma.js";
import { sanitizeObjectId } from "../utils/sanitize.js";

const validateRestaurantAccess = async (restaurantId, user) => {
  const currentUserId = user?.id || user?._id;
  if (!restaurantId) {
    if (user?.role === "restaurant_owner") {
      const owned = await prisma.restaurant.findFirst({
        where: { ownerId: currentUserId },
        select: { id: true },
      });
      if (owned) return owned.id;
    }
    return null;
  }

  let cleanId;
  try {
    cleanId = sanitizeObjectId(restaurantId);
  } catch {
    throw Object.assign(new Error("Invalid restaurant ID"), { status: 400 });
  }

  if (user?.role === "restaurant_owner") {
    const restaurant = await prisma.restaurant.findUnique({
      where: { id: cleanId },
      select: { ownerId: true },
    });
    if (!restaurant || restaurant.ownerId?.toString() !== currentUserId.toString()) {
      const owned = await prisma.restaurant.findFirst({
        where: { ownerId: currentUserId },
        select: { id: true },
      });
      if (owned) return owned.id;
      throw Object.assign(new Error("Not authorized"), { status: 403 });
    }
  }

  return cleanId;
};

const parseDays = (days) => {
  const n = parseInt(days, 10);
  return Number.isFinite(n) ? Math.max(1, Math.min(n, 365)) : 30;
};

export const getRevenueProjection = asyncHandler(async (req, res) => {
  const { restaurantId, days = 30 } = req.query;

  const safeRestaurantId = await validateRestaurantAccess(restaurantId, req.user);
  const daysNum = parseDays(days);

  const now = new Date();
  const startDate = new Date(now.getTime() - daysNum * 24 * 60 * 60 * 1000);

  const matchFilter = {
    orderStatus: { not: "Cancelled" },
    createdAt: { gte: startDate },
  };
  if (safeRestaurantId) matchFilter.restaurantId = safeRestaurantId;

  const orders = await prisma.order.findMany({
    where: matchFilter,
    select: { totalPrice: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });

  const dailyMap = {};
  for (const o of orders) {
    const dateStr = new Date(o.createdAt).toISOString().split("T")[0];
    if (!dailyMap[dateStr]) {
      dailyMap[dateStr] = { _id: dateStr, revenue: 0, orders: 0, totalVal: 0 };
    }
    dailyMap[dateStr].revenue += (o.totalPrice || 0);
    dailyMap[dateStr].orders += 1;
    dailyMap[dateStr].totalVal += (o.totalPrice || 0);
  }

  const dailyRevenue = Object.values(dailyMap).map((d) => ({
    _id: d._id,
    revenue: Number(d.revenue.toFixed(2)),
    orders: d.orders,
    avgOrderValue: d.orders ? Number((d.totalVal / d.orders).toFixed(2)) : 0,
  }));

  const totalRevenue = dailyRevenue.reduce((s, d) => s + d.revenue, 0);
  const totalOrders = dailyRevenue.reduce((s, d) => s + d.orders, 0);
  const avgOrderValue = totalOrders ? totalRevenue / totalOrders : 0;
  const avgDailyRevenue = dailyRevenue.length > 0 ? totalRevenue / dailyRevenue.length : 0;

  const revenueValues = dailyRevenue.map((d) => d.revenue);
  const mean = avgDailyRevenue;
  const variance =
    revenueValues.length > 0
      ? revenueValues.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / revenueValues.length
      : 0;
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

  const now = new Date();
  const startDate = new Date(now.getTime() - daysNum * 24 * 60 * 60 * 1000);

  const matchFilter = {
    orderStatus: { not: "Cancelled" },
    createdAt: { gte: startDate },
  };
  if (safeRestaurantId) matchFilter.restaurantId = safeRestaurantId;

  const orders = await prisma.order.findMany({
    where: matchFilter,
    select: { totalPrice: true, createdAt: true },
  });

  const hourMap = {};
  const dayOfWeekMap = {};

  for (const o of orders) {
    const date = new Date(o.createdAt);
    const hour = date.getHours();
    const day = date.getDay(); // 0 (Sun) to 6 (Sat)

    if (!hourMap[hour]) hourMap[hour] = { count: 0, totalVal: 0 };
    hourMap[hour].count += 1;
    hourMap[hour].totalVal += (o.totalPrice || 0);

    if (!dayOfWeekMap[day]) dayOfWeekMap[day] = { count: 0, revenue: 0 };
    dayOfWeekMap[day].count += 1;
    dayOfWeekMap[day].revenue += (o.totalPrice || 0);
  }

  const hourlyVolume = Object.entries(hourMap).map(([h, data]) => ({
    _id: parseInt(h),
    count: data.count,
    avgOrderValue: data.count ? data.totalVal / data.count : 0,
  }));

  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const formattedDayVolume = dayNames.map((name, idx) => ({
    day: name,
    dayNum: idx + 1,
    orders: dayOfWeekMap[idx]?.count || 0,
    revenue: Number((dayOfWeekMap[idx]?.revenue || 0).toFixed(2)),
  }));

  const peakHours = hourlyVolume.filter((h) => h.count >= 5).map((h) => h._id);
  const offPeakHours = hourlyVolume.filter((h) => h.count <= 2).map((h) => h._id);

  const avgDailyOrders = hourlyVolume.reduce((s, h) => s + h.count, 0) / daysNum;
  const projectedNext7Days = Math.round(avgDailyOrders * 7);
  const projectedNext30Days = Math.round(avgDailyOrders * 30);

  res.json({
    hourlyVolume: hourlyVolume.map((h) => ({
      hour: h._id,
      orders: h.count,
      avgValue: Number(h.avgOrderValue?.toFixed(2) || 0),
    })),
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

  const now = new Date();
  const startDate = new Date(now.getTime() - daysNum * 24 * 60 * 60 * 1000);

  const matchFilter = {
    orderStatus: { not: "Cancelled" },
    createdAt: { gte: startDate },
  };
  if (safeRestaurantId) matchFilter.restaurantId = safeRestaurantId;

  const orders = await prisma.order.findMany({
    where: matchFilter,
    select: { orderItems: true, totalPrice: true },
  });

  const productDemandMap = {};
  const categoryDemandMap = {};

  for (const o of orders) {
    const items = Array.isArray(o.orderItems) ? o.orderItems : [];
    for (const item of items) {
      const prodId = (item.product || item._id || item.id)?.toString();
      if (!prodId) continue;

      if (!productDemandMap[prodId]) {
        productDemandMap[prodId] = {
          _id: prodId,
          name: item.name || "Unknown",
          quantitySold: 0,
          revenue: 0,
          orderCount: 0,
          totalPriceSum: 0,
        };
      }
      const qty = Number(item.qty || 1);
      const price = Number(item.price || 0);
      productDemandMap[prodId].quantitySold += qty;
      productDemandMap[prodId].revenue += qty * price;
      productDemandMap[prodId].orderCount += 1;
      productDemandMap[prodId].totalPriceSum += price;

      const cat = item.category || "Uncategorized";
      if (!categoryDemandMap[cat]) {
        categoryDemandMap[cat] = {
          _id: cat,
          quantitySold: 0,
          revenue: 0,
          orderValues: [],
        };
      }
      categoryDemandMap[cat].quantitySold += qty;
      categoryDemandMap[cat].revenue += qty * price;
      categoryDemandMap[cat].orderValues.push(o.totalPrice || 0);
    }
  }

  const productDemand = Object.values(productDemandMap)
    .sort((a, b) => b.quantitySold - a.quantitySold)
    .slice(0, 20)
    .map((p) => ({
      ...p,
      avgPrice: p.orderCount ? p.totalPriceSum / p.orderCount : 0,
    }));

  const categoryDemand = Object.values(categoryDemandMap)
    .sort((a, b) => b.revenue - a.revenue)
    .map((c) => ({
      _id: c._id,
      quantitySold: c.quantitySold,
      revenue: c.revenue,
      avgOrderValue:
        c.orderValues.length > 0
          ? c.orderValues.reduce((s, v) => s + v, 0) / c.orderValues.length
          : 0,
    }));

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

  const now = new Date();
  const startDate = new Date(now.getTime() - daysNum * 24 * 60 * 60 * 1000);

  const matchFilter = {
    orderStatus: { not: "Cancelled" },
    createdAt: { gte: startDate },
  };
  if (safeRestaurantId) matchFilter.restaurantId = safeRestaurantId;

  const orders = await prisma.order.findMany({
    where: matchFilter,
    select: {
      itemsPrice: true,
      totalPrice: true,
      deliveryFee: true,
      tipAmount: true,
      couponDiscount: true,
      restaurantPayout: true,
      restaurantCommission: true,
    },
  });

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
    avgOrderValue: orders.length ? Number((totalRevenue / orders.length).toFixed(2)) : 0,
  });
});
