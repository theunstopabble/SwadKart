import asyncHandler from "express-async-handler";
import prisma from "../config/prisma.js";

// @desc    Get frequently ordered items for "Order Again" / "Your Regular"
// @route   GET /api/v1/orders/frequent
// @access  Private
export const getFrequentItems = asyncHandler(async (req, res) => {
  const currentUserId = req.user.id || req.user._id;
  const limit = Math.min(parseInt(req.query.limit) || 6, 50);

  const orders = await prisma.order.findMany({
    where: {
      userId: currentUserId,
      isDelivered: true,
      orderStatus: "Delivered",
    },
    select: {
      orderItems: true,
      createdAt: true,
    },
  });

  const itemMap = new Map();
  for (const order of orders) {
    const items = Array.isArray(order.orderItems) ? order.orderItems : [];
    for (const item of items) {
      const prodId = (item.product || item._id || item.id)?.toString();
      if (!prodId) continue;

      if (!itemMap.has(prodId)) {
        itemMap.set(prodId, {
          product: prodId,
          restaurant: item.restaurant,
          name: item.name,
          image: item.image,
          price: item.price,
          totalOrderedQty: 0,
          lastOrderedAt: order.createdAt,
        });
      }

      const entry = itemMap.get(prodId);
      entry.totalOrderedQty += Number(item.qty || 1);
      if (new Date(order.createdAt) > new Date(entry.lastOrderedAt)) {
        entry.lastOrderedAt = order.createdAt;
      }
    }
  }

  const frequentItems = Array.from(itemMap.values())
    .sort(
      (a, b) =>
        b.totalOrderedQty - a.totalOrderedQty ||
        new Date(b.lastOrderedAt).getTime() - new Date(a.lastOrderedAt).getTime()
    )
    .slice(0, limit);

  res.json({ frequentItems });
});

// @desc    Get recent orders for "Your Regular" / Smart Reorder
// @route   GET /api/v1/orders/recent
// @access  Private
export const getRecentOrdersForReorder = asyncHandler(async (req, res) => {
  const currentUserId = req.user.id || req.user._id;

  const orders = await prisma.order.findMany({
    where: { userId: currentUserId },
    orderBy: { createdAt: "desc" },
    take: 5,
    select: {
      id: true,
      orderItems: true,
      restaurantId: true,
      totalPrice: true,
      createdAt: true,
      orderStatus: true,
      restaurant: {
        select: { id: true, name: true, image: true },
      },
    },
  });

  res.json({ orders });
});
