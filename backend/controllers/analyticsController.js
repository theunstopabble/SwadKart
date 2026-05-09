import asyncHandler from "express-async-handler";
import mongoose from "mongoose";
import Order from "../models/orderModel.js";
import Restaurant from "../models/restaurantModel.js";
import Product from "../models/productModel.js";
import User from "../models/userModel.js";
import { sanitizeObjectId } from "../utils/sanitize.js";

// @desc    Calculate and store restaurant performance score
// @route   POST /api/v1/analytics/restaurant/:id/refresh
// @access  Admin / Restaurant Owner
export const refreshRestaurantScore = asyncHandler(async (req, res) => {
  const restaurantId = sanitizeObjectId(req.params.id);
  const restaurant = await Restaurant.findById(restaurantId);
  if (!restaurant) return res.status(404).json({ message: "Restaurant not found" });

  const isOwner = restaurant.owner && restaurant.owner.toString() === req.user._id.toString();
  const isAdmin = req.user.role === "admin";
  if (!isAdmin && !isOwner) {
    return res.status(401).json({ message: "Not authorized" });
  }

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  // Aggregate order metrics for this restaurant
  // 🛡️ FIX: deliveryTimeMinutes field does not exist on Order model.
  // Compute delivery time from deliveredAt - createdAt on-the-fly.
  const metricsAgg = await Order.aggregate([
    { $match: { "orderItems.restaurant": new mongoose.Types.ObjectId(restaurantId), createdAt: { $gte: thirtyDaysAgo } } },
    {
      $addFields: {
        deliveryTimeMinutes: {
          $cond: [
            { $and: ["$deliveredAt", "$createdAt"] },
            { $divide: [{ $subtract: ["$deliveredAt", "$createdAt"] }, 60000] },
            null,
          ],
        },
      },
    },
    {
      $group: {
        _id: null,
        totalOrders: { $sum: 1 },
        deliveredOrders: { $sum: { $cond: [{ $eq: ["$isDelivered", true] }, 1, 0] } },
        cancelledOrders: { $sum: { $cond: [{ $eq: ["$orderStatus", "Cancelled"] }, 1, 0] } },
        avgDeliveryMinutes: { $avg: "$deliveryTimeMinutes" },
        totalRevenue: { $sum: "$itemsPrice" },
      },
    },
  ]);

  const m = metricsAgg[0] || {
    totalOrders: 0,
    deliveredOrders: 0,
    cancelledOrders: 0,
    avgDeliveryMinutes: 0,
    totalRevenue: 0,
  };

  // Delivery Time Score (40%) — target 30 min = 100 pts, 60+ min = 0
  let deliveryTimeScore = 0;
  if (m.avgDeliveryMinutes > 0) {
    deliveryTimeScore = Math.max(0, Math.min(100, Math.round(100 - ((m.avgDeliveryMinutes - 30) / 30) * 100)));
    if (deliveryTimeScore < 0) deliveryTimeScore = 0;
  }

  // Rating Score (30%) — restaurant.rating out of 5
  const ratingScore = Math.round((restaurant.rating / 5) * 100);

  // Volume Score (20%) — tiered by monthly orders
  let volumeScore = 0;
  if (m.totalOrders >= 200) volumeScore = 100;
  else if (m.totalOrders >= 100) volumeScore = 80;
  else if (m.totalOrders >= 50) volumeScore = 60;
  else if (m.totalOrders >= 20) volumeScore = 40;
  else if (m.totalOrders >= 5) volumeScore = 20;

  // Cancellation Score (10%) — lower is better
  const cancellationRate = m.totalOrders > 0 ? (m.cancelledOrders / m.totalOrders) : 0;
  const cancellationScore = Math.max(0, Math.round(100 - cancellationRate * 100));

  // Weighted total
  const performanceScore = Math.round(
    deliveryTimeScore * 0.4 +
    ratingScore * 0.3 +
    volumeScore * 0.2 +
    cancellationScore * 0.1,
  );

  restaurant.performanceScore = performanceScore;
  restaurant.scoreMetrics = {
    deliveryTimeScore,
    ratingScore,
    volumeScore,
    cancellationScore,
    lastCalculatedAt: new Date(),
  };
  await restaurant.save();

  res.json({
    restaurantId,
    performanceScore,
    metrics: restaurant.scoreMetrics,
    summary: {
      totalOrders: m.totalOrders,
      deliveredOrders: m.deliveredOrders,
      cancelledOrders: m.cancelledOrders,
      avgDeliveryMinutes: Math.round(m.avgDeliveryMinutes || 0),
      totalRevenue: Math.round(m.totalRevenue || 0),
    },
  });
});

// @desc    Get restaurant performance score
// @route   GET /api/v1/analytics/restaurant/:id/performance
// @access  Admin / Restaurant Owner / Public (score only)
export const getRestaurantPerformance = asyncHandler(async (req, res) => {
  const restaurantId = sanitizeObjectId(req.params.id);
  const restaurant = await Restaurant.findById(restaurantId).select("name performanceScore scoreMetrics rating numReviews");
  if (!restaurant) return res.status(404).json({ message: "Restaurant not found" });

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
  const restaurants = await Restaurant.find({ isActive: true })
    .select("name image performanceScore rating numReviews address")
    .sort({ performanceScore: -1 })
    .limit(50);

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

  const [todayRevenue, weekRevenue, monthRevenue, totalRevenue] = await Promise.all([
    Order.aggregate([{ $match: { isPaid: true, createdAt: { $gte: todayStart } } }, { $group: { _id: null, total: { $sum: "$totalPrice" } } }]),
    Order.aggregate([{ $match: { isPaid: true, createdAt: { $gte: weekStart } } }, { $group: { _id: null, total: { $sum: "$totalPrice" } } }]),
    Order.aggregate([{ $match: { isPaid: true, createdAt: { $gte: monthStart } } }, { $group: { _id: null, total: { $sum: "$totalPrice" } } }]),
    Order.aggregate([{ $match: { isPaid: true } }, { $group: { _id: null, total: { $sum: "$totalPrice" } } }]),
  ]);

  const [todayOrders, weekOrders, monthOrders, totalOrders, pendingOrders, deliveredOrders, cancelledOrders] = await Promise.all([
    Order.countDocuments({ createdAt: { $gte: todayStart } }),
    Order.countDocuments({ createdAt: { $gte: weekStart } }),
    Order.countDocuments({ createdAt: { $gte: monthStart } }),
    Order.countDocuments(),
    Order.countDocuments({ isDelivered: false, orderStatus: { $ne: "Cancelled" } }),
    Order.countDocuments({ isDelivered: true }),
    Order.countDocuments({ orderStatus: "Cancelled" }),
  ]);

  const [totalUsers, newUsersThisMonth, totalRestaurants, activeProducts] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ createdAt: { $gte: monthStart } }),
    Restaurant.countDocuments(),
    Product.countDocuments({ isAvailable: true }),
  ]);

  res.json({
    revenue: {
      today: todayRevenue[0]?.total || 0,
      thisWeek: weekRevenue[0]?.total || 0,
      thisMonth: monthRevenue[0]?.total || 0,
      allTime: totalRevenue[0]?.total || 0,
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

  const trends = await Order.aggregate([
    { $match: { createdAt: { $gte: startDate } } },
    {
      $group: {
        _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
        revenue: { $sum: "$totalPrice" },
        orders: { $sum: 1 },
        avgOrderValue: { $avg: "$totalPrice" },
      },
    },
    { $sort: { _id: 1 } },
    {
      $project: {
        _id: 0,
        date: "$_id",
        revenue: { $round: ["$revenue", 2] },
        orders: 1,
        avgOrderValue: { $round: ["$avgOrderValue", 2] },
      },
    },
  ]);

  res.json({ days, trends });
});

// @desc    Top performing restaurants
// @route   GET /api/v1/analytics/admin/top-restaurants
// @access  Admin
export const getTopRestaurants = asyncHandler(async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 10, 100);
  const days = Math.min(parseInt(req.query.days) || 30, 365);
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const top = await Order.aggregate([
    { $match: { createdAt: { $gte: startDate }, isPaid: true } },
    { $unwind: "$orderItems" },
    {
      $group: {
        _id: "$orderItems.restaurant",
        revenue: { $sum: { $multiply: ["$orderItems.qty", "$orderItems.price"] } },
        orders: { $sum: "$orderItems.qty" },
        avgOrderValue: { $avg: { $multiply: ["$orderItems.qty", "$orderItems.price"] } },
      },
    },
    { $sort: { revenue: -1 } },
    { $limit: limit },
    {
      $lookup: {
        from: "restaurants",
        localField: "_id",
        foreignField: "_id",
        as: "restaurantInfo",
      },
    },
    { $unwind: "$restaurantInfo" },
    {
      $project: {
        _id: 0,
        restaurantId: "$_id",
        name: "$restaurantInfo.name",
        image: "$restaurantInfo.image",
        revenue: { $round: ["$revenue", 2] },
        orders: 1,
        avgOrderValue: { $round: ["$avgOrderValue", 2] },
      },
    },
  ]);

  res.json({ days, top });
});

// @desc    Top selling products
// @route   GET /api/v1/analytics/admin/top-products
// @access  Admin
export const getTopProducts = asyncHandler(async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 10, 100);
  const days = Math.min(parseInt(req.query.days) || 30, 365);
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const top = await Order.aggregate([
    { $match: { createdAt: { $gte: startDate }, isPaid: true } },
    { $unwind: "$orderItems" },
    {
      $group: {
        _id: "$orderItems.product",
        name: { $first: "$orderItems.name" },
        qtySold: { $sum: "$orderItems.qty" },
        revenue: { $sum: { $multiply: ["$orderItems.qty", "$orderItems.price"] } },
      },
    },
    { $sort: { qtySold: -1 } },
    { $limit: limit },
    {
      $lookup: {
        from: "products",
        localField: "_id",
        foreignField: "_id",
        as: "productInfo",
      },
    },
    { $unwind: { path: "$productInfo", preserveNullAndEmptyArrays: true } },
    {
      $project: {
        _id: 0,
        productId: "$_id",
        name: 1,
        qtySold: 1,
        revenue: { $round: ["$revenue", 2] },
        image: "$productInfo.image",
      },
    },
  ]);

  res.json({ days, top });
});

// ============================================================
// FEAT-26: AI Dish Recommendations (Order-History Based)
// ============================================================

// @desc    Get personalized dish recommendations based on order history
// @route   GET /api/v1/analytics/recommendations
// @access  Private
export const getRecommendations = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const limit = Math.min(parseInt(req.query.limit) || 8, 50);

  // 1. Fetch user's past ordered products
  const userOrders = await Order.find({ user: userId, isPaid: true })
    .select("orderItems")
    .sort({ createdAt: -1 })
    .limit(20)
    .lean();

  const orderedProductIds = new Set();
  const categoryFrequency = {};
  userOrders.forEach((order) => {
    order.orderItems.forEach((item) => {
      orderedProductIds.add(item.product?.toString());
      // Category tracking would need product lookup; simplified here
    });
  });

  // 2. Fetch top-selling products globally (trending) excluding already ordered
  const trending = await Order.aggregate([
    { $match: { isPaid: true, createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } } },
    { $unwind: "$orderItems" },
    {
      $group: {
        _id: "$orderItems.product",
        name: { $first: "$orderItems.name" },
        orderCount: { $sum: 1 },
      },
    },
    { $sort: { orderCount: -1 } },
    { $limit: limit * 2 },
    {
      $lookup: {
        from: "products",
        localField: "_id",
        foreignField: "_id",
        as: "productInfo",
      },
    },
    { $unwind: { path: "$productInfo", preserveNullAndEmptyArrays: true } },
    {
      $match: {
        "productInfo.isAvailable": true,
        _id: { $nin: Array.from(orderedProductIds).map((id) => new mongoose.Types.ObjectId(id)) },
      },
    },
    {
      $project: {
        _id: 0,
        productId: "$_id",
        name: 1,
        image: "$productInfo.image",
        price: "$productInfo.price",
        category: "$productInfo.category",
        isVeg: "$productInfo.isVeg",
        restaurant: "$productInfo.restaurant",
        score: "$orderCount",
        reason: "Trending now 🔥",
      },
    },
    { $limit: limit },
  ]);

  // 3. If user has few orders, blend with "frequently bought together" logic
  // For now, return trending as recommendations
  res.json({
    basedOn: "order_history",
    totalPastOrders: userOrders.length,
    recommendations: trending,
  });
});
