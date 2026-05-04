import express from "express";
import {
  getMyReferral,
  validateReferralCode,
  getAllReferrals,
} from "../controllers/referralController.js";
import { protect, authorizeRoles } from "../middleware/authMiddleware.js";

const router = express.Router();

// Public (no auth needed)
router.post("/validate", validateReferralCode);

// Auth required
router.get("/my", protect, getMyReferral);

// Admin only
router.get("/all", protect, authorizeRoles("admin"), getAllReferrals);

export default router;
