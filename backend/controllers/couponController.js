import prisma from "../config/prisma.js";

// =================================================================
// 👑 ADMIN ACTIONS
// =================================================================

// @desc    Create a new Coupon
export const createCoupon = async (req, res) => {
  try {
    const {
      code,
      discountPercentage,
      expirationDate,
      minOrderValue,
      maxDiscountAmount,
    } = req.body;

    const couponExists = await prisma.coupon.findUnique({
      where: { code: code.toUpperCase() },
    });
    if (couponExists) {
      return res.status(400).json({ message: "Coupon code already exists" });
    }

    if (discountPercentage !== undefined) {
      const dp = Number(discountPercentage);
      if (!Number.isFinite(dp) || dp < 0 || dp > 100) {
        return res.status(400).json({ message: "discountPercentage must be between 0 and 100" });
      }
    }

    if (expirationDate && new Date(expirationDate) <= new Date()) {
      return res.status(400).json({ message: "expirationDate must be in the future" });
    }

    const coupon = await prisma.coupon.create({
      data: {
        code: code.toUpperCase(),
        discountPercentage: Number(discountPercentage),
        expirationDate: new Date(expirationDate),
        minOrderValue: Number(minOrderValue) || 0,
        maxDiscountAmount: Number(maxDiscountAmount) || 0,
      },
    });

    res.status(201).json(coupon);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Get All Coupons (Admin Dashboard)
export const getCoupons = async (req, res) => {
  try {
    const coupons = await prisma.coupon.findMany({
      orderBy: { createdAt: "desc" },
    });
    res.json(coupons);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update a Coupon
export const updateCoupon = async (req, res) => {
  try {
    const {
      code,
      discountPercentage,
      expirationDate,
      minOrderValue,
      maxDiscountAmount,
      isActive,
    } = req.body;

    const couponId = req.params.id;
    const updateData = {};
    if (code) updateData.code = code.toUpperCase();
    if (discountPercentage !== undefined) updateData.discountPercentage = Number(discountPercentage);
    if (expirationDate) updateData.expirationDate = new Date(expirationDate);
    if (minOrderValue !== undefined) updateData.minOrderValue = Number(minOrderValue);
    if (maxDiscountAmount !== undefined) updateData.maxDiscountAmount = Number(maxDiscountAmount);
    if (isActive !== undefined) updateData.isActive = Boolean(isActive);

    const updatedCoupon = await prisma.coupon.update({
      where: { id: couponId },
      data: updateData,
    });
    res.json(updatedCoupon);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Delete a Coupon
export const deleteCoupon = async (req, res) => {
  try {
    const couponId = req.params.id;
    await prisma.coupon.delete({ where: { id: couponId } });
    res.json({ message: "Coupon removed successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// =================================================================
// 🛒 USER ACTIONS
// =================================================================

// @desc    Validate Coupon
export const validateCoupon = async (req, res) => {
  try {
    const { code, orderAmount } = req.body;
    const userId = req.user?.id || req.user?._id;

    const coupon = await prisma.coupon.findUnique({
      where: { code: code.toUpperCase() },
    });

    if (!coupon) return res.status(404).json({ message: "Invalid Coupon Code" });
    if (!coupon.isActive) return res.status(400).json({ message: "Coupon is currently inactive" });

    if (userId) {
      const alreadyUsed = await prisma.couponUsage.findFirst({
        where: { userId, couponId: coupon.id },
      });
      if (alreadyUsed) {
        return res.status(400).json({ message: "You have already used this coupon!" });
      }
    }

    if (new Date() > new Date(coupon.expirationDate)) {
      return res.status(400).json({ message: "Coupon has expired" });
    }

    if (orderAmount < coupon.minOrderValue) {
      return res.status(400).json({
        message: `Minimum order must be ₹${coupon.minOrderValue}`,
      });
    }

    let discountAmount = (orderAmount * coupon.discountPercentage) / 100;
    if (coupon.maxDiscountAmount > 0 && discountAmount > coupon.maxDiscountAmount) {
      discountAmount = coupon.maxDiscountAmount;
    }
    discountAmount = Number(discountAmount.toFixed(2));

    res.json({
      code: coupon.code,
      discountAmount,
      message: "Coupon Applied Successfully! 🎉",
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const getApplicableCoupons = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;
    const allCoupons = await prisma.coupon.findMany({
      where: {
        isActive: true,
        expirationDate: { gte: new Date() },
      },
      orderBy: { discountPercentage: "desc" },
    });

    let unusedCoupons = allCoupons;

    if (userId) {
      const usedCoupons = await prisma.couponUsage.findMany({
        where: { userId },
        select: { couponId: true },
      });
      const usedCouponIds = usedCoupons.map((u) => u.couponId);

      unusedCoupons = allCoupons.filter((c) => !usedCouponIds.includes(c.id));

      const orderCount = await prisma.order.count({
        where: { userId, isPaid: true },
      });

      if (orderCount > 0) {
        unusedCoupons = unusedCoupons.filter(
          (c) => !c.code.startsWith("WELCOME"),
        );
      }
    }

    res.json(unusedCoupons);
  } catch (error) {
    console.error("Coupon Fetch Error:", error);
    res.status(500).json({ message: "Server Error fetching coupons" });
  }
};
