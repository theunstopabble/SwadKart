import Coupon from "../models/couponModel.js";
import CouponUsage from "../models/couponUsageModel.js";
import Order from "../models/orderModel.js";
import { sanitizeObjectId } from "../utils/sanitize.js";

// =================================================================
// 👑 ADMIN ACTIONS
// =================================================================

// @desc    Create a new Coupon
// @route   POST /api/v1/coupons
// @access  Private/Admin
export const createCoupon = async (req, res) => {
  try {
    const {
      code,
      discountPercentage,
      expirationDate,
      minOrderValue,
      maxDiscountAmount,
    } = req.body;

    const couponExists = await Coupon.findOne({ code: code.toUpperCase() });
    if (couponExists) {
      return res.status(400).json({ message: "Coupon code already exists" });
    }

    const coupon = await Coupon.create({
      code: code.toUpperCase(),
      discountPercentage,
      expirationDate,
      minOrderValue: minOrderValue || 0,
      maxDiscountAmount: maxDiscountAmount || 0,
      // Removed initialization of usedBy array
    });

    res.status(201).json(coupon);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Get All Coupons (Admin Dashboard)
// @route   GET /api/v1/coupons
// @access  Private/Admin
export const getCoupons = async (req, res) => {
  try {
    const coupons = await Coupon.find({}).sort({ createdAt: -1 });
    res.json(coupons);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update a Coupon
// @route   PUT /api/v1/coupons/:id
// @access  Private/Admin
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
    const couponId = sanitizeObjectId(req.params.id);
    const coupon = await Coupon.findById(couponId);

    if (coupon) {
      coupon.code = code ? code.toUpperCase() : coupon.code;
      coupon.discountPercentage =
        discountPercentage || coupon.discountPercentage;
      coupon.expirationDate = expirationDate || coupon.expirationDate;
      coupon.minOrderValue = minOrderValue ?? coupon.minOrderValue;
      coupon.maxDiscountAmount = maxDiscountAmount ?? coupon.maxDiscountAmount;
      coupon.isActive = isActive !== undefined ? isActive : coupon.isActive;

      const updatedCoupon = await coupon.save();
      res.json(updatedCoupon);
    } else {
      res.status(404).json({ message: "Coupon not found" });
    }
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Delete a Coupon
// @route   DELETE /api/v1/coupons/:id
// @access  Private/Admin
export const deleteCoupon = async (req, res) => {
  try {
    const couponId = sanitizeObjectId(req.params.id);
    const coupon = await Coupon.findById(couponId);
    if (coupon) {
      await coupon.deleteOne();
      res.json({ message: "Coupon removed successfully" });
    } else {
      res.status(404).json({ message: "Coupon not found" });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// =================================================================
// 🛒 USER ACTIONS
// =================================================================

// @desc    Validate Coupon (Fixed with CouponUsage Model)
// @route   POST /api/v1/coupons/validate
// @access  Private
export const validateCoupon = async (req, res) => {
  try {
    const { code, orderAmount } = req.body;
    const coupon = await Coupon.findOne({ code: code.toUpperCase() });

    if (!coupon)
      return res.status(404).json({ message: "Invalid Coupon Code" });
    if (!coupon.isActive)
      return res.status(400).json({ message: "Coupon is currently inactive" });

    // 🛡️ SECURITY: Check if user has already used this coupon using the new collection
    if (req.user) {
      const alreadyUsed = await CouponUsage.findOne({
        user: req.user._id,
        coupon: coupon._id,
      });

      if (alreadyUsed) {
        return res
          .status(400)
          .json({ message: "You have already used this coupon!" });
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
    const userId = req.user?._id;
    const currentDate = new Date();

    const query = {
      isActive: true,
      expirationDate: { $gte: currentDate },
    };
    const allCoupons = await Coupon.find(query).sort({
      discountPercentage: -1,
    });

    let unusedCoupons = allCoupons;

    if (userId) {
      const usedCouponsDocs = await CouponUsage.find({ user: userId }).select(
        "coupon",
      );
      const usedCouponIds = usedCouponsDocs.map((doc) => doc.coupon.toString());

      unusedCoupons = allCoupons.filter(
        (c) => !usedCouponIds.includes(c._id.toString()),
      );

      const orderCount = await Order.countDocuments({
        user: userId,
        isPaid: true,
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
