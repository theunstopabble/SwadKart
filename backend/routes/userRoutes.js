import express from "express";
import { contactSupport } from "../controllers/supportController.js";

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
  updateBiometricStatus,
  getBiometricStatus,
  getAllRestaurantsPublic,
  getRestaurantById,
  getDeliveryPartners,
  // 👇 IMPORTANT: Is function ko import kiya taaki Admin ko SAARA data mile
  getUsers,
  getAllRestaurants, // Ye abhi bhi chahiye specific kaam ke liye
  createRestaurantByAdmin,
  createDummyRestaurant,
  seedDatabase,
  updateUserByAdmin,
  deleteUserByAdmin,
  subscribeToNewsletter,
  googleCheck,
  googleRegister,
} from "../controllers/userController.js";

// Middleware Import
import { protect, authorizeRoles } from "../middleware/authMiddleware.js";

const router = express.Router();

// =================================================================
// 🌍 PUBLIC ROUTES (No Auth Required)
// =================================================================

// Standard Auth
router.post("/register", registerUser);
router.post("/verify-email", verifyEmailAPI);
router.post("/login", loginUser);
router.post("/password/forgot", forgotPassword);
router.put("/password/reset/:token", resetPassword);
router.post("/contact-support", contactSupport);


// Google Authentication
router.post("/google-check", googleCheck);
router.post("/google-register", googleRegister);

// Newsletter
router.post("/newsletter", subscribeToNewsletter);

// Restaurants Public List (For User App)
router.get("/restaurants", getAllRestaurantsPublic);

// =================================================================
// 🔐 PROTECTED & SPECIFIC ROUTES (Must come BEFORE dynamic /:id)
// =================================================================

// Get Delivery Partners (For Admin/Restaurant)
router.get(
  "/delivery-partners",
  protect,
  authorizeRoles("admin", "restaurant_owner"),
  getDeliveryPartners
);

// User Profile (Self Access)
router
  .route("/profile")
  .get(protect, getUserProfile)
  .put(protect, updateUserProfile);

// 🔐 Biometric Status (Industry Standard Sync)
router
  .route("/profile/biometric-status")
  .get(protect, getBiometricStatus)
  .put(protect, updateBiometricStatus);

// =================================================================
// 👑 ADMIN & OWNER ROUTES
// =================================================================

// ✅ CRITICAL FIX: Admin panel needs ALL users (User, Delivery, Owner)
// Pahle ye 'getAllRestaurants' tha, isliye baaki log nahi dikh rahe the.
router.get(
  "/admin/all",
  protect,
  authorizeRoles("admin"),
  getUsers // 👈 Ab ye function call hoga
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

// Admin Control by ID (Update/Delete any user)
router
  .route("/admin/user/:id")
  .put(protect, authorizeRoles("admin"), updateUserByAdmin)
  .delete(protect, authorizeRoles("admin"), deleteUserByAdmin);

export default router;
