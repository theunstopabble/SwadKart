import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import {
  refreshRestaurantScore,
  getRestaurantPerformance,
  getLeaderboard,
} from "../controllers/analyticsController.js";

const router = express.Router();

router.get("/leaderboard", getLeaderboard);
router.get("/restaurant/:id/performance", getRestaurantPerformance);
router.post("/restaurant/:id/refresh", protect, refreshRestaurantScore);

export default router;
