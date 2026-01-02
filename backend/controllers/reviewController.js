import Product from "../models/productModel.js";
import Order from "../models/orderModel.js";

// ============================================================
// ⭐ CREATE PRODUCT REVIEW (Verified Purchase Only)
// ============================================================
// @desc    Create new review for a dish
// @route   POST /api/v1/products/:id/reviews
// @access  Private (Logged-in users)
export const createProductReview = async (req, res) => {
  const { rating, comment } = req.body;

  try {
    const product = await Product.findById(req.params.id);

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
      "orderItems.product": req.params.id,
    });

    if (!hasBought) {
      return res.status(400).json({
        message:
          "Security Alert: Review denied. You can only rate items you have successfully ordered and received. 🛡️",
      });
    }

    // 🛡️ 2. DUPLICATE CHECK: One review per user per product
    const alreadyReviewed = product.reviews.find(
      (r) => r.user.toString() === req.user._id.toString()
    );

    if (alreadyReviewed) {
      return res
        .status(400)
        .json({
          message: "Identity Match: You have already reviewed this dish.",
        });
    }

    // ✅ 3. CONSTRUCT REVIEW OBJECT
    const review = {
      name: req.user.name,
      rating: Number(rating),
      comment,
      user: req.user._id,
      // Optional: Agar profile pic handle kar rahe ho to yahan add kar sakte ho
      avatar: req.user.avatar || "",
    };

    // ✅ 4. UPDATE PRODUCT DATA
    product.reviews.push(review);
    product.numReviews = product.reviews.length;

    // Calculate Average Rating with 1 decimal precision
    const totalRating = product.reviews.reduce(
      (acc, item) => item.rating + acc,
      0
    );
    product.rating = Number(totalRating / product.reviews.length).toFixed(1);

    await product.save();

    res.status(201).json({
      message: "Taste Protocol: Your feedback has been recorded! ⭐",
      rating: product.rating,
      numReviews: product.numReviews,
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
export const getTopProducts = async (req, res) => {
  const products = await Product.find({}).sort({ rating: -1 }).limit(3);
  res.json(products);
};
