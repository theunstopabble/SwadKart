import express from "express";
import { protect, authorizeRoles } from "../middleware/authMiddleware.js";
import {
  calculateItemCost,
  updateItemCost,
  getMenuCostAnalysis,
  calculateBatchCost,
} from "../controllers/costCalculatorController.js";

const router = express.Router();

router.get("/item/:productId", protect, authorizeRoles("restaurant_owner", "admin"), calculateItemCost);
router.put("/item/:productId", protect, authorizeRoles("restaurant_owner", "admin"), updateItemCost);
router.get("/menu", protect, authorizeRoles("restaurant_owner", "admin"), getMenuCostAnalysis);
router.post("/batch", protect, authorizeRoles("restaurant_owner", "admin"), calculateBatchCost);

export default router;