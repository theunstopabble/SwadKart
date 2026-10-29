import asyncHandler from "express-async-handler";
import prisma from "../config/prisma.js";

export const getLoyaltyTiers = asyncHandler(async (req, res) => {
  const tiers = [
    { name: "Bronze", minCoins: 0, maxCoins: 500, redeemRate: 0.08, bonusEarning: 1, color: "#cd7f32", perks: ["Basic earning rate", "Birthday bonus"] },
    { name: "Silver", minCoins: 500, maxCoins: 2000, redeemRate: 0.09, bonusEarning: 1.5, color: "#c0c0c0", perks: ["1.5x earning", "Priority support", "Birthday bonus"] },
    { name: "Gold", minCoins: 2000, maxCoins: 5000, redeemRate: 0.10, bonusEarning: 2, color: "#ffd700", perks: ["2x earning", "Free delivery/month", "Priority support", "Exclusive deals"] },
    { name: "Platinum", minCoins: 5000, maxCoins: Infinity, redeemRate: 0.12, bonusEarning: 3, color: "#e5e4e2", perks: ["3x earning", "Free delivery/week", "Dedicated support", "Early access", "Exclusive events"] },
  ];

  res.json(tiers);
});

export const calculateCoinEarnings = asyncHandler(async (req, res) => {
  const currentUserId = req.user?.id || req.user?._id;
  const { orderAmount, userId } = req.body;

  if (!orderAmount || orderAmount <= 0) {
    res.status(400);
    throw new Error("Valid order amount is required");
  }

  const targetUserId =
    userId && userId !== currentUserId?.toString()
      ? req.user?.role === "admin"
        ? userId
        : currentUserId
      : userId || currentUserId;

  const user = targetUserId
    ? await prisma.user.findUnique({
        where: { id: targetUserId },
        select: { swadCoins: true, badges: true },
      })
    : null;

  let earningRate = 1;
  let tierName = "Bronze";
  let tierColor = "#cd7f32";

  if (user) {
    const tiers = [
      { name: "Bronze", min: 0, rate: 1, color: "#cd7f32" },
      { name: "Silver", min: 500, rate: 1.5, color: "#c0c0c0" },
      { name: "Gold", min: 2000, rate: 2, color: "#ffd700" },
      { name: "Platinum", min: 5000, rate: 3, color: "#e5e4e2" },
    ];
    const currentTier = [...tiers].reverse().find((t) => (user.swadCoins || 0) >= t.min);
    if (currentTier) {
      earningRate = currentTier.rate;
      tierName = currentTier.name;
      tierColor = currentTier.color;
    }
  }

  const baseCoins = Math.floor(orderAmount / 10);
  const earnedCoins = Math.floor(baseCoins * earningRate);
  const nextTierCoins = earningRate < 3 ? Math.ceil(baseCoins / 100) * 100 - baseCoins : 0;

  res.json({
    orderAmount,
    baseCoins,
    earningRate,
    earnedCoins,
    tierName,
    tierColor,
    nextTierCoins,
    coinsValueRupees: Number((earnedCoins * 0.1).toFixed(2)),
    message:
      earnedCoins > baseCoins
        ? `🎉 You've earned ${earnedCoins} coins (${earningRate}x multiplier for ${tierName} tier)!`
        : `You earned ${earnedCoins} coins. Spend ${nextTierCoins} more coins to reach ${
            earningRate < 3 ? "next tier" : "Platinum"
          }!`,
  });
});

export const calculateCoinRedemption = asyncHandler(async (req, res) => {
  const currentUserId = req.user.id || req.user._id;
  const { coins, orderAmount } = req.body;

  if (!coins || coins <= 0 || coins % 100 !== 0) {
    res.status(400);
    throw new Error("Coins must be a positive multiple of 100");
  }

  const user = await prisma.user.findUnique({
    where: { id: currentUserId },
    select: { swadCoins: true },
  });
  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  if ((user.swadCoins || 0) < coins) {
    return res.status(400).json({
      error: "Insufficient coins",
      available: user.swadCoins,
      required: coins,
    });
  }

  const redeemRate = 0.1;
  const discountRupees = coins * redeemRate;
  const maxDiscountPercent = (discountRupees / orderAmount) * 100;

  if (discountRupees > orderAmount * 0.5) {
    return res.status(400).json({
      error: "Maximum redemption is 50% of order value",
      maxAllowed: Math.floor(orderAmount * 0.5),
    });
  }

  const remainingAfterRedemption = orderAmount - discountRupees;
  const platformFee = remainingAfterRedemption * 0.15;
  const restaurantPayout = remainingAfterRedemption - platformFee;

  res.json({
    coinsRedeemed: coins,
    coinsValueRupees: discountRupees,
    orderAmount,
    discountPercent: Number(maxDiscountPercent.toFixed(2)),
    finalOrderAmount: remainingAfterRedemption,
    platformFee: Number(platformFee.toFixed(2)),
    restaurantPayout: Number(restaurantPayout.toFixed(2)),
    availableCoins: user.swadCoins,
    coinsRemainingAfter: (user.swadCoins || 0) - coins,
  });
});

export const calculateReferralReward = asyncHandler(async (req, res) => {
  const { referrerCode } = req.query;

  if (!referrerCode) {
    res.status(400);
    throw new Error("Referrer code is required");
  }

  const referrer = await prisma.user.findFirst({
    where: { referralCode: referrerCode.toUpperCase() },
    select: { name: true, swadCoins: true, badges: true },
  });
  if (!referrer) {
    res.status(404);
    throw new Error("Invalid referral code");
  }

  let referrerTier = "Bronze";
  if ((referrer.swadCoins || 0) >= 5000) referrerTier = "Platinum";
  else if ((referrer.swadCoins || 0) >= 2000) referrerTier = "Gold";
  else if ((referrer.swadCoins || 0) >= 500) referrerTier = "Silver";

  const referrerReward = 200;
  const refereeReward = 100;
  const referrerMultiplier = referrerTier === "Platinum" ? 3 : referrerTier === "Gold" ? 2 : 1;
  const totalReferrerReward = referrerReward * referrerMultiplier;

  res.json({
    referrerName: referrer.name,
    referrerTier,
    referrerCoins: referrer.swadCoins,
    referrerRewardCoins: totalReferrerReward,
    referrerRewardValue: Number((totalReferrerReward * 0.1).toFixed(2)),
    refereeRewardCoins: refereeReward,
    refereeRewardValue: Number((refereeReward * 0.1).toFixed(2)),
    referrerBonusMultiplier: referrerMultiplier,
    expiryDays: 30,
  });
});

export const getCoinRates = asyncHandler(async (req, res) => {
  res.json({
    earnRate: 10,
    redeemRate: 0.1,
    earnDescription: "₹10 = 1 coin",
    redeemDescription: "100 coins = ₹10 off",
    maxRedeemPerOrder: 5000,
    firstOrderBonus: 500,
    referralBonus: 500,
  });
});

export const getRewardBreakdown = asyncHandler(async (req, res) => {
  const currentUserId = req.user.id || req.user._id;

  const [orders, user, coinTxs] = await Promise.all([
    prisma.order.findMany({
      where: { userId: currentUserId, isPaid: true },
      select: { itemsPrice: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: 90,
    }),
    prisma.user.findUnique({
      where: { id: currentUserId },
      select: { swadCoins: true, referralCode: true, referralRewardClaimed: true },
    }),
    prisma.coinTransaction.findMany({
      where: { userId: currentUserId },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
  ]);

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const recentOrders = orders.filter((o) => new Date(o.createdAt) >= thirtyDaysAgo);
  const totalSpent = orders.reduce((s, o) => s + (o.itemsPrice || 0), 0);
  const recentSpent = recentOrders.reduce((s, o) => s + (o.itemsPrice || 0), 0);
  const projectedMonthlyCoins = Math.floor(recentSpent / 10) * 1;

  const earnedCoins = coinTxs
    .filter((t) => t.type === "Earn" || t.type === "Bonus" || t.type === "Referral")
    .reduce((s, t) => s + Math.abs(t.amount), 0);
  const redeemedCoins = coinTxs
    .filter((t) => t.type === "Redeem" || t.type === "Refund")
    .reduce((s, t) => s + Math.abs(t.amount), 0);

  res.json({
    currentCoins: user?.swadCoins || 0,
    referralCode: user?.referralCode || null,
    referralClaimed: user?.referralRewardClaimed || false,
    totalCoinsEarned: earnedCoins,
    totalCoinsRedeemed: redeemedCoins,
    totalOrderValue: Number(totalSpent.toFixed(2)),
    recentSpent30Days: Number(recentSpent.toFixed(2)),
    recentOrders30Days: recentOrders.length,
    projectedMonthlyCoins,
    coinTransactions: coinTxs.slice(0, 10).map((t) => ({
      amount: t.amount,
      type: t.type,
      description: t.description,
      date: t.createdAt,
    })),
  });
});
