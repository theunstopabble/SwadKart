import express from "express";
import { protect, authorizeRoles } from "../middleware/authMiddleware.js";
import {
  calculateCommission,
  getCommissionBreakdown,
  calculatePricingTiers,
  getMarketPricing,
} from "../controllers/pricingCalculatorController.js";

const router = express.Router();

router.get("/commission/:orderId", protect, authorizeRoles("admin", "restaurant_owner"), calculateCommission);
router.get("/commission-breakdown", protect, authorizeRoles("admin"), getCommissionBreakdown);
router.post("/pricing-tiers", protect, authorizeRoles("restaurant_owner", "admin"), calculatePricingTiers);
router.get("/market-pricing", protect, authorizeRoles("admin", "restaurant_owner"), getMarketPricing);

export default router;