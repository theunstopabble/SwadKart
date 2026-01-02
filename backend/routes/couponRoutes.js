import express from "express";
const router = express.Router();
import {
  createCoupon,
  validateCoupon,
  getCoupons,
  getApplicableCoupons,
  deleteCoupon,
  updateCoupon,
} from "../controllers/couponController.js";
import { protect, authorizeRoles } from "../middleware/authMiddleware.js";

// =================================================================
// 🛒 USER ROUTES (Apply & Check Availability)
// =================================================================

// Get Available Coupons (Cart Page - Smart List)
// 🔓 Public Route: Taki bina login kiye bhi offers dikh sakein
router.get("/available", getApplicableCoupons);

// Validate Coupon (Checkout Page)
// 🔒 Protected: Kyunki hum check karte hain ki user ne ise pehle use to nahi kiya
router.post("/validate", protect, validateCoupon);

// =================================================================
// 👑 ADMIN ROUTES (Manage Coupons)
// =================================================================

router
  .route("/")
  .post(protect, authorizeRoles("admin"), createCoupon) // Create New Coupon
  .get(protect, authorizeRoles("admin"), getCoupons); // List All Coupons

router
  .route("/:id")
  .put(protect, authorizeRoles("admin"), updateCoupon) // Update Coupon details
  .delete(protect, authorizeRoles("admin"), deleteCoupon); // Delete Coupon

export default router;
