import Coupon from "../models/couponModel.js";
import Order from "../models/orderModel.js"; // 👈 Required for Smart Filtering logic

// =================================================================
// 👑 ADMIN ACTIONS (Create, Update, Delete, Get All)
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

    // Check if code exists
    const couponExists = await Coupon.findOne({ code: code.toUpperCase() });
    if (couponExists) {
      res.status(400);
      throw new Error("Coupon code already exists");
    }

    const coupon = await Coupon.create({
      code: code.toUpperCase(),
      discountPercentage,
      expirationDate,
      minOrderValue: minOrderValue || 0,
      maxDiscountAmount: maxDiscountAmount || 0,
    });

    if (coupon) {
      res.status(201).json(coupon);
    } else {
      res.status(400);
      throw new Error("Invalid coupon data");
    }
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Get All Coupons (For Admin Dashboard)
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

      // Explicit check for boolean to allow setting it to false
      coupon.isActive = isActive !== undefined ? isActive : coupon.isActive;

      const updatedCoupon = await coupon.save();
      res.json(updatedCoupon);
    } else {
      res.status(404);
      throw new Error("Coupon not found");
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
      res.status(404);
      throw new Error("Coupon not found");
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// =================================================================
// 🛒 USER ACTIONS (Validate, Get Available)
// =================================================================

// @desc    Validate Coupon (User applying in Cart/Checkout)
// @route   POST /api/v1/coupons/validate
// @access  Private
export const validateCoupon = async (req, res) => {
  try {
    const { code, orderAmount } = req.body;

    const coupon = await Coupon.findOne({ code: code.toUpperCase() });

    // 1. Check Existence
    if (!coupon) {
      res.status(404);
      throw new Error("Invalid Coupon Code");
    }

    // 2. Check Expiration
    if (new Date() > new Date(coupon.expirationDate)) {
      res.status(400);
      throw new Error("Coupon has expired");
    }

    // 3. Check Active Status
    if (!coupon.isActive) {
      res.status(400);
      throw new Error("Coupon is currently inactive");
    }

    // 4. Check Minimum Order
    if (orderAmount < coupon.minOrderValue) {
      res.status(400);
      throw new Error(
        `Minimum order amount must be ₹${coupon.minOrderValue} to use this coupon`
      );
    }

    // 5. Calculate Discount
    let discountAmount = (orderAmount * coupon.discountPercentage) / 100;

    // 6. Cap Max Discount (if set)
    if (
      coupon.maxDiscountAmount > 0 &&
      discountAmount > coupon.maxDiscountAmount
    ) {
      discountAmount = coupon.maxDiscountAmount;
    }

    res.json({
      code: coupon.code,
      discountAmount: Math.round(discountAmount), // Round for payment gateways
      message: "Coupon Applied Successfully!",
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Get Applicable Coupons for User (Smart List)
// @route   GET /api/v1/coupons/available
// @access  Private
export const getApplicableCoupons = async (req, res) => {
  try {
    const currentDate = new Date();

    // 1. Fetch active & future coupons
    const allCoupons = await Coupon.find({
      isActive: true,
      expirationDate: { $gte: currentDate },
    }).sort({ discountPercentage: -1 });

    // 2. Check User History for filtering
    const orderCount = await Order.countDocuments({
      user: req.user._id,
      isPaid: true,
    });

    // 3. Filter Logic (Example: Hide 'WELCOME' code if old user)
    const applicableCoupons = allCoupons.filter((coupon) => {
      if (orderCount > 0 && coupon.code.toUpperCase().startsWith("WELCOME")) {
        return false;
      }
      return true;
    });

    res.json(applicableCoupons);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error fetching coupons" });
  }
};
