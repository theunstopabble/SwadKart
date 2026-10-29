import asyncHandler from "express-async-handler";
import prisma from "../config/prisma.js";

const COIN_REDEEM_RATE = 0.1; // ₹10 per 100 coins

// ==========================================
// 1. GET COIN BALANCE & HISTORY
// ==========================================
export const getLoyaltyProfile = asyncHandler(async (req, res) => {
  const userId = req.user.id || req.user._id;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { swadCoins: true, name: true },
  });

  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  const transactions = await prisma.coinTransaction.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  res.json({
    swadCoins: user.swadCoins || 0,
    name: user.name,
    transactions,
  });
});

// ==========================================
// 2. REDEEM COINS FOR ORDER DISCOUNT
// ==========================================
export const redeemCoins = asyncHandler(async (req, res) => {
  const { coins } = req.body;
  const userId = req.user.id || req.user._id;

  if (!coins || coins <= 0 || coins % 100 !== 0) {
    res.status(400);
    throw new Error("Coins must be a positive multiple of 100");
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  if (user.swadCoins < coins) {
    res.status(400);
    throw new Error(`Insufficient SwadCoins. You have ${user.swadCoins} coins.`);
  }

  const discount = coins * COIN_REDEEM_RATE;
  if (discount > 5000) {
    res.status(400);
    throw new Error("Maximum coin discount is ₹5000 per order");
  }

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: {
      swadCoins: { decrement: coins },
    },
  });

  await prisma.coinTransaction.create({
    data: {
      userId,
      type: "Debit",
      amount: -coins,
      description: `Redeemed ${coins} SwadCoins for ₹${discount.toFixed(2)} discount`,
    },
  });

  res.json({
    success: true,
    coinsUsed: coins,
    discountAmount: discount,
    remainingCoins: updatedUser.swadCoins,
  });
});

// ==========================================
// 3. AWARD COINS (Internal helper)
// ==========================================
export const awardCoinsToUser = async (userId, amount, type, description) => {
  if (!amount || amount <= 0) return;

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: { swadCoins: { increment: amount } },
  });

  if (updatedUser) {
    await prisma.coinTransaction.create({
      data: {
        userId,
        type: type === "Redeem" ? "Debit" : "Credit",
        amount,
        description,
      },
    });
  }

  return updatedUser;
};

// ==========================================
// 4. ADMIN: Adjust Coins Manually
// ==========================================
export const adminAdjustCoins = asyncHandler(async (req, res) => {
  const { userId, coins, reason } = req.body;

  if (!coins || coins === 0) {
    res.status(400);
    throw new Error("Coin amount is required");
  }

  if (coins > 10000 || coins < -10000) {
    res.status(400);
    throw new Error("Cannot adjust more than 10,000 coins at a time");
  }

  if (!reason || reason.trim().length < 3) {
    res.status(400);
    throw new Error("Reason is required for coin adjustment");
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  if (coins < 0 && user.swadCoins < Math.abs(coins)) {
    res.status(400);
    throw new Error("Cannot reduce coins below zero");
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: {
      swadCoins: { increment: coins },
    },
  });

  await prisma.coinTransaction.create({
    data: {
      userId,
      type: coins < 0 ? "Debit" : "Credit",
      amount: coins,
      description: reason || `Admin adjustment by ${req.user.email}`,
    },
  });

  res.json({
    success: true,
    message: `${coins > 0 ? "Added" : "Deducted"} ${Math.abs(coins)} coins`,
    newBalance: updated.swadCoins,
  });
});
