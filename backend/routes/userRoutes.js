import express from "express";
const router = express.Router();

import {
  registerUser,
  verifyEmailAPI,
  loginUser,
  getUserProfile,
  updateUserProfile,
  forgotPassword,
  resetPassword,
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

// =================================================================
// 🔓 PUBLIC ROUTES
// =================================================================
router.post("/register", registerUser);
router.post("/verify-email", verifyEmailAPI);
router.post("/login", loginUser);
router.post("/password/forgot", forgotPassword);
router.put("/password/reset/:token", resetPassword);

// Publicly restaurants dekhne ke liye (Home Screen sorting ke liye)
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
router.get("/admin/all", protect, authorizeRoles("admin"), getAllRestaurants);
router.get("/delivery-partners", protect, getDeliveryPartners);

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

router.post("/admin/seed", protect, authorizeRoles("admin"), seedDatabase);

// 👈 Handle Indexing, Edit and Delete
router
  .route("/:id")
  .get(getRestaurantById) // Publicly get single restaurant
  .put(protect, authorizeRoles("admin"), updateUserByAdmin) // Admin can Edit/Reorder
  .delete(protect, authorizeRoles("admin"), deleteUserByAdmin); // Admin can Delete

export default router;
