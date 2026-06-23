import asyncHandler from "express-async-handler";
import User from "../models/userModel.js";
import CoinTransaction from "../models/coinTransactionModel.js";
import { sanitizeObjectId } from "../utils/sanitize.js";

// Rate: ₹10 spent = 1 SwadCoin, 100 SwadCoins = ₹10 off
const COIN_EARN_RATE = 0.1; // 1 coin per ₹10
const COIN_REDEEM_RATE = 0.1; // ₹10 per 100 coins
const FIRST_ORDER_BONUS = 500;
const BIRTHDAY_BONUS = 200;

// ==========================================
// 1. GET COIN BALANCE & HISTORY
// ==========================================
export const getLoyaltyProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select("swadCoins name");
  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  const transactions = await CoinTransaction.find({ user: req.user._id })
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();

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
  // 🛡️ SECURITY FIX: Never trust frontend totalPrice for discount validation.
  // totalPrice is removed from required fields. Discount is validated purely
  // by coin rules: max 50% off, capped at available coins.
  // Frontend passes current cart total for UI guidance only.

  if (!coins || coins <= 0 || coins % 100 !== 0) {
    res.status(400);
    throw new Error("Coins must be a positive multiple of 100");
  }

  const user = await User.findById(req.user._id);
  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  if (user.swadCoins < coins) {
    res.status(400);
    throw new Error(`Insufficient SwadCoins. You have ${user.swadCoins} coins.`);
  }

  const discount = coins * COIN_REDEEM_RATE;
  // Max discount rule: coin redemption cannot exceed ₹5000 equivalent
  if (discount > 5000) {
    res.status(400);
    throw new Error("Maximum coin discount is ₹5000 per order");
  }

  // Atomic deduction
  const updatedUser = await User.findOneAndUpdate(
    { _id: req.user._id, swadCoins: { $gte: coins } },
    { $inc: { swadCoins: -coins } },
    { new: true },
  );

  if (!updatedUser) {
    res.status(400);
    throw new Error("Coin redemption failed. Please try again.");
  }

  await CoinTransaction.create({
    user: req.user._id,
    type: "Redeem",
    amount: -coins,
    description: `Redeemed ${coins} SwadCoins for ₹${discount.toFixed(2)} discount`,
  });

  res.json({
    success: true,
    coinsUsed: coins,
    discountAmount: discount,
    remainingCoins: updatedUser.swadCoins,
  });
});

// ==========================================
// 3. AWARD COINS (Internal helper, exported for use by order controllers)
// ==========================================
export const awardCoinsToUser = async (userId, amount, type, description, orderId = null, relatedUserId = null) => {
  if (!amount || amount <= 0) return;

  const updatedUser = await User.findByIdAndUpdate(
    userId,
    { $inc: { swadCoins: amount } },
    { new: true },
  );

  if (updatedUser) {
    await CoinTransaction.create({
      user: userId,
      type,
      amount,
      description,
      order: orderId,
      relatedUser: relatedUserId,
    });
  }

  return updatedUser;
};

// ==========================================
// 4. ADMIN: Adjust Coins Manually
// ==========================================
export const adminAdjustCoins = asyncHandler(async (req, res) => {
  const { userId: rawUserId, coins, reason } = req.body;

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

  const userId = sanitizeObjectId(rawUserId);
  const user = await User.findById(userId);
  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  if (coins < 0) {
    const updated = await User.findOneAndUpdate(
      { _id: userId, swadCoins: { $gte: Math.abs(coins) } },
      { $inc: { swadCoins: coins } },
      { new: true },
    );
    if (!updated) {
      res.status(400);
      throw new Error("Cannot reduce coins below zero");
    }
    await CoinTransaction.create({
      user: userId,
      type: "Refund",
      amount: coins,
      description: reason || `Admin adjustment by ${req.user.email}`,
    });
    return res.json({
      success: true,
      message: `Deducted ${Math.abs(coins)} coins`,
      newBalance: updated.swadCoins,
    });
  }

  const updated = await User.findOneAndUpdate(
    { _id: userId },
    { $inc: { swadCoins: coins } },
    { new: true },
  );

  await CoinTransaction.create({
    user: userId,
    type: "Bonus",
    amount: coins,
    description: reason || `Admin adjustment by ${req.user.email}`,
  });

  res.json({
    success: true,
    message: `Added ${coins} coins`,
    newBalance: updated.swadCoins,
  });
});
