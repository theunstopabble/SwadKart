import express from "express";
import { protect, authorizeRoles } from "../middleware/authMiddleware.js";
import {
  getInventoryForecast,
  getReorderRecommendations,
  getWasteAnalysis,
} from "../controllers/inventoryForecastController.js";

const router = express.Router();

router.get("/forecast", protect, authorizeRoles("restaurant_owner", "admin"), getInventoryForecast);
router.get("/reorder", protect, authorizeRoles("restaurant_owner", "admin"), getReorderRecommendations);
router.get("/waste", protect, authorizeRoles("restaurant_owner", "admin"), getWasteAnalysis);

export default router;