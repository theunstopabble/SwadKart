import asyncHandler from "express-async-handler";
import crypto from "crypto";
import QRCode from "qrcode";
import prisma from "../config/prisma.js";
import { sanitizeObjectId } from "../utils/sanitize.js";

// @desc    Create table reservation
// @route   POST /api/v1/reservations
// @access  Private
export const createReservation = asyncHandler(async (req, res) => {
  const currentUserId = req.user.id || req.user._id;
  const { restaurantId: rawRestaurantId, date, time, guests, specialRequests } = req.body;

  if (!rawRestaurantId || !date || !time || !guests) {
    res.status(400);
    throw new Error("Please provide restaurantId, date, time, and guests");
  }

  if (!/^([01]\d|2[0-3]):([0-5]\d)$/.test(time)) {
    res.status(400);
    throw new Error("Invalid time format. Use HH:MM (24-hour)");
  }

  const guestCount = Number(guests);
  if (!Number.isInteger(guestCount) || guestCount < 1 || guestCount > 20) {
    res.status(400);
    throw new Error("Guests must be an integer between 1 and 20");
  }

  const reservationDate = new Date(`${date}T${time}`);
  if (reservationDate <= new Date()) {
    res.status(400);
    throw new Error("Reservation must be in the future");
  }

  const restaurantId = sanitizeObjectId(rawRestaurantId);
  const restaurant = await prisma.restaurant.findUnique({
    where: { id: restaurantId },
  });
  if (!restaurant) {
    res.status(404);
    throw new Error("Restaurant not found");
  }

  // Check for conflicting reservations
  const targetDate = new Date(date);
  const existing = await prisma.reservation.findFirst({
    where: {
      restaurantId,
      date: targetDate,
      time,
      status: { in: ["pending", "confirmed"] },
    },
  });

  if (existing) {
    res.status(409);
    throw new Error("This time slot is already booked. Please choose another time.");
  }

  // Generate QR code with HMAC-signed payload
  const qrPayload = { r: restaurantId, d: date, t: time, g: guestCount, u: currentUserId.toString() };
  qrPayload.sig = crypto
    .createHmac("sha256", process.env.JWT_SECRET || "fallback_secret")
    .update(JSON.stringify(qrPayload))
    .digest("hex");
  const qrCodeDataUri = await QRCode.toDataURL(JSON.stringify(qrPayload), { width: 256, margin: 2 });

  const reservation = await prisma.reservation.create({
    data: {
      userId: currentUserId,
      restaurantId,
      date: targetDate,
      time,
      guests: guestCount,
      specialRequests: (specialRequests || "").replace(/<[^>]*>/g, "").trim(),
      qrCode: qrCodeDataUri,
    },
    include: {
      restaurant: {
        select: { id: true, name: true, image: true, address: true },
      },
    },
  });

  res.status(201).json(reservation);
});

// @desc    Get my reservations
// @route   GET /api/v1/reservations/my
// @access  Private
export const getMyReservations = asyncHandler(async (req, res) => {
  const currentUserId = req.user.id || req.user._id;
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(Math.max(1, parseInt(req.query.limit) || 20), 100);
  const skip = (page - 1) * limit;

  const reservations = await prisma.reservation.findMany({
    where: { userId: currentUserId },
    orderBy: [{ date: "desc" }, { time: "desc" }],
    skip,
    take: limit,
    include: {
      restaurant: {
        select: { id: true, name: true, image: true, address: true },
      },
    },
  });

  res.json(reservations);
});

// @desc    Cancel reservation
// @route   DELETE /api/v1/reservations/:id
// @access  Private
export const cancelReservation = asyncHandler(async (req, res) => {
  const currentUserId = req.user.id || req.user._id;
  const id = sanitizeObjectId(req.params.id);
  const reservation = await prisma.reservation.findFirst({
    where: {
      id,
      userId: currentUserId,
    },
  });

  if (!reservation) {
    res.status(404);
    throw new Error("Reservation not found");
  }

  if (reservation.status === "cancelled" || reservation.status === "completed") {
    res.status(400);
    throw new Error("Cannot cancel a completed or already cancelled reservation");
  }

  await prisma.reservation.update({
    where: { id },
    data: { status: "cancelled" },
  });

  res.json({ message: "Reservation cancelled successfully" });
});

// @desc    Confirm/cancel reservation (Admin / Restaurant Owner)
// @route   PATCH /api/v1/reservations/:id/status
// @access  Admin / Restaurant Owner
export const updateReservationStatus = asyncHandler(async (req, res) => {
  const currentUserId = req.user.id || req.user._id;
  const { status } = req.body;
  const id = sanitizeObjectId(req.params.id);
  const reservation = await prisma.reservation.findUnique({
    where: { id },
  });

  if (!reservation) {
    res.status(404);
    throw new Error("Reservation not found");
  }

  if (!["confirmed", "cancelled", "completed"].includes(status)) {
    res.status(400);
    throw new Error("Invalid status");
  }

  // Restaurant owners can only update reservations for their own restaurant
  if (req.user.role === "restaurant_owner") {
    const owned = await prisma.restaurant.findMany({
      where: { ownerId: currentUserId },
      select: { id: true },
    });
    const ownedIds = owned.map((r) => r.id.toString());
    if (!ownedIds.includes(reservation.restaurantId.toString())) {
      res.status(403);
      throw new Error("Not authorized to update this reservation");
    }
  }

  const updatedReservation = await prisma.reservation.update({
    where: { id },
    data: {
      status,
    },
    include: {
      restaurant: {
        select: { id: true, name: true, image: true, address: true },
      },
      user: {
        select: { id: true, name: true, email: true, phone: true },
      },
    },
  });

  res.json(updatedReservation);
});

// @desc    Get restaurant reservations (Admin/Owner)
// @route   GET /api/v1/reservations/restaurant/:id
// @access  Admin / Restaurant Owner
export const getRestaurantReservations = asyncHandler(async (req, res) => {
  const currentUserId = req.user.id || req.user._id;
  const restaurantId = sanitizeObjectId(req.params.id);

  // Restaurant owners can only view reservations for their own restaurant
  if (req.user.role === "restaurant_owner") {
    const owned = await prisma.restaurant.findMany({
      where: { ownerId: currentUserId },
      select: { id: true },
    });
    const ownedIds = owned.map((r) => r.id.toString());
    if (!ownedIds.includes(restaurantId.toString())) {
      res.status(403);
      throw new Error("Not authorized to view this restaurant's reservations");
    }
  }

  const reservations = await prisma.reservation.findMany({
    where: {
      restaurantId,
      status: { in: ["pending", "confirmed"] },
      date: { gte: new Date() },
    },
    orderBy: [{ date: "asc" }, { time: "asc" }],
    include: {
      user: {
        select: { id: true, name: true, phone: true },
      },
    },
  });

  res.json(reservations);
});
