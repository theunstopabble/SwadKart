import asyncHandler from "express-async-handler";
import prisma from "../config/prisma.js";

export const getInventoryForecast = asyncHandler(async (req, res) => {
  const currentUserId = req.user?.id || req.user?._id;
  let { restaurantId, days = 7 } = req.query;

  if (!restaurantId && req.user?.role === "restaurant_owner") {
    const owned = await prisma.restaurant.findFirst({
      where: { ownerId: currentUserId },
      select: { id: true },
    });
    if (owned) restaurantId = owned.id.toString();
  }

  const filter = restaurantId ? { restaurantId } : {};
  const products = await prisma.product.findMany({
    where: filter,
    include: { restaurant: { select: { name: true } } },
    select: {
      id: true,
      name: true,
      countInStock: true,
      lastRestocked: true,
      category: true,
      variants: true,
      restaurant: { select: { name: true } },
    },
  });

  if (!products.length) {
    return res.json({ forecasts: [], recommendations: [] });
  }

  const daysNum = parseInt(days) || 7;
  const startDate = new Date(Date.now() - daysNum * 24 * 60 * 60 * 1000);

  const orders = await prisma.order.findMany({
    where: {
      orderStatus: { not: "Cancelled" },
      createdAt: { gte: startDate },
    },
    select: { orderItems: true },
  });

  const demandMap = {};
  for (const o of orders) {
    const items = Array.isArray(o.orderItems) ? o.orderItems : [];
    for (const item of items) {
      const prodId = (item.product || item._id || item.id)?.toString();
      if (!prodId) continue;
      demandMap[prodId] = (demandMap[prodId] || 0) + Number(item.qty || 1);
    }
  }

  const forecasts = products.map((p) => {
    const soldLast7Days = demandMap[p.id.toString()] || 0;
    const avgDailyDemand = soldLast7Days / daysNum;
    const daysUntilStockout =
      p.countInStock > 0 && avgDailyDemand > 0
        ? Math.floor(p.countInStock / avgDailyDemand)
        : 999;

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
      productId: p.id,
      name: p.name,
      category: p.category,
      restaurant: p.restaurant?.name,
      currentStock: p.countInStock,
      lastRestocked: p.lastRestocked,
      avgDailyDemand: Number(avgDailyDemand.toFixed(2)),
      daysUntilStockout: daysUntilStockout === 999 ? "∞" : daysUntilStockout,
      soldLast7Days,
      restockUrgent,
      suggestedReorderQty,
      autoDisable,
      status:
        p.countInStock === 0
          ? "out_of_stock"
          : daysUntilStockout <= 2
          ? "critical"
          : daysUntilStockout <= 5
          ? "low"
          : "healthy",
    };
  });

  const urgentItems = forecasts.filter((f) => f.restockUrgent);
  const lowStock = forecasts.filter(
    (f) => !f.restockUrgent && f.status !== "healthy" && f.status !== "out_of_stock"
  );
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
  const currentUserId = req.user?.id || req.user?._id;
  let { restaurantId, threshold = 5 } = req.query;

  if (!restaurantId && req.user?.role === "restaurant_owner") {
    const owned = await prisma.restaurant.findFirst({
      where: { ownerId: currentUserId },
      select: { id: true },
    });
    if (owned) restaurantId = owned.id.toString();
  }

  const filter = restaurantId ? { restaurantId } : {};
  const products = await prisma.product.findMany({
    where: filter,
    select: {
      id: true,
      name: true,
      countInStock: true,
      category: true,
      restaurantId: true,
      lastRestocked: true,
      variants: true,
      restaurant: { select: { name: true } },
    },
  });

  const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const orders = await prisma.order.findMany({
    where: {
      orderStatus: { not: "Cancelled" },
      createdAt: { gte: startDate },
    },
    select: { orderItems: true },
  });

  const demandMap = {};
  for (const o of orders) {
    const items = Array.isArray(o.orderItems) ? o.orderItems : [];
    for (const item of items) {
      const prodId = (item.product || item._id || item.id)?.toString();
      if (!prodId) continue;
      demandMap[prodId] = (demandMap[prodId] || 0) + Number(item.qty || 1);
    }
  }

  const thresholdDays = parseInt(threshold) || 5;
  const recommendations = [];

  for (const product of products) {
    const sold30d = demandMap[product.id.toString()] || 0;
    const dailyRate = sold30d / 30;
    const daysLeft = dailyRate > 0 ? Math.floor(product.countInStock / dailyRate) : 999;

    if (daysLeft <= thresholdDays) {
      const suggestedQty = Math.ceil(dailyRate * 14);
      const expiryDays = product.lastRestocked
        ? Math.floor((Date.now() - new Date(product.lastRestocked).getTime()) / (24 * 60 * 60 * 1000))
        : null;

      const variants = Array.isArray(product.variants) ? product.variants : [];

      recommendations.push({
        productId: product.id,
        name: product.name,
        category: product.category,
        restaurant: product.restaurant?.name,
        currentStock: product.countInStock,
        dailyDemand: Number(dailyRate.toFixed(2)),
        daysLeft,
        suggestedReorderQty: suggestedQty,
        lastRestocked: product.lastRestocked,
        daysSinceRestock: expiryDays,
        variants: variants.map((v) => ({ name: v.name, currentStock: product.countInStock })),
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
  const daysNum = parseInt(days) || 30;
  const startDate = new Date(Date.now() - daysNum * 24 * 60 * 60 * 1000);

  const matchFilter = {
    orderStatus: { not: "Cancelled" },
    createdAt: { gte: startDate },
  };
  if (restaurantId) matchFilter.restaurantId = restaurantId;

  const orders = await prisma.order.findMany({
    where: matchFilter,
    select: { createdAt: true },
  });

  const totalOrderCount = orders.length || 1;
  const dailyWaste = {};
  orders.forEach((o) => {
    const day = new Date(o.createdAt).toISOString().split("T")[0];
    if (!dailyWaste[day]) dailyWaste[day] = { orders: 0 };
    dailyWaste[day].orders += 1;
  });
  Object.keys(dailyWaste).forEach((day) => {
    dailyWaste[day] = (dailyWaste[day].orders / totalOrderCount) * 0.05;
  });

  const productFilter = restaurantId ? { restaurantId } : {};
  const products = await prisma.product.findMany({
    where: productFilter,
    select: { category: true },
  });

  const categoryMap = {};
  products.forEach((p) => {
    const cat = p.category || "General";
    categoryMap[cat] = (categoryMap[cat] || 0) + 1;
  });

  const wasteByCategory = Object.entries(categoryMap).map(([category, count]) => ({
    category,
    estimatedWastePercent: 3,
    products: count,
  }));

  const wasteValues = Object.values(dailyWaste);
  const avgWasteRate =
    wasteValues.length > 0
      ? Number(
          ((wasteValues.reduce((s, r) => s + r, 0) / wasteValues.length) * 100).toFixed(2)
        )
      : 3;

  res.json({
    period: `${daysNum} days`,
    dailyWaste: Object.entries(dailyWaste).map(([date, rate]) => ({
      date,
      wasteRate: Number((rate * 100).toFixed(2)),
    })),
    wasteByCategory,
    avgWasteRate,
  });
});
