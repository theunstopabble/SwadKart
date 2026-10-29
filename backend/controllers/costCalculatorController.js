import asyncHandler from "express-async-handler";
import prisma from "../config/prisma.js";
import { sanitizeObjectId } from "../utils/sanitize.js";

export const calculateItemCost = asyncHandler(async (req, res) => {
  const currentUserId = req.user.id || req.user._id;
  const productId = sanitizeObjectId(req.params.productId);

  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: { restaurant: { select: { name: true, ownerId: true } } },
  });
  if (!product) {
    res.status(404);
    throw new Error("Product not found");
  }

  if (req.user.role !== "admin") {
    const ownerId = product.restaurant?.ownerId;
    if (!ownerId || ownerId.toString() !== currentUserId.toString()) {
      res.status(403);
      throw new Error("Not authorized to view this product's cost data");
    }
  }

  const ingredients = Array.isArray(product.ingredients) ? product.ingredients : [];
  const ingredientCost =
    ingredients.reduce(
      (sum, ing) => sum + (Number(ing.quantity) || 0) * (Number(ing.unitCost) || 0),
      0
    ) || 0;

  const totalCost = ingredientCost + (product.preparationCost || 0) + (product.packagingCost || 0);
  const suggestedPrice = totalCost / (1 - (product.foodCostPercentage || 30) / 100);

  res.json({
    productId,
    productName: product.name,
    restaurant: product.restaurant?.name,
    ingredients,
    ingredientCost: Number(ingredientCost.toFixed(2)),
    preparationCost: product.preparationCost || 0,
    packagingCost: product.packagingCost || 5,
    totalCost: Number(totalCost.toFixed(2)),
    foodCostPercentage: product.foodCostPercentage || 30,
    marginTarget: product.marginTarget || 25,
    suggestedPrice: Number(suggestedPrice.toFixed(2)),
    currentPrice: product.price,
    priceDifference: Number((suggestedPrice - product.price).toFixed(2)),
    profitAtCurrentPrice: Number((product.price - totalCost).toFixed(2)),
    profitMarginAtCurrent:
      product.price > 0
        ? Number((((product.price - totalCost) / product.price) * 100).toFixed(2))
        : 0,
  });
});

export const updateItemCost = asyncHandler(async (req, res) => {
  const currentUserId = req.user.id || req.user._id;
  const productId = sanitizeObjectId(req.params.productId);
  const { ingredients, foodCostPercentage, preparationCost, packagingCost, marginTarget } = req.body;

  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: { restaurant: { select: { ownerId: true } } },
  });
  if (!product) {
    res.status(404);
    throw new Error("Product not found");
  }

  if (req.user.role !== "admin") {
    const ownerId = product.restaurant?.ownerId;
    if (!ownerId || ownerId.toString() !== currentUserId.toString()) {
      res.status(403);
      throw new Error("Not authorized to update this product's cost");
    }
  }

  const data = { lastCostUpdated: new Date() };
  if (ingredients !== undefined) data.ingredients = ingredients;
  if (foodCostPercentage !== undefined) data.foodCostPercentage = Number(foodCostPercentage);
  if (preparationCost !== undefined) data.preparationCost = Number(preparationCost);
  if (packagingCost !== undefined) data.packagingCost = Number(packagingCost);
  if (marginTarget !== undefined) data.marginTarget = Number(marginTarget);

  const updatedProduct = await prisma.product.update({
    where: { id: productId },
    data,
  });

  res.json({ message: "Cost data updated", product: updatedProduct });
});

export const getMenuCostAnalysis = asyncHandler(async (req, res) => {
  const currentUserId = req.user.id || req.user._id;
  let { restaurantId } = req.query;

  if (req.user.role !== "admin") {
    if (!restaurantId) {
      const owned = await prisma.restaurant.findFirst({
        where: { ownerId: currentUserId },
        select: { id: true },
      });
      if (!owned) {
        res.status(403);
        throw new Error("No restaurant found for this user");
      }
      restaurantId = owned.id;
    } else {
      const cleanRestId = sanitizeObjectId(restaurantId);
      const restaurant = await prisma.restaurant.findUnique({
        where: { id: cleanRestId },
        select: { ownerId: true },
      });
      if (!restaurant || restaurant.ownerId?.toString() !== currentUserId.toString()) {
        res.status(403);
        throw new Error("Not authorized to view this restaurant's cost analysis");
      }
      restaurantId = cleanRestId;
    }
  }

  const filter = restaurantId ? { restaurantId } : {};
  const products = await prisma.product.findMany({
    where: filter,
    include: { restaurant: { select: { name: true } } },
  });

  const analysis = products.map((p) => {
    const ingredients = Array.isArray(p.ingredients) ? p.ingredients : [];
    const ingredientCost =
      ingredients.reduce(
        (sum, ing) => sum + (Number(ing.quantity) || 0) * (Number(ing.unitCost) || 0),
        0
      ) || 0;
    const totalCost = ingredientCost + (p.preparationCost || 0) + (p.packagingCost || 5);
    const suggestedPrice = totalCost / (1 - (p.foodCostPercentage || 30) / 100);
    const actualMargin = p.price > 0 ? (((p.price - totalCost) / p.price) * 100).toFixed(2) : 0;

    let status = "healthy";
    if (Number(actualMargin) < 10) status = "low";
    else if (Number(actualMargin) > 40) status = "high";
    else if (p.price < suggestedPrice * 0.9) status = "underpriced";
    else if (p.price > suggestedPrice * 1.2) status = "overpriced";

    return {
      productId: p.id,
      name: p.name,
      restaurant: p.restaurant?.name,
      currentPrice: p.price,
      totalCost: Number(totalCost.toFixed(2)),
      ingredientCost: Number(ingredientCost.toFixed(2)),
      suggestedPrice: Number(suggestedPrice.toFixed(2)),
      actualMargin: Number(actualMargin),
      status,
    };
  });

  const healthy = analysis.filter((a) => a.status === "healthy").length;
  const low = analysis.filter((a) => a.status === "low").length;
  const underpriced = analysis.filter((a) => a.status === "underpriced").length;
  const overpriced = analysis.filter((a) => a.status === "overpriced").length;

  res.json({ analysis, summary: { total: analysis.length, healthy, low, underpriced, overpriced } });
});

export const calculateBatchCost = asyncHandler(async (req, res) => {
  const { items } = req.body;

  if (!Array.isArray(items) || items.length === 0) {
    res.status(400);
    throw new Error("Items array is required");
  }

  const productIds = items
    .map((i) => {
      try {
        return sanitizeObjectId(i.productId);
      } catch {
        return null;
      }
    })
    .filter(Boolean);

  const products = await prisma.product.findMany({
    where: { id: { in: productIds } },
  });

  let totalIngredientCost = 0;
  let totalPreparationCost = 0;
  let totalPackagingCost = 0;

  const itemBreakdown = items.map((orderItem) => {
    const product = products.find((p) => p.id === orderItem.productId);
    if (!product) return { productId: orderItem.productId, found: false };

    const ingredients = Array.isArray(product.ingredients) ? product.ingredients : [];
    const ingredientCost =
      (ingredients.reduce(
        (sum, ing) => sum + (Number(ing.quantity) || 0) * (Number(ing.unitCost) || 0),
        0
      ) || 0) * (orderItem.qty || 1);
    const prepCost = (product.preparationCost || 0) * (orderItem.qty || 1);
    const packCost = (product.packagingCost || 5) * (orderItem.qty || 1);

    totalIngredientCost += ingredientCost;
    totalPreparationCost += prepCost;
    totalPackagingCost += packCost;

    return {
      productId: orderItem.productId,
      name: product.name,
      qty: orderItem.qty || 1,
      ingredientCost: Number(ingredientCost.toFixed(2)),
      preparationCost: Number(prepCost.toFixed(2)),
      packagingCost: Number(packCost.toFixed(2)),
      subtotal: Number((ingredientCost + prepCost + packCost).toFixed(2)),
    };
  });

  res.json({
    items: itemBreakdown.filter((i) => i.found !== false),
    totalIngredientCost: Number(totalIngredientCost.toFixed(2)),
    totalPreparationCost: Number(totalPreparationCost.toFixed(2)),
    totalPackagingCost: Number(totalPackagingCost.toFixed(2)),
    grandTotalCost: Number(
      (totalIngredientCost + totalPreparationCost + totalPackagingCost).toFixed(2)
    ),
  });
});
