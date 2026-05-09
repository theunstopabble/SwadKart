import asyncHandler from "express-async-handler";
import Product from "../models/productModel.js";
import { sanitizeObjectId } from "../utils/sanitize.js";

// @desc    Get low-stock products (countInStock <= threshold)
// @route   GET /api/v1/inventory/low-stock
// @access  Admin / Restaurant Owner
export const getLowStockProducts = asyncHandler(async (req, res) => {
  const threshold = Math.max(0, Number(req.query.threshold) || 5);
  const restaurantId = req.query.restaurant ? sanitizeObjectId(req.query.restaurant) : null;

  const query = { countInStock: { $lte: threshold } };

  // 🛡️ Restaurant owners can only see their own restaurant's inventory
  if (req.user.role === "restaurant_owner") {
    const Restaurant = (await import("../models/restaurantModel.js")).default;
    const restaurant = await Restaurant.findOne({ owner: req.user._id }).select("_id").lean();
    if (restaurant) {
      query.restaurant = restaurant._id;
    } else {
      return res.json({ threshold, total: 0, products: [] });
    }
  } else if (restaurantId) {
    query.restaurant = restaurantId;
  }

  const products = await Product.find(query)
    .populate("restaurant", "name")
    .select("name countInStock isAvailable autoDisable lastRestocked restaurant image")
    .sort({ countInStock: 1 });

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
  const { items } = req.body; // [{ productId, quantity }]

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ message: "items array required" });
  }

  const results = [];
  for (const item of items) {
    const productId = sanitizeObjectId(item.productId);
    const qty = Math.max(0, Number(item.quantity) || 0);
    if (!productId || qty === 0) continue;

    const product = await Product.findById(productId);
    if (!product) {
      results.push({ productId: item.productId, status: "not_found" });
      continue;
    }

    // Ownership check
    const isOwner = product.user && product.user.toString() === req.user._id.toString();
    const isAdmin = req.user.role === "admin";
    if (!isAdmin && !isOwner) {
      results.push({ productId: item.productId, status: "unauthorized" });
      continue;
    }

    const previousStock = product.countInStock;
    product.countInStock += qty;

    // 📦 FEAT-14: Auto-enable when restocked from 0
    if (
      previousStock === 0 &&
      product.countInStock > 0 &&
      product.autoDisable === true &&
      product.isAvailable === false
    ) {
      product.isAvailable = true;
      product.lastRestocked = new Date();
    }

    await product.save();
    results.push({
      productId: item.productId,
      status: "restocked",
      newStock: product.countInStock,
      autoEnabled: previousStock === 0 && product.isAvailable,
    });
  }

  res.json({ processed: results.length, results });
});

// @desc    Toggle autoDisable for a product
// @route   PATCH /api/v1/inventory/:id/auto-disable
// @access  Admin / Restaurant Owner
export const toggleAutoDisable = asyncHandler(async (req, res) => {
  const productId = sanitizeObjectId(req.params.id);
  const product = await Product.findById(productId);
  if (!product) return res.status(404).json({ message: "Product not found" });

  const isOwner = product.user && product.user.toString() === req.user._id.toString();
  const isAdmin = req.user.role === "admin";
  if (!isAdmin && !isOwner) {
    return res.status(401).json({ message: "Not authorized" });
  }

  product.autoDisable = req.body.autoDisable !== undefined ? Boolean(req.body.autoDisable) : !product.autoDisable;
  await product.save();

  res.json({
    productId: product._id,
    autoDisable: product.autoDisable,
    message: `Auto-disable ${product.autoDisable ? "enabled" : "disabled"}`,
  });
});
