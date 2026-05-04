import asyncHandler from "express-async-handler";
import mongoose from "mongoose";
import Order from "../models/orderModel.js";
import Restaurant from "../models/restaurantModel.js";
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
  const metricsAgg = await Order.aggregate([
    { $match: { restaurant: new mongoose.Types.ObjectId(restaurantId), createdAt: { $gte: thirtyDaysAgo } } },
    {
      $group: {
        _id: null,
        totalOrders: { $sum: 1 },
        deliveredOrders: { $sum: { $cond: [{ $eq: ["$isDelivered", true] }, 1, 0] } },
        cancelledOrders: { $sum: { $cond: [{ $eq: ["$status", "cancelled"] }, 1, 0] } },
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
