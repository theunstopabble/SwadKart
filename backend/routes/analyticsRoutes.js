import express from "express";
import { protect, authorizeRoles } from "../middleware/authMiddleware.js";
import { adminOnly } from "../middleware/roleMiddleware.js";
import { cacheResponse } from "../middleware/cacheMiddleware.js";
import {
  refreshRestaurantScore,
  getRestaurantPerformance,
  getLeaderboard,
  getAdminSummary,
  getDailyTrends,
  getTopRestaurants,
  getTopProducts,
  getRecommendations,
} from "../controllers/analyticsController.js";

const router = express.Router();

router.get("/leaderboard", protect, cacheResponse("analytics:leaderboard", 60), getLeaderboard);
router.get("/restaurant/:id/performance", protect, authorizeRoles("admin", "restaurant_owner"), getRestaurantPerformance);
router.post("/restaurant/:id/refresh", protect, refreshRestaurantScore);

// FEAT-24: Admin Analytics Dashboard
router.get("/admin/summary", protect, adminOnly, getAdminSummary);
router.get("/admin/trends", protect, adminOnly, getDailyTrends);
router.get("/admin/top-restaurants", protect, adminOnly, getTopRestaurants);
router.get("/admin/top-products", protect, adminOnly, getTopProducts);

// FEAT-26: AI Dish Recommendations
router.get("/recommendations", protect, getRecommendations);

export default router;
