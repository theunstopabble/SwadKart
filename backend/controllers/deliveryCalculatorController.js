import asyncHandler from "express-async-handler";
import mongoose from "mongoose";
import Order from "../models/orderModel.js";
import { calculateSurgeMultiplier } from "./surgePricingController.js";

export const calculateDeliveryFee = asyncHandler(async (req, res) => {
  const { distanceKm, isSurgeActive, hasSwadPass, orderSubtotal, baseFee = 40 } = req.body;

  if (distanceKm === undefined || distanceKm < 0) {
    res.status(400);
    throw new Error("Valid distance in km is required");
  }

  const freeDeliveryThreshold = 500;
  const maxDeliveryFee = 120;
  const surgeMultiplier = isSurgeActive ? (await calculateSurgeMultiplier()).multiplier : 1;

  let deliveryFee = 0;

  if (hasSwadPass) {
    deliveryFee = 0;
  } else if (orderSubtotal >= freeDeliveryThreshold) {
    deliveryFee = 0;
  } else {
    const distanceFee = Math.min(distanceKm * 8, 50);
    const baseWithDistance = baseFee + distanceFee;
    deliveryFee = Math.min(baseWithDistance * surgeMultiplier, maxDeliveryFee);
  }

  const surgeAmount = hasSwadPass || orderSubtotal >= freeDeliveryThreshold ? 0 : deliveryFee * (surgeMultiplier - 1);

  res.json({
    distanceKm: Number(distanceKm),
    baseFee,
    distanceSurcharge: Number((Math.min(distanceKm * 8, 50)).toFixed(2)),
    surgeMultiplier,
    surgeAmount: Number(surgeAmount.toFixed(2)),
    totalDeliveryFee: Number(deliveryFee.toFixed(2)),
    freeDelivery: hasSwadPass || orderSubtotal >= freeDeliveryThreshold,
    hasSwadPass,
    orderSubtotal,
    freeDeliveryThreshold,
  });
});

export const calculateDeliveryRoute = asyncHandler(async (req, res) => {
  const { pickupLat, pickupLng, dropLat, dropLng, vehicleType = "scooter" } = req.body;

  if (!pickupLat || !pickupLng || !dropLat || !dropLng) {
    res.status(400);
    throw new Error("Pickup and drop coordinates are required");
  }

  const pLat = Number(pickupLat);
  const pLng = Number(pickupLng);
  const dLat = Number(dropLat);
  const dLng = Number(dropLng);

  if (!Number.isFinite(pLat) || Math.abs(pLat) > 90 || !Number.isFinite(pLng) || Math.abs(pLng) > 180 ||
      !Number.isFinite(dLat) || Math.abs(dLat) > 90 || !Number.isFinite(dLng) || Math.abs(dLng) > 180) {
    res.status(400);
    throw new Error("Valid numeric coordinates required (lat: -90 to 90, lng: -180 to 180)");
  }

  const toRadians = (deg) => (deg * Math.PI) / 180;
  const R = 6371;
  const dLatR = toRadians(dLat - pLat);
  const dLngR = toRadians(dLng - pLng);
  const a =
    Math.sin(dLatR / 2) * Math.sin(dLatR / 2) +
    Math.cos(toRadians(pLat)) * Math.cos(toRadians(dLat)) * Math.sin(dLngR / 2) * Math.sin(dLngR / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distanceKm = Number((R * c).toFixed(2));

  const speedKmh = vehicleType === "bicycle" ? 15 : vehicleType === "scooter" ? 30 : 45;
  const travelMinutes = Math.round((distanceKm / speedKmh) * 60);

  const rates = {
    bicycle: { perKm: 3, base: 10, perMinute: 0.5 },
    scooter: { perKm: 5, base: 15, perMinute: 1 },
    bike: { perKm: 6, base: 20, perMinute: 1.5 },
  };
  const rate = rates[vehicleType] || rates.scooter;

  const baseFee = rate.base;
  const distanceFee = distanceKm * rate.perKm;
  const timeFee = travelMinutes * rate.perMinute;
  const totalFee = Number((baseFee + distanceFee + timeFee).toFixed(2));

  const etaMinutes = travelMinutes + 5;
  const estimatedArrival = new Date(Date.now() + etaMinutes * 60000).toISOString();

  res.json({
    distanceKm,
    estimatedTravelMinutes: travelMinutes,
    vehicleType,
    feeBreakdown: {
      baseFee,
      distanceFee: Number(distanceFee.toFixed(2)),
      timeFee: Number(timeFee.toFixed(2)),
    },
    totalFee,
    estimatedArrival,
    etaMinutes,
  });
});

export const getDeliveryEarningsProjection = asyncHandler(async (req, res) => {
  let driverId = req.query.driverId;
  if (driverId && !mongoose.Types.ObjectId.isValid(driverId)) {
    return res.status(400).json({ message: "Invalid driverId" });
  }
  driverId = driverId && mongoose.Types.ObjectId.isValid(driverId) ? driverId : null;

  // 🛡️ Delivery partners can only view their own earnings
  if (req.user.role === "delivery_partner") {
    driverId = req.user._id.toString();
  }

  const matchFilter = driverId ? { deliveryPartner: driverId } : { deliveryPartner: { $exists: true } };
  const orders = await Order.find({
    ...matchFilter,
    orderStatus: { $in: ["Delivered", "Out for Delivery"] },
  })
    .select("deliveryFee distanceKm createdAt deliveryPartner")
    .sort({ createdAt: -1 })
    .limit(100)
    .lean();

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const recentOrders = orders.filter((o) => new Date(o.createdAt) >= thirtyDaysAgo);

  const avgDeliveryFee = recentOrders.length
    ? recentOrders.reduce((s, o) => s + (o.deliveryFee || 0), 0) / recentOrders.length
    : 0;
  const avgDistance = recentOrders.length
    ? recentOrders.reduce((s, o) => s + (o.distanceKm || 0), 0) / recentOrders.length
    : 0;
  const ordersPerDay = recentOrders.length / 30;
  const monthlyProjection = Number((ordersPerDay * 30 * avgDeliveryFee).toFixed(2));
  const weeklyProjection = Number((ordersPerDay * 7 * avgDeliveryFee).toFixed(2));

  const earningsByDay = {};
  recentOrders.forEach((o) => {
    const day = new Date(o.createdAt).toISOString().split("T")[0];
    if (!earningsByDay[day]) earningsByDay[day] = { orders: 0, earnings: 0, distance: 0 };
    earningsByDay[day].orders += 1;
    earningsByDay[day].earnings += o.deliveryFee || 0;
    earningsByDay[day].distance += o.distanceKm || 0;
  });

  res.json({
    totalRecentOrders: recentOrders.length,
    avgDeliveryFee: Number(avgDeliveryFee.toFixed(2)),
    avgDistanceKm: Number(avgDistance.toFixed(2)),
    ordersPerDay: Number(ordersPerDay.toFixed(2)),
    weeklyProjection,
    monthlyProjection,
    earningsByDay: Object.entries(earningsByDay)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, data]) => ({ date, ...data })),
  });
});