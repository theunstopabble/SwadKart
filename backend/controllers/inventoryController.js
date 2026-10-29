import asyncHandler from "express-async-handler";
import prisma from "../config/prisma.js";
import { sanitizeObjectId } from "../utils/sanitize.js";

// @desc    Get low-stock products (countInStock <= threshold)
// @route   GET /api/v1/inventory/low-stock
// @access  Admin / Restaurant Owner
export const getLowStockProducts = asyncHandler(async (req, res) => {
  const currentUserId = req.user.id || req.user._id;
  const rawThreshold = parseInt(req.query.threshold, 10);
  const threshold = Number.isNaN(rawThreshold) ? 5 : Math.max(0, rawThreshold);
  const restaurantId = req.query.restaurant ? sanitizeObjectId(req.query.restaurant) : null;

  const query = { countInStock: { lte: threshold } };

  // Restaurant owners can only see their own restaurant's inventory
  if (req.user.role === "restaurant_owner") {
    const restaurant = await prisma.restaurant.findFirst({
      where: { ownerId: currentUserId },
      select: { id: true },
    });
    if (restaurant) {
      query.restaurantId = restaurant.id;
    } else {
      return res.json({ threshold, total: 0, products: [] });
    }
  } else if (restaurantId) {
    query.restaurantId = restaurantId;
  }

  const products = await prisma.product.findMany({
    where: query,
    include: {
      restaurant: { select: { name: true } },
    },
    select: {
      id: true,
      name: true,
      countInStock: true,
      isAvailable: true,
      autoDisable: true,
      lastRestocked: true,
      restaurantId: true,
      image: true,
      restaurant: { select: { name: true } },
    },
    orderBy: { countInStock: "asc" },
  });

  res.json({
    threshold,
    total: products.length,
    products,
  });
});

// @desc    Bulk restock products
// @route   POST /api/v1/inventory/bulk-restock
// @access  Admin / Restaurant Owner
export const bulkRestock = asyncHandler(async (req, res) => {
  const currentUserId = req.user.id || req.user._id;
  const { items } = req.body;

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ message: "items array required" });
  }

  const results = [];
  for (const item of items) {
    const productId = sanitizeObjectId(item.productId);
    const qty = Math.max(0, Math.round(Number(item.quantity)) || 0);
    if (!productId || qty === 0) continue;

    const isAdmin = req.user.role === "admin";

    if (!isAdmin) {
      const product = await prisma.product.findUnique({
        where: { id: productId },
        select: {
          restaurant: { select: { ownerId: true } },
        },
      });
      if (!product) {
        results.push({ productId: item.productId, status: "not_found" });
        continue;
      }
      if (
        !product.restaurant ||
        product.restaurant.ownerId?.toString() !== currentUserId.toString()
      ) {
        results.push({ productId: item.productId, status: "unauthorized" });
        continue;
      }
    }

    const currentProduct = await prisma.product.findUnique({
      where: { id: productId },
    });
    if (!currentProduct) {
      results.push({ productId: item.productId, status: "not_found" });
      continue;
    }

    const newStock = currentProduct.countInStock + qty;
    const shouldAutoEnable = newStock > 0 && currentProduct.autoDisable && !currentProduct.isAvailable;

    const updated = await prisma.product.update({
      where: { id: productId },
      data: {
        countInStock: newStock,
        ...(qty > 0 ? { lastRestocked: new Date() } : {}),
        ...(shouldAutoEnable ? { isAvailable: true } : {}),
      },
    });

    results.push({
      productId: item.productId,
      status: "restocked",
      newStock: updated.countInStock,
      autoEnabled: shouldAutoEnable,
    });
  }

  res.json({ processed: results.length, results });
});

// @desc    Toggle autoDisable for a product
// @route   PATCH /api/v1/inventory/:id/auto-disable
// @access  Admin / Restaurant Owner
export const toggleAutoDisable = asyncHandler(async (req, res) => {
  const currentUserId = req.user.id || req.user._id;
  const productId = sanitizeObjectId(req.params.id);
  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: {
      restaurant: { select: { ownerId: true } },
    },
  });
  if (!product) return res.status(404).json({ message: "Product not found" });

  const isOwner =
    product.restaurant?.ownerId &&
    product.restaurant.ownerId.toString() === currentUserId.toString();
  const isAdmin = req.user.role === "admin";
  if (!isAdmin && !isOwner) {
    return res.status(403).json({ message: "Not authorized" });
  }

  const autoDisable = req.body.autoDisable;
  if (autoDisable !== undefined && typeof autoDisable !== "boolean") {
    return res.status(400).json({ message: "autoDisable must be a boolean" });
  }

  const updatedProduct = await prisma.product.update({
    where: { id: productId },
    data: {
      autoDisable: autoDisable !== undefined ? autoDisable : !product.autoDisable,
    },
  });

  res.json({
    productId: updatedProduct.id,
    autoDisable: updatedProduct.autoDisable,
    message: `Auto-disable ${updatedProduct.autoDisable ? "enabled" : "disabled"}`,
  });
});
