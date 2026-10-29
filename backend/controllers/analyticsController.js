import asyncHandler from "express-async-handler";
import prisma from "../config/prisma.js";
import { sanitizeObjectId } from "../utils/sanitize.js";

// @desc    Calculate and store restaurant performance score
// @route   POST /api/v1/analytics/restaurant/:id/refresh
// @access  Admin / Restaurant Owner
export const refreshRestaurantScore = asyncHandler(async (req, res) => {
  const currentUserId = req.user.id || req.user._id;
  const restaurantId = sanitizeObjectId(req.params.id);
  const restaurant = await prisma.restaurant.findUnique({
    where: { id: restaurantId },
  });
  if (!restaurant) return res.status(404).json({ message: "Restaurant not found" });

  const isOwner = restaurant.ownerId && restaurant.ownerId.toString() === currentUserId.toString();
  const isAdmin = req.user.role === "admin";
  if (!isAdmin && !isOwner) {
    return res.status(401).json({ message: "Not authorized" });
  }

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  // Aggregate order metrics for this restaurant
  const orders = await prisma.order.findMany({
    where: {
      restaurantId: restaurant.id,
      createdAt: { gte: thirtyDaysAgo },
    },
    select: {
      isDelivered: true,
      orderStatus: true,
      deliveredAt: true,
      createdAt: true,
      itemsPrice: true,
    },
  });

  const totalOrders = orders.length;
  let deliveredOrders = 0;
  let cancelledOrders = 0;
  let totalRevenue = 0;
  let totalDeliveryMinutes = 0;
  let deliveryTimeCount = 0;

  for (const o of orders) {
    if (o.isDelivered) deliveredOrders += 1;
    if (o.orderStatus === "Cancelled") cancelledOrders += 1;
    totalRevenue += (o.itemsPrice || 0);

    if (o.deliveredAt && o.createdAt) {
      const diffMs = new Date(o.deliveredAt).getTime() - new Date(o.createdAt).getTime();
      const diffMin = diffMs / 60000;
      if (diffMin > 0) {
        totalDeliveryMinutes += diffMin;
        deliveryTimeCount += 1;
      }
    }
  }

  const avgDeliveryMinutes = deliveryTimeCount > 0 ? totalDeliveryMinutes / deliveryTimeCount : 0;

  // Delivery Time Score (40%) — target 30 min = 100 pts, 60+ min = 0
  let deliveryTimeScore = 0;
  if (avgDeliveryMinutes > 0) {
    deliveryTimeScore = Math.max(0, Math.min(100, Math.round(100 - ((avgDeliveryMinutes - 30) / 30) * 100)));
  }

  // Rating Score (30%) — restaurant.rating out of 5
  const ratingScore = Math.round((restaurant.rating / 5) * 100);

  // Volume Score (20%) — tiered by monthly orders
  let volumeScore = 0;
  if (totalOrders >= 200) volumeScore = 100;
  else if (totalOrders >= 100) volumeScore = 80;
  else if (totalOrders >= 50) volumeScore = 60;
  else if (totalOrders >= 20) volumeScore = 40;
  else if (totalOrders >= 5) volumeScore = 20;

  // Cancellation Score (10%) — lower is better
  const cancellationRate = totalOrders > 0 ? cancelledOrders / totalOrders : 0;
  const cancellationScore = Math.max(0, Math.round(100 - cancellationRate * 100));

  // Weighted total
  const performanceScore = Math.round(
    deliveryTimeScore * 0.4 +
    ratingScore * 0.3 +
    volumeScore * 0.2 +
    cancellationScore * 0.1
  );

  const scoreMetrics = {
    deliveryTimeScore,
    ratingScore,
    volumeScore,
    cancellationScore,
    lastCalculatedAt: new Date(),
  };

  await prisma.restaurant.update({
    where: { id: restaurant.id },
    data: {
      performanceScore,
      scoreMetrics,
    },
  });

  res.json({
    restaurantId,
    performanceScore,
    metrics: scoreMetrics,
    summary: {
      totalOrders,
      deliveredOrders,
      cancelledOrders,
      avgDeliveryMinutes: Math.round(avgDeliveryMinutes),
      totalRevenue: Math.round(totalRevenue),
    },
  });
});

// @desc    Get restaurant performance score
// @route   GET /api/v1/analytics/restaurant/:id/performance
// @access  Admin / Restaurant Owner / Public (score only)
export const getRestaurantPerformance = asyncHandler(async (req, res) => {
  const currentUserId = req.user?.id || req.user?._id;
  const restaurantId = sanitizeObjectId(req.params.id);
  const restaurant = await prisma.restaurant.findUnique({
    where: { id: restaurantId },
    select: {
      name: true,
      performanceScore: true,
      scoreMetrics: true,
      rating: true,
      numReviews: true,
      ownerId: true,
    },
  });
  if (!restaurant) return res.status(404).json({ message: "Restaurant not found" });

  if (
    req.user?.role === "restaurant_owner" &&
    restaurant.ownerId?.toString() !== currentUserId.toString()
  ) {
    return res
      .status(403)
      .json({ message: "Not authorized to view this restaurant's performance" });
  }

  res.json({
    restaurantId,
    name: restaurant.name,
    performanceScore: restaurant.performanceScore,
    scoreMetrics: restaurant.scoreMetrics,
    rating: restaurant.rating,
    numReviews: restaurant.numReviews,
  });
});

// @desc    List all restaurants ranked by performance score
// @route   GET /api/v1/analytics/leaderboard
// @access  Public
export const getLeaderboard = asyncHandler(async (req, res) => {
  const restaurants = await prisma.restaurant.findMany({
    where: { isActive: true },
    select: {
      id: true,
      name: true,
      image: true,
      performanceScore: true,
      rating: true,
      numReviews: true,
      address: true,
    },
    orderBy: { performanceScore: "desc" },
    take: 50,
  });

  res.json({ count: restaurants.length, restaurants });
});

// ============================================================
// FEAT-24: Advanced Admin Analytics Dashboard
// ============================================================

// @desc    Get admin dashboard summary metrics
// @route   GET /api/v1/analytics/admin/summary
// @access  Admin
export const getAdminSummary = asyncHandler(async (req, res) => {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [todayRevAgg, weekRevAgg, monthRevAgg, totalRevAgg] = await Promise.all([
    prisma.order.aggregate({
      where: { isPaid: true, createdAt: { gte: todayStart } },
      _sum: { totalPrice: true },
    }),
    prisma.order.aggregate({
      where: { isPaid: true, createdAt: { gte: weekStart } },
      _sum: { totalPrice: true },
    }),
    prisma.order.aggregate({
      where: { isPaid: true, createdAt: { gte: monthStart } },
      _sum: { totalPrice: true },
    }),
    prisma.order.aggregate({
      where: { isPaid: true },
      _sum: { totalPrice: true },
    }),
  ]);

  const [todayOrders, weekOrders, monthOrders, totalOrders, pendingOrders, deliveredOrders, cancelledOrders] =
    await Promise.all([
      prisma.order.count({ where: { createdAt: { gte: todayStart } } }),
      prisma.order.count({ where: { createdAt: { gte: weekStart } } }),
      prisma.order.count({ where: { createdAt: { gte: monthStart } } }),
      prisma.order.count(),
      prisma.order.count({ where: { isDelivered: false, orderStatus: { not: "Cancelled" } } }),
      prisma.order.count({ where: { isDelivered: true } }),
      prisma.order.count({ where: { orderStatus: "Cancelled" } }),
    ]);

  const [totalUsers, newUsersThisMonth, totalRestaurants, activeProducts] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { createdAt: { gte: monthStart } } }),
    prisma.restaurant.count(),
    prisma.product.count({ where: { isAvailable: true } }),
  ]);

  res.json({
    revenue: {
      today: todayRevAgg._sum.totalPrice || 0,
      thisWeek: weekRevAgg._sum.totalPrice || 0,
      thisMonth: monthRevAgg._sum.totalPrice || 0,
      allTime: totalRevAgg._sum.totalPrice || 0,
    },
    orders: {
      today: todayOrders,
      thisWeek: weekOrders,
      thisMonth: monthOrders,
      total: totalOrders,
      pending: pendingOrders,
      delivered: deliveredOrders,
      cancelled: cancelledOrders,
    },
    users: { total: totalUsers, newThisMonth: newUsersThisMonth },
    catalog: { restaurants: totalRestaurants, activeProducts },
  });
});

// @desc    Get daily revenue/order trend (last 30 days)
// @route   GET /api/v1/analytics/admin/trends
// @access  Admin
export const getDailyTrends = asyncHandler(async (req, res) => {
  const days = Math.min(parseInt(req.query.days) || 30, 365);
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const orders = await prisma.order.findMany({
    where: { createdAt: { gte: startDate } },
    select: { totalPrice: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });

  const dailyMap = {};
  for (const o of orders) {
    const dateStr = new Date(o.createdAt).toISOString().split("T")[0];
    if (!dailyMap[dateStr]) {
      dailyMap[dateStr] = { date: dateStr, revenue: 0, orders: 0, totalVal: 0 };
    }
    dailyMap[dateStr].revenue += (o.totalPrice || 0);
    dailyMap[dateStr].orders += 1;
    dailyMap[dateStr].totalVal += (o.totalPrice || 0);
  }

  const trends = Object.values(dailyMap).map((d) => ({
    date: d.date,
    revenue: Number(d.revenue.toFixed(2)),
    orders: d.orders,
    avgOrderValue: d.orders > 0 ? Number((d.totalVal / d.orders).toFixed(2)) : 0,
  }));

  res.json({ days, trends });
});

// @desc    Top performing restaurants
// @route   GET /api/v1/analytics/admin/top-restaurants
// @access  Admin
export const getTopRestaurants = asyncHandler(async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 10, 100);
  const days = Math.min(parseInt(req.query.days) || 30, 365);
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const orders = await prisma.order.findMany({
    where: {
      createdAt: { gte: startDate },
      isPaid: true,
    },
    select: { orderItems: true },
  });

  const restaurantMap = {};
  for (const o of orders) {
    const items = Array.isArray(o.orderItems) ? o.orderItems : [];
    for (const item of items) {
      const restId = (item.restaurant || item.restaurantId)?.toString();
      if (!restId) continue;
      if (!restaurantMap[restId]) {
        restaurantMap[restId] = { restaurantId: restId, revenue: 0, orders: 0 };
      }
      const itemRev = Number(item.qty || 1) * Number(item.price || 0);
      restaurantMap[restId].revenue += itemRev;
      restaurantMap[restId].orders += Number(item.qty || 1);
    }
  }

  const sortedRestaurants = Object.values(restaurantMap)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, limit);

  const restIds = sortedRestaurants.map((r) => r.restaurantId);
  const restaurants = await prisma.restaurant.findMany({
    where: { id: { in: restIds } },
    select: { id: true, name: true, image: true },
  });

  const restInfoMap = new Map(restaurants.map((r) => [r.id, r]));

  const top = sortedRestaurants.map((r) => {
    const info = restInfoMap.get(r.restaurantId);
    return {
      restaurantId: r.restaurantId,
      name: info?.name || "Unknown",
      image: info?.image || "",
      revenue: Number(r.revenue.toFixed(2)),
      orders: r.orders,
      avgOrderValue: r.orders > 0 ? Number((r.revenue / r.orders).toFixed(2)) : 0,
    };
  });

  res.json({ days, top });
});

// @desc    Top selling products
// @route   GET /api/v1/analytics/admin/top-products
// @access  Admin
export const getTopProducts = asyncHandler(async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 10, 100);
  const days = Math.min(parseInt(req.query.days) || 30, 365);
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const orders = await prisma.order.findMany({
    where: {
      createdAt: { gte: startDate },
      isPaid: true,
    },
    select: { orderItems: true },
  });

  const productMap = {};
  for (const o of orders) {
    const items = Array.isArray(o.orderItems) ? o.orderItems : [];
    for (const item of items) {
      const prodId = (item.product || item._id || item.id)?.toString();
      if (!prodId) continue;
      if (!productMap[prodId]) {
        productMap[prodId] = {
          productId: prodId,
          name: item.name || "Unknown",
          qtySold: 0,
          revenue: 0,
        };
      }
      const itemRev = Number(item.qty || 1) * Number(item.price || 0);
      productMap[prodId].qtySold += Number(item.qty || 1);
      productMap[prodId].revenue += itemRev;
    }
  }

  const sortedProducts = Object.values(productMap)
    .sort((a, b) => b.qtySold - a.qtySold)
    .slice(0, limit);

  const prodIds = sortedProducts.map((p) => p.productId);
  const products = await prisma.product.findMany({
    where: { id: { in: prodIds } },
    select: { id: true, image: true, name: true },
  });

  const prodInfoMap = new Map(products.map((p) => [p.id, p]));

  const top = sortedProducts.map((p) => {
    const info = prodInfoMap.get(p.productId);
    return {
      productId: p.productId,
      name: info?.name || p.name,
      qtySold: p.qtySold,
      revenue: Number(p.revenue.toFixed(2)),
      image: info?.image || "",
    };
  });

  res.json({ days, top });
});

// ============================================================
// FEAT-26: AI Dish Recommendations (Order-History Based)
// ============================================================

// @desc    Get personalized dish recommendations based on order history
// @route   GET /api/v1/analytics/recommendations
// @access  Private
export const getRecommendations = asyncHandler(async (req, res) => {
  const currentUserId = req.user.id || req.user._id;
  const limit = Math.min(parseInt(req.query.limit) || 8, 50);

  // 1. Fetch user's past ordered products
  const userOrders = await prisma.order.findMany({
    where: { userId: currentUserId, isPaid: true },
    select: { orderItems: true },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  const orderedProductIds = new Set();
  userOrders.forEach((order) => {
    const items = Array.isArray(order.orderItems) ? order.orderItems : [];
    items.forEach((item) => {
      const prodId = (item.product || item._id || item.id)?.toString();
      if (prodId) orderedProductIds.add(prodId);
    });
  });

  // 2. Fetch top-selling products globally (trending) excluding already ordered
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const globalOrders = await prisma.order.findMany({
    where: {
      isPaid: true,
      createdAt: { gte: thirtyDaysAgo },
    },
    select: { orderItems: true },
  });

  const globalProductDemand = {};
  for (const o of globalOrders) {
    const items = Array.isArray(o.orderItems) ? o.orderItems : [];
    for (const item of items) {
      const prodId = (item.product || item._id || item.id)?.toString();
      if (!prodId || orderedProductIds.has(prodId)) continue;
      globalProductDemand[prodId] = (globalProductDemand[prodId] || 0) + Number(item.qty || 1);
    }
  }

  const topDemandedIds = Object.entries(globalProductDemand)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([id]) => id);

  const products = await prisma.product.findMany({
    where: {
      id: { in: topDemandedIds },
      isAvailable: true,
    },
    select: {
      id: true,
      name: true,
      image: true,
      price: true,
      category: true,
      isVeg: true,
      restaurantId: true,
    },
  });

  const recommendations = products.map((p) => ({
    productId: p.id,
    name: p.name,
    image: p.image,
    price: p.price,
    category: p.category,
    isVeg: p.isVeg,
    restaurant: p.restaurantId,
    score: globalProductDemand[p.id] || 0,
    reason: "Trending now 🔥",
  }));

  res.json({
    basedOn: "order_history",
    totalPastOrders: userOrders.length,
    recommendations,
  });
});
