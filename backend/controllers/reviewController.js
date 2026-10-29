import prisma from "../config/prisma.js";
import { sanitizeObjectId, sanitizeString } from "../utils/sanitize.js";

// ============================================================
// ⭐ CREATE PRODUCT REVIEW (Verified Purchase Only)
// ============================================================
// @desc    Create new review for a dish
// @route   POST /api/v1/products/:id/reviews
// @access  Private (Logged-in users)
export const createProductReview = async (req, res) => {
  const currentUserId = req.user.id || req.user._id;
  const { rating, comment } = req.body;

  try {
    const productId = sanitizeObjectId(req.params.id);

    // 🛡️ 1. SECURITY PROTOCOL: Verified Purchase Check
    // User must have a delivered and paid order containing this product
    const userDeliveredOrders = await prisma.order.findMany({
      where: {
        userId: currentUserId,
        isPaid: true,
        orderStatus: "Delivered",
      },
      select: { orderItems: true },
    });

    const hasBought = userDeliveredOrders.some((order) => {
      const items = Array.isArray(order.orderItems) ? order.orderItems : [];
      return items.some(
        (item) =>
          item.product?.toString() === productId ||
          item._id?.toString() === productId ||
          item.id?.toString() === productId
      );
    });

    if (!hasBought) {
      return res.status(400).json({
        message:
          "Security Alert: Review denied. You can only rate items you have successfully ordered and received. 🛡️",
      });
    }

    const product = await prisma.product.findUnique({
      where: { id: productId },
    });
    if (!product) {
      return res.status(404).json({ message: "Dish not found in kitchen records." });
    }

    // 🛡️ 2. DUPLICATE CHECK: One review per user per product
    const existingReview = await prisma.review.findFirst({
      where: {
        productId,
        userId: currentUserId,
      },
    });

    if (existingReview) {
      return res.status(400).json({
        message: "Identity Match: You have already reviewed this dish.",
      });
    }

    const clampedRating = Math.max(1, Math.min(5, Number(rating) || 1));

    await prisma.review.create({
      data: {
        productId,
        restaurantId: product.restaurantId,
        userId: currentUserId,
        name: req.user.name,
        rating: clampedRating,
        comment: sanitizeString(comment),
        avatar: req.user.image || "",
      },
    });

    // Recalculate product rating & numReviews
    const agg = await prisma.review.aggregate({
      where: { productId },
      _avg: { rating: true },
      _count: { id: true },
    });

    const updatedRating = Number((agg._avg.rating || 0).toFixed(1));
    const numReviews = agg._count.id || 0;

    const updatedProduct = await prisma.product.update({
      where: { id: productId },
      data: {
        rating: updatedRating,
        numReviews,
      },
    });

    res.status(201).json({
      message: "Taste Protocol: Your feedback has been recorded! ⭐",
      rating: updatedProduct.rating,
      numReviews: updatedProduct.numReviews,
    });
  } catch (error) {
    console.error("Review Error:", error.message);
    res.status(500).json({
      message: "Genie encountered a glitch while saving your review.",
    });
  }
};

// @desc    Get top rated products (Featured)
// @route   GET /api/v1/products/top
// NOTE: Duplicate of `getTopProducts` in analyticsController — kept for backward compat.
export const getTopProducts = async (req, res) => {
  try {
    const products = await prisma.product.findMany({
      where: { isAvailable: true },
      orderBy: { rating: "desc" },
      take: 3,
    });
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
