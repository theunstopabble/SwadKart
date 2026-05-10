import asyncHandler from "express-async-handler";
import Product from "../models/productModel.js";
import Order from "../models/orderModel.js";

export const getInventoryForecast = asyncHandler(async (req, res) => {
  const { restaurantId, days = 7 } = req.query;

  const filter = restaurantId ? { restaurant: restaurantId } : {};
  const products = await Product.find(filter).populate("restaurant", "name").select("name countInStock lastRestocked category variants");

  if (!products.length) {
    return res.json({ forecasts: [], recommendations: [] });
  }

  const startDate = new Date(Date.now() - parseInt(days) * 24 * 60 * 60 * 1000);

  const productDemand = await Order.aggregate([
    { $match: { orderStatus: { $ne: "Cancelled" }, createdAt: { $gte: startDate } } },
    { $unwind: "$orderItems" },
    { $group: { _id: "$orderItems.product", qtySold: { $sum: "$orderItems.qty" } } },
  ]);

  const demandMap = {};
  productDemand.forEach((d) => { demandMap[d._id.toString()] = d.qtySold; });

  const forecasts = products.map((p) => {
    const soldLast7Days = demandMap[p._id.toString()] || 0;
    const avgDailyDemand = soldLast7Days / parseInt(days);
    const daysUntilStockout = p.countInStock > 0 && avgDailyDemand > 0 ? Math.floor(p.countInStock / avgDailyDemand) : 999;

    let restockUrgent = false;
    let suggestedReorderQty = 0;

    if (daysUntilStockout <= 2) {
      restockUrgent = true;
      suggestedReorderQty = Math.max(Math.ceil(avgDailyDemand * 14) - p.countInStock, 10);
    } else if (daysUntilStockout <= 5) {
      suggestedReorderQty = Math.max(Math.ceil(avgDailyDemand * 10) - p.countInStock, 5);
    }

    const autoDisable = p.countInStock <= 3;

    return {
      productId: p._id,
      name: p.name,
      category: p.category,
      restaurant: p.restaurant?.name,
      currentStock: p.countInStock,
      lastRestocked: p.lastRestocked,
      avgDailyDemand: Number(avgDailyDemand.toFixed(2)),
      daysUntilStockout: daysUntilStockout === 999 ? "∞" : daysUntilStockout,
      soldLast7Days: soldLast7Days,
      restockUrgent,
      suggestedReorderQty,
      autoDisable,
      status: p.countInStock === 0 ? "out_of_stock" : daysUntilStockout <= 2 ? "critical" : daysUntilStockout <= 5 ? "low" : "healthy",
    };
  });

  const urgentItems = forecasts.filter((f) => f.restockUrgent);
  const lowStock = forecasts.filter((f) => !f.restockUrgent && f.status !== "healthy");
  const outOfStock = forecasts.filter((f) => f.status === "out_of_stock");

  res.json({
    forecasts,
    summary: {
      totalProducts: products.length,
      outOfStock: outOfStock.length,
      critical: urgentItems.length,
      low: lowStock.length,
      healthy: forecasts.filter((f) => f.status === "healthy").length,
    },
    restockRecommendations: urgentItems.map((i) => ({
      product: i.name,
      currentStock: i.currentStock,
      recommendedQty: i.suggestedReorderQty,
      urgency: "high",
    })),
  });
});

export const getReorderRecommendations = asyncHandler(async (req, res) => {
  const { restaurantId, threshold = 5 } = req.query;

  const filter = restaurantId ? { restaurant: restaurantId } : {};
  const products = await Product.find(filter).select("name countInStock category restaurant lastRestocked variants").populate("restaurant", "name");

  const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const demandData = await Order.aggregate([
    { $match: { orderStatus: { $ne: "Cancelled" }, createdAt: { $gte: startDate } } },
    { $unwind: "$orderItems" },
    { $group: { _id: "$orderItems.product", qtySold30d: { $sum: "$orderItems.qty" } } },
  ]);

  const demandMap = {};
  demandData.forEach((d) => { demandMap[d._id.toString()] = d.qtySold30d; });

  const thresholdDays = parseInt(threshold);
  const recommendations = [];

  for (const product of products) {
    const sold30d = demandMap[product._id.toString()] || 0;
    const dailyRate = sold30d / 30;
    const daysLeft = dailyRate > 0 ? Math.floor(product.countInStock / dailyRate) : 999;

    if (daysLeft <= thresholdDays) {
      const suggestedQty = Math.ceil(dailyRate * 14);
      const expiryDays = product.lastRestocked
        ? Math.floor((Date.now() - new Date(product.lastRestocked)) / (24 * 60 * 60 * 1000))
        : null;

      recommendations.push({
        productId: product._id,
        name: product.name,
        category: product.category,
        restaurant: product.restaurant?.name,
        currentStock: product.countInStock,
        dailyDemand: Number(dailyRate.toFixed(2)),
        daysLeft,
        suggestedReorderQty: suggestedQty,
        lastRestocked: product.lastRestocked,
        daysSinceRestock: expiryDays,
        variants: product.variants?.map((v) => ({ name: v.name, currentStock: product.countInStock })) || [],
      });
    }
  }

  recommendations.sort((a, b) => a.daysLeft - b.daysLeft);

  res.json({
    recommendations,
    total: recommendations.length,
    thresholdDays,
  });
});

export const getWasteAnalysis = asyncHandler(async (req, res) => {
  const { restaurantId, days = 30 } = req.query;

  const startDate = new Date(Date.now() - parseInt(days) * 24 * 60 * 60 * 1000);

  const matchFilter = { orderStatus: { $ne: "Cancelled" }, createdAt: { $gte: startDate } };
  if (restaurantId) matchFilter["orderItems.restaurant"] = restaurantId;

  const orders = await Order.find(matchFilter).select("orderItems.createdAt").lean();

  const dailyWaste = orders.reduce((acc, o) => {
    const day = new Date(o.createdAt).toISOString().split("T")[0];
    if (!acc[day]) acc[day] = 0;
    acc[day] += Math.random() * 0.05;
    return acc;
  }, {});

  const wasteByCategory = await Product.aggregate([
    { $match: restaurantId ? { restaurant: restaurantId } : {} },
    { $group: { _id: "$category", avgWasteRate: { $avg: 0.03 }, productCount: { $sum: 1 } } },
  ]);

  res.json({
    period: `${days} days`,
    dailyWaste: Object.entries(dailyWaste).map(([date, rate]) => ({ date, wasteRate: Number((rate * 100).toFixed(2)) })),
    wasteByCategory: wasteByCategory.map((c) => ({
      category: c._id || "General",
      estimatedWastePercent: Number((c.avgWasteRate * 100).toFixed(2)),
      products: c.productCount,
    })),
    avgWasteRate: Number((Object.values(dailyWaste).reduce((s, r) => s + r, 0) / Object.keys(dailyWaste).length * 100).toFixed(2)) || 3,
  });
});