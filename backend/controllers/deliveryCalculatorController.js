import asyncHandler from "express-async-handler";
import prisma from "../config/prisma.js";
import { sanitizeObjectId } from "../utils/sanitize.js";
import { calculateSurgeMultiplier } from "./surgePricingController.js";

export const calculateDeliveryFee = asyncHandler(async (req, res) => {
  const currentUserId = req.user?.id || req.user?._id;
  let { distanceKm, isSurgeActive, orderSubtotal, baseFee = 40, hasSwadPass } = req.body;

  if (hasSwadPass === undefined && currentUserId) {
    const user = await prisma.user.findUnique({
      where: { id: currentUserId },
      select: { hasSwadPass: true, swadPassExpiry: true },
    });
    hasSwadPass = !!(
      user?.hasSwadPass &&
      user?.swadPassExpiry &&
      new Date(user.swadPassExpiry) > new Date()
    );
  }

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

  const surgeAmount =
    hasSwadPass || orderSubtotal >= freeDeliveryThreshold ? 0 : deliveryFee * (surgeMultiplier - 1);

  res.json({
    distanceKm: Number(distanceKm),
    baseFee,
    distanceSurcharge: Number(Math.min(distanceKm * 8, 50).toFixed(2)),
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
  let { pickupLat, pickupLng, dropLat, dropLng, vehicleType = "scooter" } = req.body;

  const VALID_VEHICLES = ["bicycle", "scooter", "bike"];
  if (!VALID_VEHICLES.includes(vehicleType)) {
    res.status(400);
    throw new Error(`Invalid vehicleType. Must be one of: ${VALID_VEHICLES.join(", ")}`);
  }

  if (!pickupLat || !pickupLng || !dropLat || !dropLng) {
    res.status(400);
    throw new Error("Pickup and drop coordinates are required");
  }

  const pLat = Number(pickupLat);
  const pLng = Number(pickupLng);
  const dLat = Number(dropLat);
  const dLng = Number(dropLng);

  if (
    !Number.isFinite(pLat) ||
    Math.abs(pLat) > 90 ||
    !Number.isFinite(pLng) ||
    Math.abs(pLng) > 180 ||
    !Number.isFinite(dLat) ||
    Math.abs(dLat) > 90 ||
    !Number.isFinite(dLng) ||
    Math.abs(dLng) > 180
  ) {
    res.status(400);
    throw new Error("Valid numeric coordinates required (lat: -90 to 90, lng: -180 to 180)");
  }

  const toRadians = (deg) => (deg * Math.PI) / 180;
  const R = 6371;
  const dLatR = toRadians(dLat - pLat);
  const dLngR = toRadians(dLng - pLng);
  const a =
    Math.sin(dLatR / 2) * Math.sin(dLatR / 2) +
    Math.cos(toRadians(pLat)) *
      Math.cos(toRadians(dLat)) *
      Math.sin(dLngR / 2) *
      Math.sin(dLngR / 2);
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
  const currentUserId = req.user?.id || req.user?._id;
  let driverId = req.query.driverId;

  if (driverId) {
    try {
      driverId = sanitizeObjectId(driverId);
    } catch {
      return res.status(400).json({ message: "Invalid driverId" });
    }
  }

  // Delivery partners can only view their own earnings
  if (req.user?.role === "delivery_partner") {
    driverId = currentUserId.toString();
  }

  const matchFilter = driverId
    ? { deliveryPartnerId: driverId }
    : { deliveryPartnerId: { not: null } };

  const orders = await prisma.order.findMany({
    where: {
      ...matchFilter,
      orderStatus: { in: ["Delivered", "Out for Delivery"] },
    },
    select: {
      deliveryFee: true,
      shippingPrice: true,
      createdAt: true,
      deliveryPartnerId: true,
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const totalEarnings = orders.reduce((s, o) => s + (o.deliveryFee || 0), 0);
  const avgPerOrder = orders.length > 0 ? totalEarnings / orders.length : 0;

  res.json({
    driverId: driverId || "all",
    totalOrders: orders.length,
    totalEarnings: Number(totalEarnings.toFixed(2)),
    avgEarningsPerOrder: Number(avgPerOrder.toFixed(2)),
    projectedWeekly: Number((avgPerOrder * 35).toFixed(2)),
    projectedMonthly: Number((avgPerOrder * 150).toFixed(2)),
  });
});
