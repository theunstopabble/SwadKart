import express from "express";
const router = express.Router();
import {
  getRestaurants,
  getRestaurantById,
  getTopRestaurants,
  createRestaurant,
  getOwnerRestaurant,
  updateRestaurantSettings,
  verifyRestaurant,
  createRestaurantReview,
} from "../controllers/restaurantController.js";

// ✅ FIX: 'seller' aur 'admin' hata diya, 'authorizeRoles' use kiya
import { protect, authorizeRoles } from "../middleware/authMiddleware.js";

// =================================================================
// 🟢 PUBLIC & GENERAL ROUTES
// =================================================================
router
  .route("/")
  .get(getRestaurants) // Home Page (Verified + Dummy)
  // ✅ FIX: 'seller' ki jagah 'authorizeRoles("restaurant_owner")'
  .post(protect, authorizeRoles("restaurant_owner"), createRestaurant);

router.get("/top", getTopRestaurants); // Top Rated

// =================================================================
// 🟠 OWNER DASHBOARD ROUTES
// =================================================================
router.get(
  "/mine",
  protect,
  authorizeRoles("restaurant_owner"), // ✅ FIX
  getOwnerRestaurant
);

router.put(
  "/settings",
  protect,
  authorizeRoles("restaurant_owner"), // ✅ FIX
  updateRestaurantSettings
);

// =================================================================
// 🔴 ADMIN ROUTES
// =================================================================
router.put(
  "/:id/approve",
  protect,
  authorizeRoles("admin"), // ✅ FIX: 'admin' middleware ki jagah authorizeRoles use kiya
  verifyRestaurant
);

// =================================================================
// 🔵 SINGLE RESTAURANT & REVIEWS
// =================================================================
router.route("/:id/reviews").post(protect, createRestaurantReview);
router.route("/:id").get(getRestaurantById);

export default router;
