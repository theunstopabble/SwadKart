import express from "express";
import { authenticateToken } from "../middleware/authMiddleware.js";
import {
  refreshRestaurantScore,
  getRestaurantPerformance,
  getLeaderboard,
} from "../controllers/analyticsController.js";

const router = express.Router();

router.get("/leaderboard", getLeaderboard);
router.get("/restaurant/:id/performance", getRestaurantPerformance);
router.post("/restaurant/:id/refresh", authenticateToken, refreshRestaurantScore);

export default router;
