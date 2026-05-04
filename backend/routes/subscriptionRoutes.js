import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import { adminOnly } from "../middleware/roleMiddleware.js";
import {
  createSubscription,
  getMySubscriptions,
  getSubscriptionById,
  pauseSubscription,
  resumeSubscription,
  cancelSubscription,
  getAllSubscriptions,
} from "../controllers/subscriptionController.js";

const router = express.Router();

// User routes
router.post("/", protect, createSubscription);
router.get("/my", protect, getMySubscriptions);
router.get("/:id", protect, getSubscriptionById);
router.put("/:id/pause", protect, pauseSubscription);
router.put("/:id/resume", protect, resumeSubscription);
router.put("/:id/cancel", protect, cancelSubscription);

// Admin routes
router.get("/", protect, adminOnly, getAllSubscriptions);

export default router;
