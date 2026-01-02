import express from "express";
const router = express.Router();

// 👇 Product Controller functions import
import {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  getProductsByRestaurant,
  toggleProductStock,
} from "../controllers/productController.js";

// 👇 Review Controller function import (New File)
import { createProductReview } from "../controllers/reviewController.js";

// 👇 Auth Middleware import
import { protect, authorizeRoles } from "../middleware/authMiddleware.js";

// ============================================================
// 🚦 ROUTES CONFIGURATION
// ============================================================

// 1️⃣ PUBLIC & GENERAL ROUTES
router
  .route("/")
  .get(getProducts)
  .post(protect, authorizeRoles("admin", "restaurant_owner"), createProduct);

router.route("/restaurant/:id").get(getProductsByRestaurant);

// 2️⃣ REVIEW ROUTE (New Addition)
// User logged in hona chahiye tabhi review de payega
router.route("/:id/reviews").post(protect, createProductReview);

// 3️⃣ STOCK TOGGLE ROUTE
// Controller handles the ownership check
router.route("/:id/toggle-stock").patch(protect, toggleProductStock);

// 4️⃣ GENERIC ID ROUTES (Last)
router
  .route("/:id")
  .get(getProductById)
  .put(protect, authorizeRoles("admin", "restaurant_owner"), updateProduct)
  .delete(protect, authorizeRoles("admin", "restaurant_owner"), deleteProduct);

export default router;
