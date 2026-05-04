import express from "express";
import {
  getLoyaltyProfile,
  redeemCoins,
  adminAdjustCoins,
} from "../controllers/loyaltyController.js";
import { protect, authorizeRoles } from "../middleware/authMiddleware.js";

const router = express.Router();

// Public (Auth required)
router.get("/profile", protect, getLoyaltyProfile);
router.post("/redeem", protect, redeemCoins);

// Admin only
router.post("/admin/adjust", protect, authorizeRoles("admin"), adminAdjustCoins);

export default router;
