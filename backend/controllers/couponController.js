import Coupon from "../models/couponModel.js";
import Order from "../models/orderModel.js";

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
      usedBy: [], // Initialize empty array
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
    const coupon = await Coupon.findById(req.params.id);

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
    const coupon = await Coupon.findById(req.params.id);
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

// @desc    Validate Coupon (Fixed with 'usedBy' security)
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

    // 🛡️ SECURITY: Check if user has already used this coupon
    // Ensure req.user exists (Protected Route)
    if (req.user && coupon.usedBy.includes(req.user._id)) {
      return res
        .status(400)
        .json({ message: "You have already used this coupon!" });
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
    if (
      coupon.maxDiscountAmount > 0 &&
      discountAmount > coupon.maxDiscountAmount
    ) {
      discountAmount = coupon.maxDiscountAmount;
    }

    res.json({
      code: coupon.code,
      discountAmount: Math.round(discountAmount),
      message: "Coupon Applied Successfully! 🎉",
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Get Available Coupons (Smart List)
// @route   GET /api/v1/coupons/available
// @access  Private (Needs User Auth to check usage history)
export const getApplicableCoupons = async (req, res) => {
  try {
    const currentDate = new Date();

    // Ensure user is authenticated to filter 'usedBy'
    const userId = req.user ? req.user._id : null;

    let query = {
      isActive: true,
      expirationDate: { $gte: currentDate },
    };

    if (userId) {
      query.usedBy = { $ne: userId }; // Only show unused coupons
    }

    const allCoupons = await Coupon.find(query).sort({
      discountPercentage: -1,
    });

    // Optional: Filter logic for first-time users
    let orderCount = 0;
    if (userId) {
      orderCount = await Order.countDocuments({
        user: userId,
        isPaid: true,
      });
    }

    const applicableCoupons = allCoupons.filter((coupon) => {
      // Hide WELCOME coupons for old users
      if (orderCount > 0 && coupon.code.startsWith("WELCOME")) return false;
      return true;
    });

    res.json(applicableCoupons);
  } catch (error) {
    console.error("Coupon Fetch Error:", error);
    res.status(500).json({ message: "Server Error fetching coupons" });
  }
};
