/**
 * Unit Tests for Coupon Tool
 *
 * Tests specific examples and edge cases for the coupon tool.
 *
 * **Validates: Requirements 3.4, 3.5, 3.8, 3.9**
 */

import { jest } from "@jest/globals";

// ─── Mock setup ────────────────────────────────────────────────────────────────

jest.unstable_mockModule("../../models/couponModel.js", () => ({
  default: {
    find: jest.fn(),
    findOne: jest.fn(),
  },
}));

jest.unstable_mockModule("../../models/couponUsageModel.js", () => ({
  default: {
    find: jest.fn(),
    findOne: jest.fn(),
  },
}));

// ─── Import after mocks ────────────────────────────────────────────────────────

const { execute } = await import("../../services/chat/tools/couponTool.js");
const CouponModel = (await import("../../models/couponModel.js")).default;
const CouponUsageModel = (await import("../../models/couponUsageModel.js")).default;

// ─── Tests ─────────────────────────────────────────────────────────────────────

describe("couponTool - unit tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("list action", () => {
    /**
     * Validates: Requirement 3.4
     * IF the Coupon_Tool `list` action finds no available coupons,
     * THEN it SHALL return `no_coupons_available`.
     */
    test("empty coupon list returns no_coupons_available", async () => {
      const userId = "user123";

      // CouponUsage.find returns empty (no used coupons)
      CouponUsageModel.find.mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue([]),
        }),
      });

      // Coupon.find returns empty array (no active coupons)
      CouponModel.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue([]),
        }),
      });

      const result = await execute({ action: "list", userId });

      expect(result.success).toBe(false);
      expect(result.reason).toBe("no_coupons_available");
      expect(result.message).toBeDefined();
    });

    /**
     * Validates: Requirement 3.5
     * Boundary test: coupon expiring at end of today is still valid
     * (expirationDate > now means a coupon expiring at 23:59:59 today is still valid)
     */
    test("coupon expiring today (boundary) is still valid in list", async () => {
      const userId = "user123";

      // Set expiration to end of today (23:59:59.999)
      const endOfToday = new Date();
      endOfToday.setHours(23, 59, 59, 999);

      const validCoupon = {
        _id: "aabbccddee112233ff445566",
        code: "TODAY50",
        discountPercentage: 50,
        maxDiscountAmount: 500,
        minOrderValue: 200,
        expirationDate: endOfToday,
        isActive: true,
      };

      // CouponUsage.find returns empty (no used coupons)
      CouponUsageModel.find.mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue([]),
        }),
      });

      // Coupon.find returns the coupon (DB would filter correctly since expirationDate > now)
      CouponModel.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue([validCoupon]),
        }),
      });

      const result = await execute({ action: "list", userId });

      expect(result.success).toBe(true);
      expect(result.data.coupons).toHaveLength(1);
      expect(result.data.coupons[0].code).toBe("TODAY50");
      expect(result.data.coupons[0].discountPercentage).toBe(50);
    });
  });

  describe("apply action", () => {
    /**
     * Validates: Requirements 3.8, 3.9
     * IF the user has already used the coupon, THEN return `coupon_already_used`.
     */
    test("apply with already-used coupon returns coupon_already_used", async () => {
      const userId = "user123";
      const couponCode = "SAVE20";

      const coupon = {
        _id: "aabbccddee112233ff445566",
        code: "SAVE20",
        discountPercentage: 20,
        maxDiscountAmount: 200,
        minOrderValue: 100,
        expirationDate: new Date("2027-06-01"),
        isActive: true,
      };

      // Coupon.findOne returns the coupon (it exists, is active, not expired)
      CouponModel.findOne.mockReturnValue({
        lean: jest.fn().mockResolvedValue(coupon),
      });

      // CouponUsage.findOne returns a record (user already used this coupon)
      CouponUsageModel.findOne.mockReturnValue({
        lean: jest.fn().mockResolvedValue({
          user: userId,
          coupon: coupon._id,
          order: "order123",
        }),
      });

      const result = await execute({ action: "apply", couponCode, userId });

      expect(result.success).toBe(false);
      expect(result.reason).toBe("coupon_already_used");
      expect(result.message).toBeDefined();
    });
  });
});
