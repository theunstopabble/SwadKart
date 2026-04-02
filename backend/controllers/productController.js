import Product from "../models/productModel.js";
import Restaurant from "../models/restaurantModel.js"; // Required import
import { getCache, setCache, clearCache } from "../utils/cache.js";
import asyncHandler from "express-async-handler";

// ============================================================
// PUBLIC ROUTES
// ============================================================

// @desc    Fetch all products
export const getProducts = async (req, res) => {
  try {
    // 🚀 PERFORMANCE FIX: Pagination variables
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    // Search query builder
    // 🛡️ SECURITY FIX (BUG-6): Escape user input to prevent regex injection (ReDoS)
    const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const keyword = req.query.keyword
      ? { name: { $regex: escapeRegex(req.query.keyword), $options: "i" } }
      : {};

    const categoryFilter = req.query.category
      ? { category: req.query.category }
      : {};

    const restaurantFilter = req.query.restaurant
      ? { restaurant: req.query.restaurant }
      : {};

    const query = { ...keyword, ...categoryFilter, ...restaurantFilter };

    const count = await Product.countDocuments(query);

    const products = await Product.find(query)
      .populate("restaurant", "name")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    res.json({
      data: products,
      metadata: {
        total: count,
        page,
        pages: Math.ceil(count / limit),
        limit,
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch products" });
  }
};

// @desc    Fetch single product
export const getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).populate(
      "restaurant",
      "name isOpenNow",
    );
    if (product) res.json(product);
    else res.status(404).json({ message: "Product not found" });
  } catch (error) {
    res.status(404).json({ message: "Product not found" });
  }
};

// @desc    Fetch products by Restaurant ID
// FIX: Map req.params.id properly to restaurantId
export const getProductsByRestaurant = asyncHandler(async (req, res) => {
  const restaurantId = req.params.id; // 👈 BUG FIXED HERE: Extracted 'id' instead of 'restaurantId'
  const cacheKey = `menu_rest_${restaurantId}`;

  let products = await getCache(cacheKey);

  if (!products) {
    products = await Product.find({ restaurant: restaurantId });
    await setCache(cacheKey, products, 3600);
  }

  res.status(200).json(products);
});

// ============================================================
// PROTECTED ROUTES (Admin / Restaurant Owner)
// ============================================================

// @desc    Create a product (FIXED: Supports Admin adding to Dummy Shops)
export const createProduct = asyncHandler(async (req, res) => {
  try {
    const {
      name,
      price,
      description,
      image,
      category,
      countInStock,
      isVeg,
      orderIndex,
      variants,
      addons,
      restaurantId, // Owner or Restaurant ID from frontend
    } = req.body;

    let restaurant;

    // LOGIC: Find the correct Restaurant
    if (restaurantId) {
      // CASE 1: Admin selected from dropdown
      restaurant = await Restaurant.findOne({ owner: restaurantId });

      // If not found by Owner ID, check if it is a direct Restaurant ID
      if (!restaurant) {
        restaurant = await Restaurant.findById(restaurantId);
      }
    } else {
      // CASE 2: Owner is adding (Logged in user is the owner)
      restaurant = await Restaurant.findOne({ owner: req.user._id });
    }

    // If still not found
    if (!restaurant) {
      return res.status(404).json({
        message:
          "No Restaurant found for this owner. Ensure Dummy Shop is linked correctly.",
      });
    }

    // Create Product
    const product = new Product({
      name,
      price,
      description,
      image: image || "https://placehold.co/400",
      category,
      isVeg: isVeg === undefined ? true : isVeg,
      orderIndex: orderIndex || 0,

      restaurant: restaurant._id, // Actual Restaurant ID from Database
      user: req.user._id, // Created By (Admin/User)

      countInStock: countInStock || 100,
      variants: variants || [],
      addons: addons || [],
    });

    const createdProduct = await product.save();

    // Invalidating cache with correct ID
    await clearCache(`menu_rest_${restaurant._id}`);

    res.status(201).json(createdProduct);
  } catch (error) {
    console.error("Create Product Error:", error.message);
    res.status(400).json({ message: error.message });
  }
}); // Fixed Syntax Error

// @desc    Update a product
export const updateProduct = asyncHandler(async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (product) {
      // SECURITY Check
      const isOwner =
        product.user && product.user.toString() === req.user._id.toString();
      const isAdmin = req.user.role === "admin";

      if (!isAdmin && !isOwner) {
        return res
          .status(401)
          .json({ message: "Not authorized to update this product" });
      }

      // Update fields
      product.name = req.body.name || product.name;
      product.price = req.body.price || product.price;
      product.description = req.body.description || product.description;
      product.image = req.body.image || product.image;
      product.category = req.body.category || product.category;
      product.countInStock =
        req.body.countInStock !== undefined
          ? req.body.countInStock
          : product.countInStock;
      product.isVeg =
        req.body.isVeg !== undefined ? req.body.isVeg : product.isVeg;

      if (req.body.variants) product.variants = req.body.variants;
      if (req.body.addons) product.addons = req.body.addons;

      const updatedProduct = await product.save();

      // Fixed Variable Shadowing (already fetched above)
      await clearCache(`menu_rest_${product.restaurant}`);

      if (req.io) req.io.emit("productUpdated", updatedProduct);
      res.json(updatedProduct);
    } else {
      res.status(404).json({ message: "Product not found" });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}); // Fixed Syntax Error

// @desc    Delete a product
export const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (product) {
      const isOwner =
        product.user && product.user.toString() === req.user._id.toString();
      const isAdmin = req.user.role === "admin";

      if (isAdmin || isOwner) {
        const restaurantId = product.restaurant;
        await product.deleteOne();

        // Clear cache on delete as well
        await clearCache(`menu_rest_${restaurantId}`);

        res.json({ message: "Product removed" });
      } else {
        res.status(401).json({ message: "Not authorized" });
      }
    } else {
      res.status(404).json({ message: "Product not found" });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Toggle Product Availability
export const toggleProductStock = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    const isAdmin = req.user.role === "admin";
    const isOwner =
      product.user && product.user.toString() === req.user._id.toString();

    if (isAdmin || isOwner) {
      const previousStock = product.countInStock;
      product.countInStock = previousStock > 0 ? 0 : (product.originalStock || 100);
      const updatedProduct = await product.save();

      // Clear cache on stock change
      await clearCache(`menu_rest_${product.restaurant}`);

      if (req.io) {
        req.io.emit("productUpdated", updatedProduct);
      }

      return res.json(updatedProduct);
    } else {
      return res.status(401).json({
        message: "Unauthorized: You don't own this product.",
      });
    }
  } catch (error) {
    console.error("Toggle Error:", error);
    res.status(500).json({ message: error.message });
  }
};

// ============================================================
// REVIEW SYSTEM
// ============================================================
export const createProductReview = async (req, res) => {
  try {
    const { rating, comment } = req.body;
    const product = await Product.findById(req.params.id);

    if (product) {
      const alreadyReviewed = product.reviews.find(
        (r) => r.user.toString() === req.user._id.toString(),
      );

      if (alreadyReviewed) {
        return res.status(400).json({ message: "Product already reviewed" });
      }

      const review = {
        name: req.user.name,
        rating: Number(rating),
        comment,
        user: req.user._id,
      };

      product.reviews.push(review);
      product.numReviews = product.reviews.length;

      product.rating =
        product.reviews.reduce((acc, item) => item.rating + acc, 0) /
        product.reviews.length;

      await product.save();

      // Optional: Clear cache when reviews are updated
      await clearCache(`menu_rest_${product.restaurant}`);

      res.status(201).json({ message: "Review added" });
    } else {
      res.status(404).json({ message: "Product not found" });
    }
  } catch (error) {
    // 👈 YAHAN CATCH BLOCK AUR MISSING BRACKETS THEEK KIYE GAYE HAIN
    res.status(500).json({ message: error.message });
  }
};
