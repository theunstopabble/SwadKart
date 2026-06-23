import asyncHandler from "express-async-handler";
import crypto from "crypto";
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

// @desc    Subscribe to SwadPass (requires verified Razorpay payment)
// @route   POST /api/v1/swadpass/subscribe
// @access  Private
export const subscribeSwadPass = asyncHandler(async (req, res) => {
  const { type, razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

  if (!["monthly", "yearly"].includes(type)) {
    res.status(400);
    throw new Error("Invalid subscription type. Choose 'monthly' or 'yearly'.");
  }

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    res.status(400);
    throw new Error("Payment verification required. Please complete payment first.");
  }

  const body = razorpay_order_id + "|" + razorpay_payment_id;
  if (!process.env.RAZORPAY_KEY_SECRET) {
    res.status(500);
    throw new Error("Payment service misconfigured");
  }

  const expectedSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
    .update(body)
    .digest("hex");

  if (expectedSignature !== razorpay_signature) {
    res.status(400);
    throw new Error("Payment verification failed. Invalid signature.");
  }

  // 🛡️ Fetch payment from Razorpay to verify amount and status
  const Razorpay = (await import("razorpay")).default;
  const instance = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });
  let payment;
  try {
    payment = await instance.payments.fetch(razorpay_payment_id);
  } catch {
    res.status(502);
    throw new Error("Payment gateway unreachable. Please retry.");
  }

  if (payment.status !== "captured") {
    res.status(400);
    throw new Error("Payment not captured. Please complete payment.");
  }

  const expectedAmount = SWADPASS_PRICES[type] * 100;
  if (payment.amount !== expectedAmount) {
    res.status(400);
    throw new Error("Payment amount mismatch — possible tampering.");
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

  res.json({ message: "SwadPass subscription cancelled immediately." });
});
