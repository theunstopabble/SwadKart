import crypto from "crypto";
import asyncHandler from "express-async-handler";
import prisma from "../config/prisma.js";
import { awardCoinsToUser } from "./loyaltyController.js";

const REFERRAL_REWARD = 50; // ₹50 worth of coins
const REFERRAL_COIN_REWARD = 500; // 500 SwadCoins = ₹50

// ==========================================
// 1. GET MY REFERRAL CODE & STATS
// ==========================================
export const getMyReferral = asyncHandler(async (req, res) => {
  const userId = req.user.id || req.user._id;
  let user = await prisma.user.findUnique({
    where: { id: userId },
    select: { referralCode: true, swadCoins: true, name: true, role: true },
  });

  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  if (!user.referralCode && user.role === "user") {
    const code = crypto.randomBytes(6).toString("hex").toUpperCase();
    user = await prisma.user.update({
      where: { id: userId },
      data: { referralCode: code },
    });
  }

  const referrals = await prisma.referral.findMany({
    where: { referrerId: userId },
  });

  const totalReferrals = referrals.length;
  const pending = referrals.filter((r) => r.status === "pending").length;
  const completed = referrals.filter((r) => r.status === "completed").length;
  const paid = referrals.filter((r) => r.status === "paid").length;
  const totalEarnings = referrals
    .filter((r) => r.status === "paid")
    .reduce((sum, r) => sum + r.rewardAmount, 0);

  res.json({
    referralCode: user.referralCode,
    swadCoins: user.swadCoins || 0,
    stats: {
      totalReferrals,
      pending,
      completed,
      paid,
      totalEarnings,
    },
  });
});

// ==========================================
// 2. VALIDATE REFERRAL CODE
// ==========================================
export const validateReferralCode = asyncHandler(async (req, res) => {
  const { code } = req.body;

  if (!code || typeof code !== "string" || code.length < 4) {
    res.status(400);
    throw new Error("Invalid referral code");
  }

  const referrer = await prisma.user.findFirst({
    where: {
      referralCode: code.toUpperCase(),
      role: "user",
    },
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
// 3. APPLY REFERRAL ON REGISTRATION
// ==========================================
export const applyReferralOnRegister = async (newUserId, referralCode) => {
  if (!referralCode) return;

  const referrer = await prisma.user.findFirst({
    where: {
      referralCode: referralCode.toUpperCase(),
      role: "user",
    },
  });

  if (!referrer || referrer.id === newUserId) return;

  const existing = await prisma.referral.findFirst({
    where: { refereeId: newUserId },
  });
  if (existing) return;

  await prisma.referral.create({
    data: {
      referrerId: referrer.id,
      refereeId: newUserId,
      referralCode: referralCode.toUpperCase(),
      status: "pending",
      rewardAmount: REFERRAL_REWARD,
    },
  });

  await awardCoinsToUser(
    newUserId,
    200,
    "Bonus",
    "Welcome bonus for using a referral code",
  );
};

// ==========================================
// 4. PROCESS REFERRAL REWARD
// ==========================================
export const processReferralReward = async (refereeId, orderId) => {
  const referral = await prisma.referral.findFirst({
    where: { refereeId, status: "pending" },
  });

  if (!referral) return;

  await awardCoinsToUser(
    referral.referrerId,
    REFERRAL_COIN_REWARD,
    "Referral",
    "Referral reward for inviting a new user",
  );

  await awardCoinsToUser(
    refereeId,
    REFERRAL_COIN_REWARD,
    "Referral",
    "Referral reward for your first order",
  );

  await prisma.referral.update({
    where: { id: referral.id },
    data: {
      status: "paid",
      firstOrderId: orderId,
      paidAt: new Date(),
    },
  });
};

// ==========================================
// 5. GET ALL REFERRALS (Admin)
// ==========================================
export const getAllReferrals = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = Math.min(parseInt(req.query.limit) || 20, 100);
  const skip = (page - 1) * limit;

  const [referrals, count] = await Promise.all([
    prisma.referral.findMany({
      include: {
        referrer: { select: { id: true, name: true, email: true } },
        referee: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.referral.count(),
  ]);

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
