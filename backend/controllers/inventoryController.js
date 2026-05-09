import asyncHandler from "express-async-handler";
import Product from "../models/productModel.js";
import { sanitizeObjectId } from "../utils/sanitize.js";

// @desc    Get low-stock products (countInStock <= threshold)
// @route   GET /api/v1/inventory/low-stock
// @access  Admin / Restaurant Owner
export const getLowStockProducts = asyncHandler(async (req, res) => {
  const rawThreshold = parseInt(req.query.threshold, 10);
  const threshold = Number.isNaN(rawThreshold) ? 5 : Math.max(0, rawThreshold);
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
      const product = await Product.findById(productId).select("user");
      if (!product) {
        results.push({ productId: item.productId, status: "not_found" });
        continue;
      }
      if (product.user?.toString() !== req.user._id.toString()) {
        results.push({ productId: item.productId, status: "unauthorized" });
        continue;
      }
    }

    const updated = await Product.findOneAndUpdate(
      { _id: productId, ...(isAdmin ? {} : { user: req.user._id }) },
      {
        $inc: { countInStock: qty },
        $set: {
          ...(qty > 0 ? { lastRestocked: new Date() } : {}),
        },
      },
      { new: true },
    );

    if (!updated) {
      results.push({ productId: item.productId, status: "not_found" });
      continue;
    }

    if (updated.countInStock > 0 && updated.autoDisable && !updated.isAvailable) {
      await Product.findByIdAndUpdate(productId, { isAvailable: true });
      results.push({
        productId: item.productId,
        status: "restocked",
        newStock: updated.countInStock,
        autoEnabled: true,
      });
    } else {
      results.push({
        productId: item.productId,
        status: "restocked",
        newStock: updated.countInStock,
        autoEnabled: false,
      });
    }
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

  const autoDisable = req.body.autoDisable;
  if (autoDisable !== undefined && typeof autoDisable !== "boolean") {
    return res.status(400).json({ message: "autoDisable must be a boolean" });
  }
  product.autoDisable = autoDisable !== undefined ? autoDisable : !product.autoDisable;
  await product.save();

  res.json({
    productId: product._id,
    autoDisable: product.autoDisable,
    message: `Auto-disable ${product.autoDisable ? "enabled" : "disabled"}`,
  });
});
