import Product from "../models/productModel.js";
import Order from "../models/orderModel.js";
import { sanitizeObjectId, sanitizeString } from "../utils/sanitize.js";

// ============================================================
// ⭐ CREATE PRODUCT REVIEW (Verified Purchase Only)
// ============================================================
// @desc    Create new review for a dish
// @route   POST /api/v1/products/:id/reviews
// @access  Private (Logged-in users)
export const createProductReview = async (req, res) => {
  const { rating, comment } = req.body;

  try {
    const productId = sanitizeObjectId(req.params.id);
    const product = await Product.findById(productId);

    if (!product) {
      return res
        .status(404)
        .json({ message: "Dish not found in kitchen records." });
    }

    // 🛡️ 1. SECURITY PROTOCOL: Verified Purchase Check
    // User must have a delivered and paid order containing this product
    const hasBought = await Order.findOne({
      user: req.user._id,
      isPaid: true,
      orderStatus: "Delivered",
      "orderItems.product": productId,
    });

    if (!hasBought) {
      return res.status(400).json({
        message:
          "Security Alert: Review denied. You can only rate items you have successfully ordered and received. 🛡️",
      });
    }

    // 🛡️ 2. DUPLICATE CHECK: One review per user per product — atomic
    const clampedRating = Math.max(1, Math.min(5, Number(rating) || 1));
    const review = {
      name: req.user.name,
      rating: clampedRating,
      comment: sanitizeString(comment),
      user: req.user._id,
      avatar: req.user.image || "",
    };

    const result = await Product.findOneAndUpdate(
      { _id: productId, "reviews.user": { $ne: req.user._id } },
      {
        $push: { reviews: review },
        $inc: { numReviews: 1 },
      },
      { new: true }
    );

    if (!result) {
      return res.status(400).json({
        message: "Identity Match: You have already reviewed this dish.",
      });
    }

    // Calculate Average Rating with 1 decimal precision
    const totalRating = result.reviews.reduce(
      (acc, item) => item.rating + acc,
      0
    );
    result.rating = Number((totalRating / result.reviews.length).toFixed(1));
    await result.save();

    res.status(201).json({
      message: "Taste Protocol: Your feedback has been recorded! ⭐",
      rating: result.rating,
      numReviews: result.numReviews,
    });
  } catch (error) {
    console.error("Review Error:", error.message);
    res
      .status(500)
      .json({
        message: "Genie encountered a glitch while saving your review.",
      });
  }
};

// @desc    Get top rated products (Featured)
// @route   GET /api/v1/products/top
// NOTE: Duplicate of `getTopProducts` in analyticsController — kept for backward compat; prefer the analyticsController version.
export const getTopProducts = async (req, res) => {
  try {
    const products = await Product.find({ isAvailable: { $ne: false } })
      .sort({ rating: -1 })
      .limit(3);
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
