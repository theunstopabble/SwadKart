import asyncHandler from "express-async-handler";
import crypto from "crypto";
import mongoose from "mongoose";
import Reservation from "../models/reservationModel.js";
import Restaurant from "../models/restaurantModel.js";
import QRCode from "qrcode";
import { sanitizeObjectId } from "../utils/sanitize.js";

// @desc    Create table reservation
// @route   POST /api/v1/reservations
// @access  Private
export const createReservation = asyncHandler(async (req, res) => {
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
  const restaurant = await Restaurant.findById(restaurantId);
  if (!restaurant) {
    res.status(404);
    throw new Error("Restaurant not found");
  }

  // Check for conflicting reservations — unique compound index handles atomicity
  const existing = await Reservation.findOne({
    restaurant: restaurantId,
    date: new Date(date),
    time,
    status: { $in: ["pending", "confirmed"] },
  });

  if (existing) {
    res.status(409);
    throw new Error("This time slot is already booked. Please choose another time.");
  }

  // Generate QR code with HMAC-signed payload
  const qrPayload = { r: restaurantId, d: date, t: time, g: guestCount, u: req.user._id.toString() };
  qrPayload.sig = crypto.createHmac("sha256", process.env.JWT_SECRET)
    .update(JSON.stringify(qrPayload))
    .digest("hex");
  const qrCodeDataUri = await QRCode.toDataURL(JSON.stringify(qrPayload), { width: 256, margin: 2 });

  const reservation = await Reservation.create({
    user: req.user._id,
    restaurant: restaurantId,
    date: new Date(date),
    time,
    guests: guestCount,
    specialRequests: (specialRequests || "").replace(/<[^>]*>/g, "").trim(),
    qrCode: qrCodeDataUri,
  });

  await reservation.populate("restaurant", "name image address");

  res.status(201).json(reservation);
});

// @desc    Get my reservations
// @route   GET /api/v1/reservations/my
// @access  Private
export const getMyReservations = asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(Math.max(1, parseInt(req.query.limit) || 20), 100);
  const skip = (page - 1) * limit;

  const reservations = await Reservation.find({ user: req.user._id })
    .sort({ date: -1, time: -1 })
    .skip(skip)
    .limit(limit)
    .populate("restaurant", "name image address");
  res.json(reservations);
});

// @desc    Cancel reservation
// @route   DELETE /api/v1/reservations/:id
// @access  Private
export const cancelReservation = asyncHandler(async (req, res) => {
  const id = sanitizeObjectId(req.params.id);
  const reservation = await Reservation.findOne({
    _id: id,
    user: req.user._id,
  });

  if (!reservation) {
    res.status(404);
    throw new Error("Reservation not found");
  }

  if (reservation.status === "cancelled" || reservation.status === "completed") {
    res.status(400);
    throw new Error("Cannot cancel a completed or already cancelled reservation");
  }

  reservation.status = "cancelled";
  await reservation.save();

  res.json({ message: "Reservation cancelled successfully" });
});

// @desc    Confirm/cancel reservation (Admin / Restaurant Owner)
// @route   PATCH /api/v1/reservations/:id/status
// @access  Admin / Restaurant Owner
export const updateReservationStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  const id = sanitizeObjectId(req.params.id);
  const reservation = await Reservation.findById(id);

  if (!reservation) {
    res.status(404);
    throw new Error("Reservation not found");
  }

  if (!["confirmed", "cancelled", "completed"].includes(status)) {
    res.status(400);
    throw new Error("Invalid status");
  }

  // 🛡️ Restaurant owners can only update reservations for their own restaurant
  if (req.user.role === "restaurant_owner") {
    const owned = await Restaurant.find({ owner: req.user._id }).select("_id").lean();
    const ownedIds = owned.map(r => r._id.toString());
    if (!ownedIds.includes(reservation.restaurant.toString())) {
      res.status(403);
      throw new Error("Not authorized to update this reservation");
    }
  }

  reservation.status = status;
  if (status === "completed") reservation.checkedInAt = new Date();

  await reservation.save();
  res.json(reservation);
});

// @desc    Get restaurant reservations (Admin/Owner)
// @route   GET /api/v1/reservations/restaurant/:id
// @access  Admin / Restaurant Owner
export const getRestaurantReservations = asyncHandler(async (req, res) => {
  const restaurantId = sanitizeObjectId(req.params.id);

  // 🛡️ Restaurant owners can only view reservations for their own restaurant
  if (req.user.role === "restaurant_owner") {
    const owned = await Restaurant.find({ owner: req.user._id }).select("_id").lean();
    const ownedIds = owned.map(r => r._id.toString());
    if (!ownedIds.includes(restaurantId.toString())) {
      res.status(403);
      throw new Error("Not authorized to view this restaurant's reservations");
    }
  }

  const reservations = await Reservation.find({
    restaurant: restaurantId,
    status: { $in: ["pending", "confirmed"] },
    date: { $gte: new Date() },
  })
    .sort({ date: 1, time: 1 })
    .populate("user", "name phone");

  res.json(reservations);
});
