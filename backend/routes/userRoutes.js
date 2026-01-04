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
router.post("/newsletter", subscribeToNewsletter);

// Restaurants Public Data
router.get("/restaurants", getAllRestaurantsPublic);

// ✅ FIX 1: Static routes must come BEFORE dynamic "/:id" routes
// Isse CastError: "delivery-partners" failed for ObjectId wala error khatam ho jayega
router.get(
  "/delivery-partners",
  protect,
  authorizeRoles("admin", "restaurant_owner"),
  getDeliveryPartners
);

// 🔐 PROTECTED ROUTES (User Login Required)
router
  .route("/profile")
  .get(protect, getUserProfile)
  .put(protect, updateUserProfile);

// =================================================================
// 👑 ADMIN & OWNER ROUTES
// =================================================================

// ✅ FIX 2: Added "restaurant_owner" to authorized roles so dashboard doesn't go blank
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

// Publicly get single restaurant
router.get("/:id", getRestaurantById);

// Admin Control by ID
router
  .route("/admin/user/:id") // ✅ FIX 3: Route path changed to avoid conflict with public /:id
  .put(protect, authorizeRoles("admin"), updateUserByAdmin)
  .delete(protect, authorizeRoles("admin"), deleteUserByAdmin);

export default router;
