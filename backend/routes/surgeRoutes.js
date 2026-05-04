import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import { adminOnly } from "../middleware/roleMiddleware.js";
import {
  getSurgeStatus,
  getSurgeConfig,
  updateSurgeConfig,
} from "../controllers/surgePricingController.js";

const router = express.Router();

router.get("/status", getSurgeStatus);
router.get("/config", protect, adminOnly, getSurgeConfig);
router.put("/config", protect, adminOnly, updateSurgeConfig);

export default router;
