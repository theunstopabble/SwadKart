import asyncHandler from "express-async-handler";
import prisma from "../config/prisma.js";
import { sanitizeObjectId } from "../utils/sanitize.js";

// @desc    Create a new meal subscription
// @route   POST /api/v1/subscriptions
// @access  Private
export const createSubscription = asyncHandler(async (req, res) => {
  const currentUserId = req.user.id || req.user._id;
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

  const subscription = await prisma.subscription.create({
    data: {
      userId: currentUserId,
      planType,
      planName,
      mealsPerDay: mealsPerDay || 2,
      schedule: schedule || { days: ["Mon", "Tue", "Wed", "Thu", "Fri"], mealTimes: ["12:30"] },
      preferences: preferences || { isVeg: true, spiceLevel: "medium", allergies: [], notes: "" },
      items: items || [],
      pricing,
      restaurantId: restaurant || null,
      status: "active",
      startDate: start,
      endDate: endDate ? new Date(endDate) : null,
      nextDeliveryDate: nextDelivery,
      autoRenew: autoRenew !== false,
    },
  });

  res.status(201).json(subscription);
});

// @desc    Get all subscriptions for logged-in user
// @route   GET /api/v1/subscriptions/my
// @access  Private
export const getMySubscriptions = asyncHandler(async (req, res) => {
  const currentUserId = req.user.id || req.user._id;
  const subscriptions = await prisma.subscription.findMany({
    where: { userId: currentUserId },
    orderBy: { createdAt: "desc" },
    include: {
      restaurant: {
        select: { id: true, name: true, image: true },
      },
    },
  });

  res.json(subscriptions);
});

// @desc    Get single subscription by ID
// @route   GET /api/v1/subscriptions/:id
// @access  Private (Owner or Admin)
export const getSubscriptionById = asyncHandler(async (req, res) => {
  const currentUserId = req.user.id || req.user._id;
  const subId = sanitizeObjectId(req.params.id);
  const subscription = await prisma.subscription.findUnique({
    where: { id: subId },
    include: {
      restaurant: {
        select: { id: true, name: true, image: true, address: true },
      },
    },
  });

  if (!subscription) {
    res.status(404);
    throw new Error("Subscription not found");
  }

  const isOwner = subscription.userId.toString() === currentUserId.toString();
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
  const currentUserId = req.user.id || req.user._id;
  const subId = sanitizeObjectId(req.params.id);
  const subscription = await prisma.subscription.findFirst({
    where: {
      id: subId,
      userId: currentUserId,
      status: "active",
    },
  });

  if (!subscription) {
    res.status(404);
    throw new Error("Active subscription not found");
  }

  const updatedSubscription = await prisma.subscription.update({
    where: { id: subId },
    data: { status: "paused" },
  });

  res.json({ message: "Subscription paused", subscription: updatedSubscription });
});

// @desc    Resume subscription
// @route   PUT /api/v1/subscriptions/:id/resume
// @access  Private (Owner)
export const resumeSubscription = asyncHandler(async (req, res) => {
  const currentUserId = req.user.id || req.user._id;
  const subId = sanitizeObjectId(req.params.id);
  const subscription = await prisma.subscription.findFirst({
    where: {
      id: subId,
      userId: currentUserId,
      status: "paused",
    },
  });

  if (!subscription) {
    res.status(404);
    throw new Error("Paused subscription not found");
  }

  // Recalculate next delivery
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  let nextDelivery = new Date();
  const days = subscription.schedule?.days || ["Mon", "Tue", "Wed", "Thu", "Fri"];
  while (!days.includes(dayNames[nextDelivery.getDay()])) {
    nextDelivery.setDate(nextDelivery.getDate() + 1);
  }

  const updatedSubscription = await prisma.subscription.update({
    where: { id: subId },
    data: {
      status: "active",
      nextDeliveryDate: nextDelivery,
    },
  });

  res.json({ message: "Subscription resumed", subscription: updatedSubscription });
});

// @desc    Cancel subscription
// @route   PUT /api/v1/subscriptions/:id/cancel
// @access  Private (Owner or Admin)
export const cancelSubscription = asyncHandler(async (req, res) => {
  const currentUserId = req.user.id || req.user._id;
  const subId = sanitizeObjectId(req.params.id);
  const { reason } = req.body;

  const subscription = await prisma.subscription.findUnique({
    where: { id: subId },
  });
  if (!subscription) {
    res.status(404);
    throw new Error("Subscription not found");
  }

  const isOwner = subscription.userId.toString() === currentUserId.toString();
  const isAdmin = req.user.role === "admin";
  if (!isOwner && !isAdmin) {
    res.status(401);
    throw new Error("Not authorized");
  }

  const updatedSubscription = await prisma.subscription.update({
    where: { id: subId },
    data: {
      status: "cancelled",
      cancellationReason: reason || "User cancelled",
      cancelledAt: new Date(),
      autoRenew: false,
    },
  });

  res.json({ message: "Subscription cancelled", subscription: updatedSubscription });
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
    prisma.subscription.findMany({
      where: filter,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      include: {
        user: { select: { id: true, name: true, email: true } },
        restaurant: { select: { id: true, name: true } },
      },
    }),
    prisma.subscription.count({ where: filter }),
  ]);

  res.json({ subscriptions, total, page: parseInt(page), pages: Math.ceil(total / limit) });
});
