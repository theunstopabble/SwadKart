import express from "express";
const router = express.Router();
import {
  createCoupon,
  validateCoupon,
  getCoupons,
  getApplicableCoupons, // 👈 IMPORT ADDED
} from "../controllers/couponController.js";
import { protect, authorizeRoles } from "../middleware/authMiddleware.js";

// User Routes (Apply & Check Availability)
router.post("/validate", protect, validateCoupon);
router.get("/available", protect, getApplicableCoupons); // 👈 NEW ROUTE (For Smart Dropdown)

// Admin Routes (Manage Coupons)
router
  .route("/")
  .post(protect, authorizeRoles("admin"), createCoupon)
  .get(protect, authorizeRoles("admin"), getCoupons);

export default router;
