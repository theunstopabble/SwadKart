import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import { getGamificationStats } from "../controllers/gamificationController.js";

const router = express.Router();

router.get("/stats", protect, getGamificationStats);

export default router;
