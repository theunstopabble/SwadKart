import crypto from "crypto";
import asyncHandler from "express-async-handler";
import User from "../models/userModel.js";
import Referral from "../models/referralModel.js";
import { awardCoinsToUser } from "./loyaltyController.js";

const REFERRAL_REWARD = 50; // ₹50 worth of coins
const REFERRAL_COIN_REWARD = 500; // 500 SwadCoins = ₹50

// ==========================================
// 1. GET MY REFERRAL CODE & STATS
// ==========================================
export const getMyReferral = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select("referralCode swadCoins name");
  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  // Auto-generate if missing
  if (!user.referralCode && user.role === "user") {
    user.referralCode = crypto.randomBytes(6).toString("hex").toUpperCase();
    await user.save();
  }

  const stats = await Referral.aggregate([
    { $match: { referrer: user._id } },
    {
      $group: {
        _id: null,
        totalReferrals: { $sum: 1 },
        pending: { $sum: { $cond: [{ $eq: ["$status", "pending"] }, 1, 0] } },
        completed: { $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] } },
        paid: { $sum: { $cond: [{ $eq: ["$status", "paid"] }, 1, 0] } },
        totalEarnings: { $sum: { $cond: [{ $eq: ["$status", "paid"] }, "$rewardAmount", 0] } },
      },
    },
  ]);

  res.json({
    referralCode: user.referralCode,
    swadCoins: user.swadCoins || 0,
    stats: stats[0] || {
      totalReferrals: 0,
      pending: 0,
      completed: 0,
      paid: 0,
      totalEarnings: 0,
    },
  });
});

// ==========================================
// 2. VALIDATE REFERRAL CODE (Used at registration)
// ==========================================
export const validateReferralCode = asyncHandler(async (req, res) => {
  const { code } = req.body;

  if (!code || typeof code !== "string" || code.length < 4) {
    res.status(400);
    throw new Error("Invalid referral code");
  }

  const referrer = await User.findOne({
    referralCode: code.toUpperCase(),
    role: "user",
  });

  if (!referrer) {
    res.status(404);
    throw new Error("Referral code not found");
  }

  res.json({
    valid: true,
    referrerName: referrer.name,
  });
});

// ==========================================
// 3. APPLY REFERRAL ON REGISTRATION (Internal, called by authController)
// ==========================================
export const applyReferralOnRegister = async (newUserId, referralCode) => {
  if (!referralCode) return;

  const referrer = await User.findOne({
    referralCode: referralCode.toUpperCase(),
    role: "user",
  });

  if (!referrer || referrer._id.toString() === newUserId.toString()) return;

  // Check if referee already has a referral record
  const existing = await Referral.findOne({ referee: newUserId });
  if (existing) return;

  await Referral.create({
    referrer: referrer._id,
    referee: newUserId,
    referralCode: referralCode.toUpperCase(),
    status: "pending",
    rewardAmount: REFERRAL_REWARD,
  });

  // Award welcome coins to new user
  await awardCoinsToUser(
    newUserId,
    200,
    "Bonus",
    "Welcome bonus for using a referral code",
  );
};

// ==========================================
// 4. PROCESS REFERRAL REWARD (Called when referee's first order is delivered)
// ==========================================
export const processReferralReward = async (refereeId, orderId) => {
  const referral = await Referral.findOneAndUpdate(
    { referee: refereeId, status: "pending" },
    { $set: { status: "completed", firstOrder: orderId } },
    { returnDocument: "after" },
  ).populate("referrer", "swadCoins");

  if (!referral) return;

  const referrerId = referral.referrer._id;

  // Award coins to referrer
  await awardCoinsToUser(
    referrerId,
    REFERRAL_COIN_REWARD,
    "Referral",
    `Referral reward for inviting a new user`,
    orderId,
    refereeId,
  );

  // Award coins to referee
  await awardCoinsToUser(
    refereeId,
    REFERRAL_COIN_REWARD,
    "Referral",
    `Referral reward for your first order`,
    orderId,
    referrerId,
  );

  // Update referral status to paid atomically
  await Referral.findOneAndUpdate(
    { _id: referral._id, status: "completed" },
    { $set: { status: "paid", paidAt: new Date() } },
  );
};

// ==========================================
// 5. GET ALL REFERRALS (Admin)
// ==========================================
export const getAllReferrals = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = Math.min(parseInt(req.query.limit) || 20, 100);

  const referrals = await Referral.find({})
    .populate("referrer", "name email")
    .populate("referee", "name email")
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .lean();

  const count = await Referral.countDocuments({});

  res.json({
    data: referrals,
    metadata: {
      total: count,
      page,
      pages: Math.ceil(count / limit),
      limit,
    },
  });
});
