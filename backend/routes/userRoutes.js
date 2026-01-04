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
  subscribeToNewsletter, // ✅ Controller से इम्पोर्ट सुनिश्चित किया
} from "../controllers/userController.js";

// Middleware Import
import { protect, authorizeRoles } from "../middleware/authMiddleware.js";

// =================================================================
// 🌍 PUBLIC ROUTES (No Auth Required)
// =================================================================

router.post("/register", registerUser);
router.post("/verify-email", verifyEmailAPI);
router.post("/login", loginUser);
router.post("/password/forgot", forgotPassword);
router.put("/password/reset/:token", resetPassword);

// 📧 Newsletter Route
router.post("/newsletter", subscribeToNewsletter);

// Restaurants Public Data
router.get("/restaurants", getAllRestaurantsPublic);
router.get("/:id", getRestaurantById);

// =================================================================
// 🔐 PROTECTED ROUTES (User Login Required)
// =================================================================

router
  .route("/profile")
  .get(protect, getUserProfile)
  .put(protect, updateUserProfile);

// =================================================================
// 👑 ADMIN ROUTES (Admin Privileges Required)
// =================================================================

// Get all users/restaurants list
router.get("/admin/all", protect, authorizeRoles("admin"), getAllRestaurants);

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

// Delivery Fleet Management
router.get(
  "/delivery-partners",
  protect,
  authorizeRoles("admin"),
  getDeliveryPartners
);

// Database Seeding (Dev only)
router.post("/admin/seed", protect, authorizeRoles("admin"), seedDatabase);

// Admin User/Restaurant Control by ID
router
  .route("/:id")
  .put(protect, authorizeRoles("admin"), updateUserByAdmin)
  .delete(protect, authorizeRoles("admin"), deleteUserByAdmin);

export default router;
