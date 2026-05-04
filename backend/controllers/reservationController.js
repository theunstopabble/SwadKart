import asyncHandler from "express-async-handler";
import Reservation from "../models/reservationModel.js";
import Restaurant from "../models/restaurantModel.js";
import QRCode from "qrcode";

// @desc    Create table reservation
// @route   POST /api/v1/reservations
// @access  Private
export const createReservation = asyncHandler(async (req, res) => {
  const { restaurantId, date, time, guests, specialRequests } = req.body;

  if (!restaurantId || !date || !time || !guests) {
    res.status(400);
    throw new Error("Please provide restaurantId, date, time, and guests");
  }

  const restaurant = await Restaurant.findById(restaurantId);
  if (!restaurant) {
    res.status(404);
    throw new Error("Restaurant not found");
  }

  // Check for conflicting reservations
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

  // Generate QR code with reservation details
  const qrData = JSON.stringify({
    r: restaurantId,
    d: date,
    t: time,
    g: guests,
    u: req.user._id.toString(),
  });
  const qrCodeDataUri = await QRCode.toDataURL(qrData, { width: 256, margin: 2 });

  const reservation = await Reservation.create({
    user: req.user._id,
    restaurant: restaurantId,
    date: new Date(date),
    time,
    guests: Number(guests),
    specialRequests: specialRequests || "",
    qrCode: qrCodeDataUri,
  });

  await reservation.populate("restaurant", "name image address");

  res.status(201).json(reservation);
});

// @desc    Get my reservations
// @route   GET /api/v1/reservations/my
// @access  Private
export const getMyReservations = asyncHandler(async (req, res) => {
  const reservations = await Reservation.find({ user: req.user._id })
    .sort({ date: -1, time: -1 })
    .populate("restaurant", "name image address");
  res.json(reservations);
});

// @desc    Cancel reservation
// @route   DELETE /api/v1/reservations/:id
// @access  Private
export const cancelReservation = asyncHandler(async (req, res) => {
  const reservation = await Reservation.findOne({
    _id: req.params.id,
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
  const reservation = await Reservation.findById(req.params.id);

  if (!reservation) {
    res.status(404);
    throw new Error("Reservation not found");
  }

  if (!["confirmed", "cancelled", "completed"].includes(status)) {
    res.status(400);
    throw new Error("Invalid status");
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
  const reservations = await Reservation.find({
    restaurant: req.params.id,
    status: { $in: ["pending", "confirmed"] },
    date: { $gte: new Date() },
  })
    .sort({ date: 1, time: 1 })
    .populate("user", "name phone");

  res.json(reservations);
});
