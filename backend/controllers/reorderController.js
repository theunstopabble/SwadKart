import asyncHandler from "express-async-handler";
import Order from "../models/orderModel.js";

// @desc    Get frequently ordered items for "Order Again" / "Your Regular"
// @route   GET /api/v1/orders/frequent
// @access  Private
export const getFrequentItems = asyncHandler(async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 6, 50);

  // Aggregate most ordered products from user's delivered orders
  // 🛡️ FIX: Removed non-existent 'status' field. Order model uses 'isDelivered' and 'orderStatus'.
  const frequentItems = await Order.aggregate([
    {
      $match: {
        user: req.user._id,
        isDelivered: true,
        orderStatus: "Delivered",
      },
    },
    { $unwind: "$orderItems" },
    {
      $group: {
        _id: "$orderItems.product",
        productId: { $first: "$orderItems.product" },
        restaurant: { $first: "$orderItems.restaurant" },
        name: { $first: "$orderItems.name" },
        image: { $first: "$orderItems.image" },
        price: { $last: "$orderItems.price" },
        count: { $sum: "$orderItems.qty" },
        lastOrderedAt: { $max: "$createdAt" },
      },
    },
    { $sort: { count: -1, lastOrderedAt: -1 } },
    { $limit: limit },
    {
      $project: {
        _id: 0,
        product: "$productId",
        restaurant: 1,
        name: 1,
        image: 1,
        price: 1,
        totalOrderedQty: "$count",
        lastOrderedAt: 1,
      },
    },
  ]);

  res.json({ frequentItems });
});

// @desc    Get recent orders for "Your Regular" / Smart Reorder
// @route   GET /api/v1/orders/recent
// @access  Private
export const getRecentOrdersForReorder = asyncHandler(async (req, res) => {
  const orders = await Order.find({ user: req.user._id })
    .sort({ createdAt: -1 })
    .limit(5)
    .select("orderItems restaurant totalPrice createdAt orderStatus")
    .populate("restaurant", "name image")
    .lean();

  res.json({ orders });
});
