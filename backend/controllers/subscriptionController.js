import asyncHandler from "express-async-handler";
import Subscription from "../models/subscriptionModel.js";
import { sanitizeObjectId } from "../utils/sanitize.js";

// @desc    Create a new meal subscription
// @route   POST /api/v1/subscriptions
// @access  Private
export const createSubscription = asyncHandler(async (req, res) => {
  const {
    planType,
    planName,
    mealsPerDay,
    schedule,
    preferences,
    items,
    pricing,
    startDate,
    endDate,
    autoRenew,
    restaurant,
  } = req.body;

  if (!planType || !planName || !pricing?.perMealPrice || !pricing?.totalPrice || !startDate) {
    res.status(400);
    throw new Error("Please provide all required subscription fields");
  }

  // Calculate next delivery date (first scheduled day from startDate)
  const start = new Date(startDate);
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  let nextDelivery = new Date(start);
  if (schedule?.days?.length > 0) {
    while (!schedule.days.includes(dayNames[nextDelivery.getDay()])) {
      nextDelivery.setDate(nextDelivery.getDate() + 1);
    }
  }

  const subscription = await Subscription.create({
    user: req.user._id,
    planType,
    planName,
    mealsPerDay: mealsPerDay || 2,
    schedule: schedule || { days: ["Mon", "Tue", "Wed", "Thu", "Fri"], mealTimes: ["12:30"] },
    preferences: preferences || { isVeg: true, spiceLevel: "medium", allergies: [], notes: "" },
    items: items || [],
    pricing,
    restaurant: restaurant || null,
    status: "active",
    startDate: start,
    endDate: endDate || null,
    nextDeliveryDate: nextDelivery,
    autoRenew: autoRenew !== false,
  });

  res.status(201).json(subscription);
});

// @desc    Get all subscriptions for logged-in user
// @route   GET /api/v1/subscriptions/my
// @access  Private
export const getMySubscriptions = asyncHandler(async (req, res) => {
  const subscriptions = await Subscription.find({ user: req.user._id })
    .sort({ createdAt: -1 })
    .populate("restaurant", "name image")
    .populate("items.product", "name image");

  res.json(subscriptions);
});

// @desc    Get single subscription by ID
// @route   GET /api/v1/subscriptions/:id
// @access  Private (Owner or Admin)
export const getSubscriptionById = asyncHandler(async (req, res) => {
  const subId = sanitizeObjectId(req.params.id);
  const subscription = await Subscription.findById(subId)
    .populate("restaurant", "name image address")
    .populate("items.product", "name image price")
    .populate("deliveries.rider", "name phone");

  if (!subscription) {
    res.status(404);
    throw new Error("Subscription not found");
  }

  const isOwner = subscription.user.toString() === req.user._id.toString();
  const isAdmin = req.user.role === "admin";
  if (!isOwner && !isAdmin) {
    res.status(401);
    throw new Error("Not authorized");
  }

  res.json(subscription);
});

// @desc    Pause subscription
// @route   PUT /api/v1/subscriptions/:id/pause
// @access  Private (Owner)
export const pauseSubscription = asyncHandler(async (req, res) => {
  const subId = sanitizeObjectId(req.params.id);
  const subscription = await Subscription.findOne({
    _id: subId,
    user: req.user._id,
    status: "active",
  });

  if (!subscription) {
    res.status(404);
    throw new Error("Active subscription not found");
  }

  subscription.status = "paused";
  await subscription.save();

  res.json({ message: "Subscription paused", subscription });
});

// @desc    Resume subscription
// @route   PUT /api/v1/subscriptions/:id/resume
// @access  Private (Owner)
export const resumeSubscription = asyncHandler(async (req, res) => {
  const subId = sanitizeObjectId(req.params.id);
  const subscription = await Subscription.findOne({
    _id: subId,
    user: req.user._id,
    status: "paused",
  });

  if (!subscription) {
    res.status(404);
    throw new Error("Paused subscription not found");
  }

  subscription.status = "active";
  // Recalculate next delivery
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  let nextDelivery = new Date();
  while (!subscription.schedule.days.includes(dayNames[nextDelivery.getDay()])) {
    nextDelivery.setDate(nextDelivery.getDate() + 1);
  }
  subscription.nextDeliveryDate = nextDelivery;

  await subscription.save();

  res.json({ message: "Subscription resumed", subscription });
});

// @desc    Cancel subscription
// @route   PUT /api/v1/subscriptions/:id/cancel
// @access  Private (Owner or Admin)
export const cancelSubscription = asyncHandler(async (req, res) => {
  const subId = sanitizeObjectId(req.params.id);
  const { reason } = req.body;

  const subscription = await Subscription.findById(subId);
  if (!subscription) {
    res.status(404);
    throw new Error("Subscription not found");
  }

  const isOwner = subscription.user.toString() === req.user._id.toString();
  const isAdmin = req.user.role === "admin";
  if (!isOwner && !isAdmin) {
    res.status(401);
    throw new Error("Not authorized");
  }

  subscription.status = "cancelled";
  subscription.cancellationReason = reason || "User cancelled";
  subscription.cancelledAt = new Date();
  subscription.autoRenew = false;
  await subscription.save();

  res.json({ message: "Subscription cancelled", subscription });
});

// @desc    Admin: List all subscriptions
// @route   GET /api/v1/subscriptions
// @access  Admin
export const getAllSubscriptions = asyncHandler(async (req, res) => {
  const { status, planType, page = 1 } = req.query;
  const limit = Math.min(parseInt(req.query.limit) || 20, 100);
  const filter = {};
  if (status) filter.status = status;
  if (planType) filter.planType = planType;

  const skip = (parseInt(page) - 1) * limit;
  const [subscriptions, total] = await Promise.all([
    Subscription.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("user", "name email")
      .populate("restaurant", "name"),
    Subscription.countDocuments(filter),
  ]);

  res.json({ subscriptions, total, page: parseInt(page), pages: Math.ceil(total / limit) });
});
