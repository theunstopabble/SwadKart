import express from "express";
const router = express.Router();

// 👇 Controller functions import
import {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  getProductsByRestaurant,
  toggleProductStock,
} from "../controllers/productController.js";

// 👇 Auth Middleware import
import { protect, authorizeRoles } from "../middleware/authMiddleware.js";

// ============================================================
// 🚦 ROUTES ORDER MATTERS
// ============================================================

// 1️⃣ ROOT ROUTES
router
  .route("/")
  .get(getProducts)
  .post(protect, authorizeRoles("admin", "restaurant_owner"), createProduct);

// 2️⃣ SPECIFIC ROUTES (Must be before /:id)
router.route("/restaurant/:id").get(getProductsByRestaurant);

// 👇 STOCK TOGGLE ROUTE (FIXED HERE)
// Yahan se 'authorizeRoles' hata diya hai.
// Ab Controller khud check karega ki banda owner hai ya nahi.
router.route("/:id/toggle-stock").patch(protect, toggleProductStock);

// 3️⃣ GENERIC ID ROUTES (Last me)
router
  .route("/:id")
  .get(getProductById)
  .put(protect, authorizeRoles("admin", "restaurant_owner"), updateProduct)
  .delete(protect, authorizeRoles("admin", "restaurant_owner"), deleteProduct);

export default router;
