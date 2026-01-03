import express from "express";
// 👇 1. Import Auth Controller (Login/Register/OTP)
import {
  registerUser,
  verifyEmailAPI,
  loginUser,
  forgotPassword,
  resetPassword,
} from "../controllers/authController.js";

// 👇 2. Import User Controller (Profile/Admin/Data)
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
} from "../controllers/userController.js";

import { protect, authorizeRoles } from "../middleware/authMiddleware.js";

// 👇 DEBUG LOG (Imports ke baad hi chalega)
console.log("🔍 ROUTE DEBUG: registerUser type is ->", typeof registerUser);

const router = express.Router();

// =================================================================
// 🔓 PUBLIC ROUTES (Auth)
// =================================================================

// 👇 WRAPPER FIX: Isse 'next' guarantee pass hoga
router.post("/register", (req, res, next) => {
  console.log("⚡ Route Handler: Calling registerUser...");
  if (typeof registerUser !== "function") {
    console.error("❌ CRITICAL ERROR: registerUser is not a function!");
    return res
      .status(500)
      .json({ message: "Server Config Error: Auth Controller Missing" });
  }
  registerUser(req, res, next);
});

router.post("/verify-email", verifyEmailAPI);
router.post("/login", loginUser);
router.post("/password/forgot", forgotPassword);
router.put("/password/reset/:token", resetPassword);

// =================================================================
// 🔓 PUBLIC DATA ROUTES
// =================================================================
// Publicly restaurants dekhne ke liye (Home Screen)
router.get("/restaurants", getAllRestaurantsPublic);

// =================================================================
// 🔐 PROTECTED ROUTES (Logged-in Users)
// =================================================================
router
  .route("/profile")
  .get(protect, getUserProfile)
  .put(protect, updateUserProfile);

// =================================================================
// 👑 ADMIN ONLY ROUTES
// =================================================================

// 1. Manage Restaurants
router.get("/admin/all", protect, authorizeRoles("admin"), getAllRestaurants);

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

// 2. Manage Delivery Partners
router.get(
  "/delivery-partners",
  protect,
  authorizeRoles("admin"),
  getDeliveryPartners
);

// 3. System Tools
router.post("/admin/seed", protect, authorizeRoles("admin"), seedDatabase);

// =================================================================
// 🆔 ID BASED ROUTES (Must be at the bottom)
// =================================================================
router
  .route("/:id")
  .get(getRestaurantById) // Publicly get single restaurant details
  .put(protect, authorizeRoles("admin"), updateUserByAdmin) // Admin can Edit/Reorder
  .delete(protect, authorizeRoles("admin"), deleteUserByAdmin); // Admin can Delete

export default router;
