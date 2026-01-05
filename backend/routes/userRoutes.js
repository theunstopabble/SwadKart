import express from "express";
const router = express.Router();

// Controllers Import
import {
  registerUser,
  verifyEmailAPI,
  loginUser,
  forgotPassword,
  resetPassword,
} from "../controllers/authController.js";

import {
  getUserProfile,
  updateUserProfile,
  getAllRestaurantsPublic,
  getRestaurantById,
  getDeliveryPartners,
  getAllRestaurants,
  createRestaurantByAdmin,
  createDummyRestaurant,
  seedDatabase,
  updateUserByAdmin,
  deleteUserByAdmin,
  subscribeToNewsletter,
  // 👇 Google Auth Controllers Added
  googleCheck,
  googleRegister,
} from "../controllers/userController.js";

// Middleware Import
import { protect, authorizeRoles } from "../middleware/authMiddleware.js";

// =================================================================
// 🌍 PUBLIC ROUTES (No Auth Required)
// =================================================================

// Standard Auth
router.post("/register", registerUser);
router.post("/verify-email", verifyEmailAPI);
router.post("/login", loginUser);
router.post("/password/forgot", forgotPassword);
router.put("/password/reset/:token", resetPassword);

// 👇 Google Authentication Routes (Added)
router.post("/google-check", googleCheck);
router.post("/google-register", googleRegister);

// Newsletter
router.post("/newsletter", subscribeToNewsletter);

// Restaurants Public Data
router.get("/restaurants", getAllRestaurantsPublic);

// =================================================================
// 🔐 PROTECTED & SPECIFIC ROUTES (Must come BEFORE dynamic /:id)
// =================================================================

// ✅ FIX 1: Static routes must come BEFORE dynamic "/:id" routes
router.get(
  "/delivery-partners",
  protect,
  authorizeRoles("admin", "restaurant_owner"),
  getDeliveryPartners
);

// User Profile
router
  .route("/profile")
  .get(protect, getUserProfile)
  .put(protect, updateUserProfile);

// =================================================================
// 👑 ADMIN & OWNER ROUTES
// =================================================================

// ✅ FIX 2: Added "restaurant_owner" authorization
router.get(
  "/admin/all",
  protect,
  authorizeRoles("admin", "restaurant_owner"),
  getAllRestaurants
);

// Shop Management
router.post(
  "/admin/create-shop",
  protect,
  authorizeRoles("admin"),
  createRestaurantByAdmin
);

router.post(
  "/admin/create-dummy",
  protect,
  authorizeRoles("admin"),
  createDummyRestaurant
);

// Database Seeding (Dev only)
router.post("/admin/seed", protect, authorizeRoles("admin"), seedDatabase);

// =================================================================
// 🆔 DYNAMIC ID ROUTES (MUST BE AT THE END)
// =================================================================

// Publicly get single restaurant by ID
// ⚠️ WARNING: Keep this at the bottom to avoid conflicting with other GET routes
router.get("/:id", getRestaurantById);

// Admin Control by ID
router
  .route("/admin/user/:id") // ✅ FIX 3: Route path specific to admin to avoid conflicts
  .put(protect, authorizeRoles("admin"), updateUserByAdmin)
  .delete(protect, authorizeRoles("admin"), deleteUserByAdmin);

export default router;
