import asyncHandler from "express-async-handler";
import prisma from "../config/prisma.js";
import { sanitizeObjectId } from "../utils/sanitize.js";

// @desc    Get restaurant earnings summary
// @route   GET /api/v1/payouts/restaurant/:id
// @access  Admin / Restaurant Owner
export const getRestaurantEarnings = asyncHandler(async (req, res) => {
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

  const orders = await prisma.order.findMany({
    where: {
      restaurantId: restaurant.id,
      isPaid: true,
      orderStatus: { not: "Cancelled" },
    },
    select: {
      payoutStatus: true,
      restaurantCommission: true,
      restaurantPayout: true,
      itemsPrice: true,
    },
  });

  const summaryMap = {
    pending: { count: 0, totalPayout: 0, totalCommission: 0 },
    paid: { count: 0, totalPayout: 0, totalCommission: 0 },
    processing: { count: 0, totalPayout: 0, totalCommission: 0 },
  };

  for (const o of orders) {
    const status = o.payoutStatus || "pending";
    if (!summaryMap[status]) {
      summaryMap[status] = { count: 0, totalPayout: 0, totalCommission: 0 };
    }
    summaryMap[status].count += 1;
    summaryMap[status].totalPayout += (o.restaurantPayout || 0);
    summaryMap[status].totalCommission += (o.restaurantCommission || 0);
  }

  const recentOrders = await prisma.order.findMany({
    where: {
      restaurantId: restaurant.id,
      payoutStatus: "pending",
      isPaid: true,
      orderStatus: { not: "Cancelled" },
    },
    select: {
      id: true,
      itemsPrice: true,
      restaurantCommission: true,
      restaurantPayout: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  res.json({
    restaurantId,
    summary: {
      pendingPayout: Math.round(summaryMap.pending.totalPayout || 0),
      pendingOrders: summaryMap.pending.count || 0,
      paidPayout: Math.round(summaryMap.paid.totalPayout || 0),
      paidOrders: summaryMap.paid.count || 0,
      processingPayout: Math.round(summaryMap.processing.totalPayout || 0),
      processingOrders: summaryMap.processing.count || 0,
      totalCommission: Math.round(
        (summaryMap.pending.totalCommission || 0) + (summaryMap.paid.totalCommission || 0)
      ),
    },
    recentOrders,
  });
});

// @desc    Request payout for pending orders
// @route   POST /api/v1/payouts/restaurant/:id/request
// @access  Admin / Restaurant Owner
export const requestPayout = asyncHandler(async (req, res) => {
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

  // Find pending orders eligible for payout (paid orders only)
  const pendingOrders = await prisma.order.findMany({
    where: {
      restaurantId: restaurant.id,
      payoutStatus: "pending",
      isPaid: true,
      orderStatus: { not: "Cancelled" },
    },
    select: { id: true, restaurantPayout: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });

  if (pendingOrders.length === 0) {
    return res.status(400).json({ message: "No pending orders available for payout" });
  }

  const totalPayout = pendingOrders.reduce((acc, o) => acc + (o.restaurantPayout || 0), 0);
  if (totalPayout <= 0) {
    return res.status(400).json({ message: "Payout amount must be greater than 0" });
  }

  const periodStart = pendingOrders[0].createdAt;
  const periodEnd = pendingOrders[pendingOrders.length - 1].createdAt;
  const orderIds = pendingOrders.map((o) => o.id);

  const payout = await prisma.$transaction(async (tx) => {
    // Atomically mark orders as processing
    await tx.order.updateMany({
      where: { id: { in: orderIds }, payoutStatus: "pending" },
      data: { payoutStatus: "processing" },
    });

    // Create payout record
    return tx.payout.create({
      data: {
        restaurantId: restaurant.id,
        ownerId: restaurant.ownerId,
        amount: totalPayout,
        orders: orderIds,
        periodStart,
        periodEnd,
        status: "pending",
      },
    });
  });

  res.status(201).json({
    message: "Payout request submitted",
    payoutId: payout.id,
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
  const status =
    typeof req.query.status === "string" &&
    ["pending", "processing", "paid", "failed", "cancelled"].includes(req.query.status)
      ? req.query.status
      : null;

  const filter = status ? { status } : {};
  const total = await prisma.payout.count({ where: filter });

  const payouts = await prisma.payout.findMany({
    where: filter,
    include: {
      restaurant: { select: { name: true } },
      owner: { select: { name: true, email: true } },
    },
    orderBy: { createdAt: "desc" },
    skip: (page - 1) * limit,
    take: limit,
  });

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

  const payout = await prisma.payout.findUnique({
    where: { id: payoutId },
  });
  if (!payout) return res.status(404).json({ message: "Payout not found" });

  if (payout.status === "paid") {
    return res.status(400).json({ message: "Payout already marked as paid" });
  }

  const updatedPayout = await prisma.$transaction(async (tx) => {
    const updated = await tx.payout.update({
      where: { id: payoutId },
      data: {
        status: "paid",
        paidAt: new Date(),
        utrNumber: utrNumber || payout.utrNumber,
        notes: notes || payout.notes,
      },
    });

    const ordersToUpdate = Array.isArray(payout.orders) ? payout.orders : [];
    if (ordersToUpdate.length > 0) {
      await tx.order.updateMany({
        where: { id: { in: ordersToUpdate } },
        data: { payoutStatus: "paid", paidOutAt: new Date() },
      });
    }

    return updated;
  });

  res.json({ message: "Payout marked as paid", payoutId: updatedPayout.id });
});
