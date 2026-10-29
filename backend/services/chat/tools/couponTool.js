/**
 * Coupon Tool — Lists available coupons or validates/applies a specific coupon code.
 */

import prisma from "../../../config/prisma.js";

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

function formatDate(date) {
  if (!date) return null;
  return new Date(date).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeZone: "Asia/Kolkata",
  });
}

function withTimeout(promise, ms = 3000) {
  let timer;
  const timeoutPromise = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error("timeout")), ms);
  });
  return Promise.race([promise, timeoutPromise]).finally(() => {
    clearTimeout(timer);
  });
}

export async function execute({ action, couponCode, userId }) {
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

async function handleList(userId) {
  const now = new Date();

  const usedCouponsPromise = prisma.couponUsage.findMany({
    where: { userId },
    select: { couponId: true },
  });
  const usedCoupons = await withTimeout(usedCouponsPromise);
  const usedCouponIds = usedCoupons.map((u) => u.couponId);

  const couponsQuery = prisma.coupon.findMany({
    where: {
      isActive: true,
      expirationDate: { gt: now },
      id: { notIn: usedCouponIds },
    },
    orderBy: { discountPercentage: "desc" },
  });

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

async function handleApply(couponCode, userId) {
  if (!couponCode) return { success: false, reason: "missing_coupon_code" };
  const now = new Date();

  const couponQuery = prisma.coupon.findUnique({
    where: { code: couponCode?.toUpperCase() },
  });
  const coupon = await withTimeout(couponQuery);

  if (!coupon) {
    return {
      success: false,
      reason: "invalid_coupon",
      message: "The coupon code you entered is not valid.",
    };
  }

  if (!coupon.isActive || new Date(coupon.expirationDate) <= now) {
    return {
      success: false,
      reason: "coupon_expired",
      message: "This coupon is no longer valid or has expired.",
    };
  }

  const usageQuery = prisma.couponUsage.findFirst({
    where: {
      userId,
      couponId: coupon.id,
    },
  });
  const usage = await withTimeout(usageQuery);

  if (usage) {
    return {
      success: false,
      reason: "coupon_already_used",
      message: "You have already used this coupon.",
    };
  }

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
