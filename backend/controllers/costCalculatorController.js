import asyncHandler from "express-async-handler";
import Product from "../models/productModel.js";
import Restaurant from "../models/restaurantModel.js";

export const calculateItemCost = asyncHandler(async (req, res) => {
  const { productId } = req.params;

  const product = await Product.findById(productId).populate("restaurant", "name owner");
  if (!product) {
    res.status(404);
    throw new Error("Product not found");
  }

  if (req.user.role !== "admin") {
    const restaurant = await Restaurant.findById(product.restaurant?._id || product.restaurant).select("owner");
    if (!restaurant || restaurant.owner.toString() !== req.user._id.toString()) {
      res.status(403);
      throw new Error("Not authorized to view this product's cost data");
    }
  }

  const ingredientCost = product.ingredients?.reduce(
    (sum, ing) => sum + ing.quantity * ing.unitCost,
    0
  ) || 0;

  const totalCost = ingredientCost + (product.preparationCost || 0) + (product.packagingCost || 0);
  const suggestedPrice = totalCost / (1 - (product.foodCostPercentage || 30) / 100);

  res.json({
    productId,
    productName: product.name,
    restaurant: product.restaurant?.name,
    ingredients: product.ingredients || [],
    ingredientCost: Number(ingredientCost.toFixed(2)),
    preparationCost: product.preparationCost || 0,
    packagingCost: product.packagingCost || 5,
    totalCost: Number(totalCost.toFixed(2)),
    foodCostPercentage: product.foodCostPercentage || 30,
    targetMargin: product.marginTarget || 25,
    suggestedPrice: Number(suggestedPrice.toFixed(2)),
    currentPrice: product.price,
    priceDifference: Number((suggestedPrice - product.price).toFixed(2)),
    profitAtCurrentPrice: Number((product.price - totalCost).toFixed(2)),
    profitMarginAtCurrent: product.price > 0
      ? Number((((product.price - totalCost) / product.price) * 100).toFixed(2))
      : 0,
  });
});

export const updateItemCost = asyncHandler(async (req, res) => {
  const { productId } = req.params;
  const { ingredients, foodCostPercentage, preparationCost, packagingCost, marginTarget } = req.body;

  const product = await Product.findById(productId);
  if (!product) {
    res.status(404);
    throw new Error("Product not found");
  }

  if (req.user.role !== "admin") {
    const restaurant = await Restaurant.findById(product.restaurant).select("owner");
    if (!restaurant || restaurant.owner.toString() !== req.user._id.toString()) {
      res.status(403);
      throw new Error("Not authorized to update this product's cost");
    }
  }

  if (ingredients) product.ingredients = ingredients;
  if (foodCostPercentage !== undefined) product.foodCostPercentage = foodCostPercentage;
  if (preparationCost !== undefined) product.preparationCost = preparationCost;
  if (packagingCost !== undefined) product.packagingCost = packagingCost;
  if (marginTarget !== undefined) product.marginTarget = marginTarget;
  product.lastCostUpdated = new Date();

  await product.save();

  res.json({ message: "Cost data updated", product });
});

export const getMenuCostAnalysis = asyncHandler(async (req, res) => {
  let { restaurantId } = req.query;

  if (req.user.role !== "admin") {
    if (!restaurantId) {
      const owned = await Restaurant.findOne({ owner: req.user._id }).select("_id").lean();
      if (!owned) {
        res.status(403);
        throw new Error("No restaurant found for this user");
      }
      restaurantId = owned._id;
    } else {
      const restaurant = await Restaurant.findById(restaurantId).select("owner");
      if (!restaurant || restaurant.owner.toString() !== req.user._id.toString()) {
        res.status(403);
        throw new Error("Not authorized to view this restaurant's cost analysis");
      }
    }
  }

  const filter = restaurantId ? { restaurant: restaurantId } : {};
  const products = await Product.find(filter).populate("restaurant", "name");

  const analysis = products.map((p) => {
    const ingredientCost = p.ingredients?.reduce((sum, ing) => sum + ing.quantity * ing.unitCost, 0) || 0;
    const totalCost = ingredientCost + (p.preparationCost || 0) + (p.packagingCost || 5);
    const suggestedPrice = totalCost / (1 - (p.foodCostPercentage || 30) / 100);
    const actualMargin = p.price > 0 ? (((p.price - totalCost) / p.price) * 100).toFixed(2) : 0;

    let status = "healthy";
    if (actualMargin < 10) status = "low";
    else if (actualMargin > 40) status = "high";
    else if (p.price < suggestedPrice * 0.9) status = "underpriced";
    else if (p.price > suggestedPrice * 1.2) status = "overpriced";

    return {
      productId: p._id,
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

  const productIds = items.map((i) => i.productId);
  const products = await Product.find({ _id: { $in: productIds } });

  let totalIngredientCost = 0;
  let totalPreparationCost = 0;
  let totalPackagingCost = 0;

  const itemBreakdown = items.map((orderItem) => {
    const product = products.find(
      (p) => p._id.toString() === orderItem.productId.toString()
    );
    if (!product) return { productId: orderItem.productId, found: false };

    const ingredientCost =
      (product.ingredients?.reduce((sum, ing) => sum + ing.quantity * ing.unitCost, 0) || 0) *
      (orderItem.qty || 1);
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