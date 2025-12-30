import express from "express";
const router = express.Router();
import {
  createCoupon,
  validateCoupon,
  getCoupons,
  getApplicableCoupons,
  deleteCoupon, // 👈 New Import
  updateCoupon, // 👈 New Import
} from "../controllers/couponController.js";
import { protect, authorizeRoles } from "../middleware/authMiddleware.js";

// =================================================================
// 🛒 USER ROUTES (Apply & Check Availability)
// =================================================================

// Validate Coupon (Checkout Page)
router.post("/validate", protect, validateCoupon);

// Get Available Coupons (Cart Page - Smart List)
router.get("/available", protect, getApplicableCoupons);

// =================================================================
// 👑 ADMIN ROUTES (Manage Coupons)
// =================================================================

router
  .route("/")
  .post(protect, authorizeRoles("admin"), createCoupon) // Create New
  .get(protect, authorizeRoles("admin"), getCoupons); // List All

router
  .route("/:id")
  .put(protect, authorizeRoles("admin"), updateCoupon) // Update (Edit)
  .delete(protect, authorizeRoles("admin"), deleteCoupon); // Delete

export default router;
