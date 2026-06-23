import asyncHandler from "express-async-handler";
import Order from "../models/orderModel.js";
import Payout from "../models/payoutModel.js";
import Restaurant from "../models/restaurantModel.js";
import { sanitizeObjectId } from "../utils/sanitize.js";

// @desc    Get restaurant earnings summary
// @route   GET /api/v1/payouts/restaurant/:id
// @access  Admin / Restaurant Owner
export const getRestaurantEarnings = asyncHandler(async (req, res) => {
  const restaurantId = sanitizeObjectId(req.params.id);
  const restaurant = await Restaurant.findById(restaurantId);
  if (!restaurant) return res.status(404).json({ message: "Restaurant not found" });

  const isOwner = restaurant.owner && restaurant.owner.toString() === req.user._id.toString();
  const isAdmin = req.user.role === "admin";
  if (!isAdmin && !isOwner) {
    return res.status(401).json({ message: "Not authorized" });
  }

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const summary = await Order.aggregate([
    {
      $match: {
        "orderItems.restaurant": restaurant._id,
        isPaid: true,
        orderStatus: { $nin: ["Cancelled"] },
      },
    },
    {
      $group: {
        _id: "$payoutStatus",
        count: { $sum: 1 },
        totalCommission: { $sum: "$restaurantCommission" },
        totalPayout: { $sum: "$restaurantPayout" },
        totalItemsPrice: { $sum: "$itemsPrice" },
      },
    },
  ]);

  const pending = summary.find((s) => s._id === "pending") || { count: 0, totalPayout: 0, totalCommission: 0 };
  const paid = summary.find((s) => s._id === "paid") || { count: 0, totalPayout: 0, totalCommission: 0 };
  const processing = summary.find((s) => s._id === "processing") || { count: 0, totalPayout: 0, totalCommission: 0 };

  const recentOrders = await Order.find({
    "orderItems.restaurant": restaurant._id,
    payoutStatus: "pending",
    isPaid: true,
    orderStatus: { $ne: "Cancelled" },
  })
    .select("_id itemsPrice restaurantCommission restaurantPayout createdAt")
    .sort({ createdAt: -1 })
    .limit(20);

  res.json({
    restaurantId,
    summary: {
      pendingPayout: Math.round(pending.totalPayout || 0),
      pendingOrders: pending.count || 0,
      paidPayout: Math.round(paid.totalPayout || 0),
      paidOrders: paid.count || 0,
      processingPayout: Math.round(processing.totalPayout || 0),
      processingOrders: processing.count || 0,
      totalCommission: Math.round((pending.totalCommission || 0) + (paid.totalCommission || 0)),
    },
    recentOrders,
  });
});

// @desc    Request payout for pending orders
// @route   POST /api/v1/payouts/restaurant/:id/request
// @access  Admin / Restaurant Owner
export const requestPayout = asyncHandler(async (req, res) => {
  const restaurantId = sanitizeObjectId(req.params.id);
  const restaurant = await Restaurant.findById(restaurantId);
  if (!restaurant) return res.status(404).json({ message: "Restaurant not found" });

  const isOwner = restaurant.owner && restaurant.owner.toString() === req.user._id.toString();
  const isAdmin = req.user.role === "admin";
  if (!isAdmin && !isOwner) {
    return res.status(401).json({ message: "Not authorized" });
  }

  // Find pending orders eligible for payout (paid orders only)
  const pendingOrders = await Order.find({
    "orderItems.restaurant": restaurant._id,
    payoutStatus: "pending",
    isPaid: true,
    orderStatus: { $ne: "Cancelled" },
  }).select("_id restaurantPayout createdAt");

  if (pendingOrders.length === 0) {
    return res.status(400).json({ message: "No pending orders available for payout" });
  }

  const totalPayout = pendingOrders.reduce((acc, o) => acc + (o.restaurantPayout || 0), 0);
  if (totalPayout <= 0) {
    return res.status(400).json({ message: "Payout amount must be greater than 0" });
  }

  const periodStart = pendingOrders[pendingOrders.length - 1].createdAt;
  const periodEnd = pendingOrders[0].createdAt;
  const orderIds = pendingOrders.map((o) => o._id);

  // Atomically mark orders as processing — only claim pending ones
  const markResult = await Order.updateMany(
    { _id: { $in: orderIds }, payoutStatus: "pending" },
    { payoutStatus: "processing" },
  );

  if (markResult.modifiedCount === 0) {
    return res.status(409).json({ message: "Payout already being processed" });
  }

  // Create payout record only after orders are claimed
  const payout = await Payout.create({
    restaurant: restaurantId,
    owner: restaurant.owner,
    amount: totalPayout,
    orders: orderIds,
    periodStart,
    periodEnd,
    status: "pending",
  });

  res.status(201).json({
    message: "Payout request submitted",
    payoutId: payout._id,
    amount: totalPayout,
    ordersIncluded: orderIds.length,
    period: { start: periodStart, end: periodEnd },
  });
});

// @desc    Admin: list all payout requests
// @route   GET /api/v1/payouts/admin/all
// @access  Admin
export const getAllPayouts = asyncHandler(async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(50, Number(req.query.limit) || 20);
  const status = (typeof req.query.status === "string" && ["pending", "processing", "paid", "failed", "cancelled"].includes(req.query.status)) ? req.query.status : null;

  const filter = status ? { status } : {};
  const total = await Payout.countDocuments(filter);

  const payouts = await Payout.find(filter)
    .populate("restaurant", "name")
    .populate("owner", "name email")
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit);

  res.json({
    payouts,
    page,
    pages: Math.ceil(total / limit),
    total,
  });
});

// @desc    Admin: mark payout as paid
// @route   PATCH /api/v1/payouts/admin/:id/pay
// @access  Admin
export const markPayoutPaid = asyncHandler(async (req, res) => {
  const payoutId = sanitizeObjectId(req.params.id);
  const { utrNumber, notes } = req.body || {};

  const payout = await Payout.findById(payoutId);
  if (!payout) return res.status(404).json({ message: "Payout not found" });

  if (payout.status === "paid") {
    return res.status(400).json({ message: "Payout already marked as paid" });
  }

  payout.status = "paid";
  payout.paidAt = new Date();
  payout.utrNumber = utrNumber || payout.utrNumber;
  payout.notes = notes || payout.notes;
  await payout.save();

  // Mark all included orders as paid
  await Order.updateMany(
    { _id: { $in: payout.orders } },
    { payoutStatus: "paid", paidOutAt: new Date() },
  );

  res.json({ message: "Payout marked as paid", payoutId: payout._id });
});
