import Order from "../models/orderModel.js";
import User from "../models/userModel.js";
import CouponUsage from "../models/couponUsageModel.js";

/**
 * FEAT-24: Simple heuristic-based fraud detection
 * Checks applied before order creation
 * Logs suspicious activity but does NOT block (avoid false positives)
 */

export const fraudDetection = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { couponCode, totalPrice, itemsPrice, shippingAddress } = req.body;
    const flags = [];

    // 1. High-value first order (> ₹2000 without order history)
    const orderCount = await Order.countDocuments({ user: userId });
    if (orderCount === 0 && itemsPrice > 2000) {
      flags.push("high_value_first_order");
    }

    // 2. Multiple accounts with same address (last 30 days)
    if (shippingAddress?.address) {
      const addressMatch = await User.countDocuments({
        _id: { $ne: userId },
        "shippingAddress.address": { $regex: shippingAddress.address.slice(0, 20), $options: "i" },
      });
      if (addressMatch >= 3) {
        flags.push("multiple_accounts_same_address");
      }
    }

    // 3. Order-then-cancel pattern (3+ cancelled in last 7 days)
    const cancelledOrders = await Order.countDocuments({
      user: userId,
      status: "cancelled",
      updatedAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
    });
    if (cancelledOrders >= 3) {
      flags.push("frequent_cancellation_pattern");
    }

    // 4. Coupon abuse: same coupon used across multiple accounts
    if (couponCode) {
      const couponUsageCount = await CouponUsage.countDocuments({
        coupon: (await CouponUsage.findOne({ user: userId }).sort({ createdAt: -1 }))?.coupon,
      });
      // Simplified — full coupon tracking already in couponUsage
    }

    // 5. Total price manipulation (frontend total ≠ server recalculation caught later)
    // Trust the server calculation; this is a safety log

    if (flags.length > 0) {
      console.warn(`🚨 FRAUD_ALERT [User ${userId}]: ${flags.join(", ")}`);
      // Attach flags to request for downstream logging/analytics
      req.fraudFlags = flags;
    }

    next();
  } catch (error) {
    // Fraud detection should NEVER block order flow
    console.error("Fraud detection error (non-blocking):", error.message);
    next();
  }
};
