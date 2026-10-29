import prisma from "../config/prisma.js";
import { getCache, setCache, invalidateByTag } from "../utils/cache.js";
import asyncHandler from "express-async-handler";
import { sanitizeString } from "../utils/sanitize.js";

// ============================================================
// PUBLIC ROUTES
// ============================================================

// @desc    Fetch all products
export const getProducts = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const skip = (page - 1) * limit;

    const where = {};
    if (req.query.keyword) {
      where.name = { contains: req.query.keyword, mode: "insensitive" };
    }
    if (req.query.category) {
      where.category = req.query.category;
    }
    if (req.query.restaurant) {
      where.restaurantId = req.query.restaurant;
    }

    const count = await prisma.product.count({ where });
    const products = await prisma.product.findMany({
      where,
      include: {
        restaurant: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    });

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
    const product = await prisma.product.findUnique({
      where: { id: req.params.id },
      include: {
        restaurant: { select: { id: true, name: true } },
        reviews: true,
      },
    });
    if (product) res.json(product);
    else res.status(404).json({ message: "Product not found" });
  } catch (error) {
    res.status(404).json({ message: "Product not found" });
  }
};

// @desc    Fetch products by Restaurant ID
export const getProductsByRestaurant = asyncHandler(async (req, res) => {
  const inputId = req.params.id;
  let restaurant = await prisma.restaurant.findUnique({ where: { id: inputId } });
  if (!restaurant) {
    restaurant = await prisma.restaurant.findFirst({ where: { ownerId: inputId } });
  }
  if (!restaurant) return res.status(200).json([]);

  const actualRestaurantId = restaurant.id;
  const cacheKey = `menu_rest_${actualRestaurantId}`;
  let products = await getCache(cacheKey);

  if (!products) {
    products = await prisma.product.findMany({
      where: { restaurantId: actualRestaurantId },
      orderBy: { orderIndex: "asc" },
    });
    await setCache(cacheKey, products, 3600);
  }
  res.status(200).json(products);
});

// ============================================================
// PROTECTED ROUTES (Admin / Restaurant Owner)
// ============================================================

// @desc    Create a product
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
      restaurantId,
    } = req.body;

    const userId = req.user.id || req.user._id;
    let restaurant;

    if (restaurantId) {
      restaurant = await prisma.restaurant.findFirst({ where: { ownerId: restaurantId } });
      if (!restaurant) {
        restaurant = await prisma.restaurant.findUnique({ where: { id: restaurantId } });
      }
    } else {
      restaurant = await prisma.restaurant.findFirst({ where: { ownerId: userId } });
    }

    if (!restaurant) {
      return res.status(404).json({
        message: "No Restaurant found for this owner. Ensure Shop is linked correctly.",
      });
    }

    const stock = countInStock !== undefined ? Number(countInStock) : 0;

    const product = await prisma.product.create({
      data: {
        name,
        price: Number(price),
        description: description || "",
        image: image || "https://placehold.co/400",
        category,
        isVeg: isVeg === undefined ? true : Boolean(isVeg),
        orderIndex: orderIndex || 0,
        restaurantId: restaurant.id,
        userId,
        countInStock: stock,
        isAvailable: stock > 0,
        variants: variants || [],
        addons: addons || [],
      },
    });

    await invalidateByTag("products:restaurant");
    res.status(201).json(product);
  } catch (error) {
    console.error("Create Product Error:", error.message);
    res.status(400).json({ message: error.message });
  }
});

// @desc    Update a product
export const updateProduct = asyncHandler(async (req, res) => {
  try {
    const productId = req.params.id;
    const userId = req.user.id || req.user._id;
    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: { restaurant: { select: { ownerId: true } } },
    });

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    const isAdmin = req.user.role === "admin";
    const isOwner = product.restaurant && product.restaurant.ownerId === userId;

    if (!isAdmin && !isOwner) {
      return res.status(401).json({ message: "Not authorized to update this product" });
    }

    const updateData = {};
    if (req.body.name !== undefined) updateData.name = sanitizeString(req.body.name);
    if (req.body.price !== undefined) updateData.price = Number(req.body.price);
    if (req.body.description !== undefined) updateData.description = sanitizeString(req.body.description);
    if (req.body.image) updateData.image = req.body.image;
    if (req.body.category) updateData.category = req.body.category;
    if (req.body.isVeg !== undefined) updateData.isVeg = Boolean(req.body.isVeg);

    if (req.body.countInStock !== undefined) {
      const newStock = Number(req.body.countInStock);
      updateData.countInStock = newStock;
      if (product.countInStock === 0 && newStock > 0 && product.autoDisable && !product.isAvailable) {
        updateData.isAvailable = true;
        updateData.lastRestocked = new Date();
      }
    }

    if (req.body.scheduleEnabled !== undefined) {
      updateData.scheduleEnabled = Boolean(req.body.scheduleEnabled);
    }
    if (req.body.schedule) {
      updateData.schedule = {
        days: req.body.schedule.days || [],
        startTime: req.body.schedule.startTime || "00:00",
        endTime: req.body.schedule.endTime || "23:59",
      };
    }

    if (req.body.variants) updateData.variants = req.body.variants;
    if (req.body.addons) updateData.addons = req.body.addons;

    const updatedProduct = await prisma.product.update({
      where: { id: productId },
      data: updateData,
    });

    await invalidateByTag("products:restaurant");

    if (req.io) req.io.emit("productUpdated", updatedProduct);
    res.json(updatedProduct);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Delete a product
export const deleteProduct = asyncHandler(async (req, res) => {
  try {
    const productId = req.params.id;
    const userId = req.user.id || req.user._id;
    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: { restaurant: { select: { ownerId: true } } },
    });

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    const isAdmin = req.user.role === "admin";
    const isOwner = product.restaurant && product.restaurant.ownerId === userId;

    if (isAdmin || isOwner) {
      await prisma.product.delete({ where: { id: productId } });
      await invalidateByTag("products:restaurant");
      res.json({ message: "Product removed" });
    } else {
      res.status(401).json({ message: "Not authorized" });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Toggle Product Availability
export const toggleProductStock = asyncHandler(async (req, res) => {
  try {
    const productId = req.params.id;
    const userId = req.user.id || req.user._id;
    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: { restaurant: { select: { ownerId: true } } },
    });

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    const isAdmin = req.user.role === "admin";
    const isOwner = product.restaurant && product.restaurant.ownerId === userId;

    if (isAdmin || isOwner) {
      const updatedProduct = await prisma.product.update({
        where: { id: productId },
        data: { isAvailable: !product.isAvailable },
      });

      await invalidateByTag("products:restaurant");

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
    res.status(500).json({ message: error.message });
  }
});

// @desc    Batch-reorder menu items (drag-and-drop)
export const reorderProducts = asyncHandler(async (req, res) => {
  const { items } = req.body;
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ message: "Items array is required" });
  }

  const userId = req.user.id || req.user._id;
  const isAdmin = req.user.role === "admin";
  let restaurantId;

  if (!isAdmin) {
    const restaurant = await prisma.restaurant.findFirst({ where: { ownerId: userId } });
    if (!restaurant) {
      return res.status(404).json({ message: "Restaurant not found" });
    }
    restaurantId = restaurant.id;
  }

  const updates = [];
  for (const item of items) {
    const itemId = item.id || item._id;
    if (!itemId || typeof item.orderIndex !== "number") continue;

    updates.push(
      prisma.product.update({
        where: { id: itemId },
        data: { orderIndex: item.orderIndex },
      }),
    );
  }

  if (updates.length === 0) {
    return res.status(400).json({ message: "No valid items to reorder" });
  }

  await prisma.$transaction(updates);
  await invalidateByTag("products:restaurant");

  if (req.io) req.io.emit("menuReordered", { items });
  res.json({ message: "Menu order updated", updated: updates.length });
});

// ============================================================
// REVIEW SYSTEM
// ============================================================
export const createProductReview = async (req, res) => {
  try {
    const { rating, comment } = req.body;
    const productId = req.params.id;
    const userId = req.user.id || req.user._id;

    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: { reviews: true },
    });

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    const alreadyReviewed = product.reviews.find((r) => r.userId === userId);
    if (alreadyReviewed) {
      return res.status(400).json({ message: "Product already reviewed" });
    }

    await prisma.review.create({
      data: {
        name: req.user.name,
        rating: Number(rating),
        comment,
        userId,
        productId,
      },
    });

    const allReviews = await prisma.review.findMany({
      where: { productId },
    });
    const avgRating =
      allReviews.reduce((acc, item) => item.rating + acc, 0) / allReviews.length;

    await prisma.product.update({
      where: { id: productId },
      data: {
        numReviews: allReviews.length,
        rating: avgRating,
      },
    });

    await invalidateByTag("products:restaurant");
    res.status(201).json({ message: "Review added" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
