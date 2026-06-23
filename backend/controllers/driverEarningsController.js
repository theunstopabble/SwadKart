import asyncHandler from "express-async-handler";
import User from "../models/userModel.js";
import Order from "../models/orderModel.js";
import Restaurant from "../models/restaurantModel.js";

export const calculateDriverEarnings = asyncHandler(async (req, res) => {
  const { distanceKm, orderValue, isPeakHour, isSurgeActive, vehicleType = "scooter", promotions = [] } = req.body;

  const baseEarnings = {
    bicycle: { perKm: 3, base: 10, perMinute: 0.5 },
    scooter: { perKm: 5, base: 15, perMinute: 1 },
    bike: { perKm: 6, base: 20, perMinute: 1.5 },
  };

  const rate = baseEarnings[vehicleType] || baseEarnings.scooter;

  const base = rate.base;
  const distancePay = distanceKm * rate.perKm;
  const distancePayAmount = Number(distancePay.toFixed(2));

  const tipShare = orderValue > 0 ? Math.min(orderValue * 0.05, 30) : 0;
  const surgeBonus = isSurgeActive ? Number((base + distancePayAmount) * 0.2) : 0;
  const peakBonus = isPeakHour ? 20 : 0;

  const promoBonus = promotions.reduce((sum, p) => {
    if (p.type === "flat") return sum + p.amount;
    if (p.type === "percent") return sum + (base * p.amount / 100);
    return sum;
  }, 0);

  const subtotal = base + distancePayAmount + surgeBonus + peakBonus + promoBonus;
  const platformCut = Number((subtotal * 0.10).toFixed(2));
  const netEarnings = Number((subtotal - platformCut).toFixed(2));

  res.json({
    vehicleType,
    distanceKm,
    orderValue,
    breakdown: {
      base,
      distancePay: distancePayAmount,
      tipShare: Number(tipShare.toFixed(2)),
      surgeBonus: Number(surgeBonus.toFixed(2)),
      peakHourBonus: peakBonus,
      promotionBonus: Number(promoBonus.toFixed(2)),
      subtotal: Number(subtotal.toFixed(2)),
    },
    platformCut,
    grossEarnings: Number(subtotal.toFixed(2)),
    netEarnings,
    effectiveRatePerKm: Number((netEarnings / distanceKm).toFixed(2)),
  });
});

export const getDriverPayoutHistory = asyncHandler(async (req, res) => {
  const driverId = req.user.role === "delivery_partner" ? req.user._id : req.query.driverId;

  if (!driverId) {
    res.status(400);
    throw new Error("Driver ID is required");
  }

  const payoutRecords = await (await import("../models/payoutModel.js")).default
    .find({ user: driverId })
    .sort({ createdAt: -1 })
    .limit(30)
    .lean();

  const orders = await Order.find({
    deliveryPartner: driverId,
    orderStatus: { $in: ["Delivered", "Out for Delivery"] },
  })
    .select("deliveryFee distanceKm totalPrice createdAt orderStatus tipAmount")
    .sort({ createdAt: -1 })
    .limit(100)
    .lean();

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const recentOrders = orders.filter((o) => new Date(o.createdAt) >= thirtyDaysAgo);

  const totalDeliveries = recentOrders.length;
  const totalEarnings = recentOrders.reduce((s, o) => s + (o.deliveryFee || 0), 0);
  const totalDistance = recentOrders.reduce((s, o) => s + (o.distanceKm || 0), 0);
  const totalTips = recentOrders.reduce((s, o) => s + (o.tipAmount || 0), 0);
  const avgRating = 4.5;

  const daysWorked = new Set(recentOrders.map((o) => new Date(o.createdAt).toISOString().split("T")[0])).size;

  res.json({
    driverId,
    payoutHistory: payoutRecords.map((p) => ({
      id: p._id,
      amount: p.amount,
      status: p.status,
      period: p.period,
      createdAt: p.createdAt,
    })),
    last30Days: {
      daysWorked,
      totalDeliveries,
      totalEarnings: Number(totalEarnings.toFixed(2)),
      totalDistance: Number(totalDistance.toFixed(2)),
      totalTips: Number(totalTips.toFixed(2)),
      avgEarningsPerDay: daysWorked > 0 ? Number((totalEarnings / daysWorked).toFixed(2)) : 0,
      avgRating,
    },
  });
});

export const getDriverIncentives = asyncHandler(async (req, res) => {
  const { driverId } = req.query;
  const targetId = driverId || req.user?._id;

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const orders = await Order.find({
    deliveryPartner: targetId,
    orderStatus: "Delivered",
    createdAt: { $gte: thirtyDaysAgo },
  }).select("deliveryFee createdAt distanceKm").lean();

  const deliveredCount = orders.length;
  const totalEarnings = orders.reduce((s, o) => s + (o.deliveryFee || 0), 0);
  const totalDistance = orders.reduce((s, o) => s + (o.distanceKm || 0), 0);

  const incentiveTiers = [
    { deliveries: 30, bonus: 500, label: "30 deliveries" },
    { deliveries: 50, bonus: 1000, label: "50 deliveries" },
    { deliveries: 100, bonus: 2500, label: "100 deliveries" },
    { deliveries: 200, bonus: 6000, label: "200 deliveries" },
  ];

  const achieved = incentiveTiers.filter((t) => deliveredCount >= t.deliveries);
  const nextMilestone = incentiveTiers.find((t) => deliveredCount < t.deliveries);

  const weeklyTarget = { deliveries: 25, bonus: 750 };
  const weeklyProgress = Math.min(deliveredCount % 25, 25);
  const weeklyAchieved = deliveredCount >= weeklyTarget.deliveries;

  res.json({
    driverId: targetId,
    last30Days: {
      deliveries: deliveredCount,
      totalEarnings: Number(totalEarnings.toFixed(2)),
      totalDistance: Number(totalDistance.toFixed(2)),
    },
    incentiveTiers: incentiveTiers.map((t) => ({
      ...t,
      achieved: deliveredCount >= t.deliveries,
    })),
    nextMilestone: nextMilestone
      ? { ...nextMilestone, remaining: nextMilestone.deliveries - deliveredCount }
      : null,
    weeklyTarget,
    weeklyProgress,
    weeklyAchieved,
  });
});