/**
 * Coupon Tool — Lists available coupons or validates/applies a specific coupon code.
 *
 * Gate pattern: auth check → fetch/validate → return structured response
 *
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 3.10, 3.11
 */

import Coupon from "../../../models/couponModel.js";
import CouponUsage from "../../../models/couponUsageModel.js";

export const toolSchema = {
  type: "function",
  function: {
    name: "coupon_offers",
    description:
      "List available coupons or validate/apply a specific coupon code.",
    parameters: {
      type: "object",
      properties: {
        action: {
          type: "string",
          enum: ["list", "apply"],
          description:
            "Whether to list available coupons or apply a specific code.",
        },
        couponCode: {
          type: "string",
          description:
            "The coupon code to apply. Required when action is 'apply'.",
        },
      },
      required: ["action"],
    },
  },
};

/**
 * Format a Date object as a human-readable date string.
 * @param {Date|null} date
 * @returns {string|null}
 */
function formatDate(date) {
  if (!date) return null;
  return new Date(date).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeZone: "Asia/Kolkata",
  });
}

/**
 * Wrap a promise with a timeout. Rejects with Error("timeout") if exceeded.
 * @param {Promise} promise
 * @param {number} ms - Timeout in milliseconds
 * @returns {Promise}
 */
function withTimeout(promise, ms = 3000) {
  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error("timeout")), ms)
  );
  return Promise.race([promise, timeoutPromise]);
}

/**
 * Execute the coupon tool.
 *
 * @param {object} params
 * @param {string} params.action - "list" or "apply"
 * @param {string} [params.couponCode] - Coupon code (required for "apply")
 * @param {string|null} params.userId - Authenticated user ID
 * @returns {Promise<object>} Structured result with coupon data or error
 */
export async function execute({ action, couponCode, userId }) {
  // Gate 1: Auth check
  if (!userId) {
    return {
      success: false,
      reason: "auth_required",
      message: "Please log in to view or apply coupons.",
    };
  }

  try {
    if (action === "list") {
      return await handleList(userId);
    } else if (action === "apply") {
      return await handleApply(couponCode, userId);
    }

    return {
      success: false,
      reason: "internal_error",
      message: "Invalid action specified.",
    };
  } catch (err) {
    if (err.message === "timeout") {
      return {
        success: false,
        reason: "timeout",
        message: "Service temporarily unavailable. Please try again.",
      };
    }
    return {
      success: false,
      reason: "internal_error",
      message: "Something went wrong while processing your coupon request.",
    };
  }
}

/**
 * Handle the "list" action — fetch active, non-expired coupons not used by user.
 * @param {string} userId
 * @returns {Promise<object>}
 */
async function handleList(userId) {
  const now = new Date();

  // Fetch coupon IDs already used by this user
  const usedCouponsPromise = CouponUsage.find({ user: userId })
    .select("coupon")
    .lean();
  const usedCoupons = await withTimeout(usedCouponsPromise);
  const usedCouponIds = usedCoupons.map((u) => u.coupon);

  // Fetch active, non-expired coupons not already used
  const couponsQuery = Coupon.find({
    isActive: true,
    expirationDate: { $gt: now },
    _id: { $nin: usedCouponIds },
  })
    .sort({ discountPercentage: -1 })
    .lean();

  const coupons = await withTimeout(couponsQuery);

  if (!coupons || coupons.length === 0) {
    return {
      success: false,
      reason: "no_coupons_available",
      message: "No active coupons are currently available for your account.",
    };
  }

  const data = coupons.map((coupon) => ({
    code: coupon.code,
    discountPercentage: coupon.discountPercentage,
    maxDiscountAmount: coupon.maxDiscountAmount,
    minOrderValue: coupon.minOrderValue,
    expirationDate: formatDate(coupon.expirationDate),
  }));

  return {
    success: true,
    data: { coupons: data },
  };
}

/**
 * Handle the "apply" action — validate coupon exists, is active, not expired, not used.
 * @param {string} couponCode
 * @param {string} userId
 * @returns {Promise<object>}
 */
async function handleApply(couponCode, userId) {
  const now = new Date();

  // Gate 2: Validate coupon exists
  const couponQuery = Coupon.findOne({
    code: couponCode?.toUpperCase(),
  }).lean();
  const coupon = await withTimeout(couponQuery);

  if (!coupon) {
    return {
      success: false,
      reason: "invalid_coupon",
      message: "The coupon code you entered is not valid.",
    };
  }

  // Gate 3: Check if active and not expired
  if (!coupon.isActive || new Date(coupon.expirationDate) <= now) {
    return {
      success: false,
      reason: "coupon_expired",
      message: "This coupon is no longer valid or has expired.",
    };
  }

  // Gate 4: Check if already used by this user
  const usageQuery = CouponUsage.findOne({
    user: userId,
    coupon: coupon._id,
  }).lean();
  const usage = await withTimeout(usageQuery);

  if (usage) {
    return {
      success: false,
      reason: "coupon_already_used",
      message: "You have already used this coupon.",
    };
  }

  // Success — return coupon details without recording usage
  return {
    success: true,
    data: {
      code: coupon.code,
      discountPercentage: coupon.discountPercentage,
      maxDiscountAmount: coupon.maxDiscountAmount,
      minOrderValue: coupon.minOrderValue,
      expirationDate: formatDate(coupon.expirationDate),
      message: "Coupon is valid and can be applied to your next order.",
    },
  };
}
