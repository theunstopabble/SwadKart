import Coupon from "../models/couponModel.js";
import Order from "../models/orderModel.js"; // 👈 IMPORT ADDED (Required for Smart Filtering)

// @desc    Create a new Coupon (Admin Only)
// @route   POST /api/coupons
export const createCoupon = async (req, res) => {
  const {
    code,
    discountPercentage,
    expirationDate,
    minOrderValue,
    maxDiscountAmount,
  } = req.body;

  const couponExists = await Coupon.findOne({ code });

  if (couponExists) {
    res.status(400);
    throw new Error("Coupon code already exists");
  }

  const coupon = await Coupon.create({
    code: code.toUpperCase(), // Ensure uppercase storage
    discountPercentage,
    expirationDate,
    minOrderValue,
    maxDiscountAmount,
  });

  if (coupon) {
    res.status(201).json(coupon);
  } else {
    res.status(400);
    throw new Error("Invalid coupon data");
  }
};

// @desc    Validate Coupon (User - Apply in Cart)
// @route   POST /api/coupons/validate
export const validateCoupon = async (req, res) => {
  const { code, orderAmount } = req.body;

  const coupon = await Coupon.findOne({ code: code.toUpperCase() });

  // 1. Check if exists
  if (!coupon) {
    res.status(404);
    throw new Error("Invalid Coupon Code");
  }

  // 2. Check if expired
  if (new Date() > coupon.expirationDate) {
    res.status(400);
    throw new Error("Coupon has expired");
  }

  // 3. Check Active Status
  if (!coupon.isActive) {
    res.status(400);
    throw new Error("Coupon is currently inactive");
  }

  // 4. Check Minimum Order Amount
  if (orderAmount < coupon.minOrderValue) {
    res.status(400);
    throw new Error(`Minimum order amount must be ₹${coupon.minOrderValue}`);
  }

  // 5. Calculate Discount
  let discountAmount = (orderAmount * coupon.discountPercentage) / 100;

  // 6. Cap discount at Max Amount
  if (discountAmount > coupon.maxDiscountAmount) {
    discountAmount = coupon.maxDiscountAmount;
  }

  res.json({
    code: coupon.code,
    discountAmount: Math.round(discountAmount), // Round figure
    message: "Coupon Applied Successfully!",
  });
};

// @desc    Get All Coupons (Admin Dashboard)
// @route   GET /api/coupons
export const getCoupons = async (req, res) => {
  const coupons = await Coupon.find({}).sort({ createdAt: -1 });
  res.json(coupons);
};

// @desc    Get Applicable Coupons for Logged in User (Smart Dropdown)
// @route   GET /api/coupons/available
export const getApplicableCoupons = async (req, res) => {
  try {
    const currentDate = new Date();

    // 1. Fetch all active and non-expired coupons
    const allCoupons = await Coupon.find({
      isActive: true,
      expirationDate: { $gte: currentDate }, // Only future dates
    }).sort({ discountPercentage: -1 }); // Show highest discount first

    // 2. Check User History (Count paid orders)
    // Req.user comes from 'protect' middleware
    const orderCount = await Order.countDocuments({
      user: req.user._id,
      isPaid: true,
    });

    // 3. Filter Logic
    const applicableCoupons = allCoupons.filter((coupon) => {
      // If user has orders (Old User) -> Hide 'WELCOME' coupons
      if (orderCount > 0 && coupon.code.toUpperCase().startsWith("WELCOME")) {
        return false;
      }
      return true; // Show all other coupons
    });

    res.json(applicableCoupons);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error fetching coupons" });
  }
};
