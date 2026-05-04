import asyncHandler from "express-async-handler";
import User from "../models/userModel.js";

const SWADPASS_PRICES = {
  monthly: 199,
  yearly: 1499,
};

// @desc    Get SwadPass status for current user
// @route   GET /api/v1/swadpass/status
// @access  Private
export const getSwadPassStatus = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select(
    "hasSwadPass swadPassType swadPassExpiry swadPassStartedAt"
  );

  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  const now = new Date();
  const isActive = user.hasSwadPass && user.swadPassExpiry && user.swadPassExpiry > now;

  // Auto-expire if past date
  if (user.hasSwadPass && !isActive) {
    await User.findByIdAndUpdate(req.user._id, {
      hasSwadPass: false,
      swadPassType: null,
      swadPassExpiry: null,
    });
  }

  res.json({
    isActive,
    type: user.swadPassType,
    expiry: user.swadPassExpiry,
    startedAt: user.swadPassStartedAt,
    prices: SWADPASS_PRICES,
  });
});

// @desc    Subscribe to SwadPass (simulate payment — integrate with Razorpay in production)
// @route   POST /api/v1/swadpass/subscribe
// @access  Private
export const subscribeSwadPass = asyncHandler(async (req, res) => {
  const { type } = req.body;

  if (!["monthly", "yearly"].includes(type)) {
    res.status(400);
    throw new Error("Invalid subscription type. Choose 'monthly' or 'yearly'.");
  }

  const now = new Date();
  const expiry = new Date();
  expiry.setDate(expiry.getDate() + (type === "monthly" ? 30 : 365));

  const updatedUser = await User.findByIdAndUpdate(
    req.user._id,
    {
      hasSwadPass: true,
      swadPassType: type,
      swadPassExpiry: expiry,
      swadPassStartedAt: now,
    },
    { new: true }
  ).select("hasSwadPass swadPassType swadPassExpiry swadPassStartedAt");

  res.json({
    message: `SwadPass ${type} subscription activated successfully`,
    subscription: {
      isActive: true,
      type: updatedUser.swadPassType,
      expiry: updatedUser.swadPassExpiry,
      startedAt: updatedUser.swadPassStartedAt,
      price: SWADPASS_PRICES[type],
    },
  });
});

// @desc    Cancel SwadPass subscription
// @route   DELETE /api/v1/swadpass/cancel
// @access  Private
export const cancelSwadPass = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(req.user._id, {
    hasSwadPass: false,
    swadPassType: null,
    swadPassExpiry: null,
    swadPassStartedAt: null,
  });

  res.json({ message: "SwadPass subscription cancelled. Benefits will stop at end of billing period." });
});
