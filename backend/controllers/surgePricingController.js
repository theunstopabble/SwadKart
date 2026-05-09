import asyncHandler from "express-async-handler";
import Order from "../models/orderModel.js";
import User from "../models/userModel.js";

// In-memory surge config (can be moved to DB model later)
let surgeConfig = {
  enabled: true,
  baseDeliveryFee: 40,
  thresholds: {
    activeOrdersThreshold: 50,   // orders in last 15 min
    minDriversRequired: 10,      // active delivery partners
  },
  multipliers: [1.0, 1.2, 1.5, 2.0, 2.5],
  maxMultiplier: 2.5,
};

/**
 * Calculate current surge multiplier based on platform load
 * Reads active orders (last 15 min, not delivered) and active drivers
 */
const getCurrentLoad = async () => {
  const fifteenMinAgo = new Date(Date.now() - 15 * 60 * 1000);

  const [activeOrdersCount, activeDriversCount] = await Promise.all([
    Order.countDocuments({
      createdAt: { $gte: fifteenMinAgo },
      isDelivered: false,
      orderStatus: { $ne: "Cancelled" },
    }),
    User.countDocuments({
      role: "delivery_partner",
      isAvailable: true,
    }),
  ]);

  return { activeOrdersCount, activeDriversCount };
};

export const calculateSurgeMultiplier = async () => {
  if (!surgeConfig.enabled) return { multiplier: 1.0, activeOrders: 0, activeDrivers: 0 };

  const { activeOrdersCount, activeDriversCount } = await getCurrentLoad();

  const { thresholds, multipliers } = surgeConfig;
  const demandRatio = activeOrdersCount / Math.max(activeDriversCount, 1);

  let multiplierIndex = 0;
  if (activeOrdersCount >= thresholds.activeOrdersThreshold && activeDriversCount < thresholds.minDriversRequired) {
    multiplierIndex = Math.min(
      Math.floor((demandRatio - 1) * 2),
      multipliers.length - 1,
    );
  }

  const multiplier = multipliers[Math.max(0, multiplierIndex)];

  return {
    multiplier: Math.min(multiplier, surgeConfig.maxMultiplier),
    activeOrders: activeOrdersCount,
    activeDrivers: activeDriversCount,
    demandRatio: Math.round(demandRatio * 100) / 100,
  };
};

// @desc    Get current surge status
// @route   GET /api/v1/surge/status
// @access  Public
export const getSurgeStatus = asyncHandler(async (req, res) => {
  const status = await calculateSurgeMultiplier();
  res.json({
    ...status,
    baseDeliveryFee: surgeConfig.baseDeliveryFee,
    currentDeliveryFee: Math.round(surgeConfig.baseDeliveryFee * status.multiplier),
  });
});

// @desc    Admin: get/update surge config
// @route   GET/PUT /api/v1/surge/config
// @access  Admin
export const getSurgeConfig = asyncHandler(async (req, res) => {
  res.json(surgeConfig);
});

export const updateSurgeConfig = asyncHandler(async (req, res) => {
  const { enabled, baseDeliveryFee, thresholds, multipliers, maxMultiplier } = req.body;

  if (baseDeliveryFee !== undefined) surgeConfig.baseDeliveryFee = Number(baseDeliveryFee);
  if (enabled !== undefined) surgeConfig.enabled = Boolean(enabled);
  if (thresholds) surgeConfig.thresholds = { ...surgeConfig.thresholds, ...thresholds };
  if (multipliers) surgeConfig.multipliers = multipliers;
  if (maxMultiplier !== undefined) surgeConfig.maxMultiplier = Number(maxMultiplier);

  res.json({ message: "Surge config updated", config: surgeConfig });
});
