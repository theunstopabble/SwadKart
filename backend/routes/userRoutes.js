import express from "express";
const router = express.Router();

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
} from "../controllers/userController.js";

import { protect, authorizeRoles } from "../middleware/authMiddleware.js";

// ✅ Clean Standard Routes
router.post("/register", registerUser);
router.post("/verify-email", verifyEmailAPI);
router.post("/login", loginUser);
router.post("/password/forgot", forgotPassword);
router.put("/password/reset/:token", resetPassword);

// Public Data
router.get("/restaurants", getAllRestaurantsPublic);

// Protected
router
  .route("/profile")
  .get(protect, getUserProfile)
  .put(protect, updateUserProfile);

// Admin
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
router.get(
  "/delivery-partners",
  protect,
  authorizeRoles("admin"),
  getDeliveryPartners
);
router.post("/admin/seed", protect, authorizeRoles("admin"), seedDatabase);

// ID Routes
router
  .route("/:id")
  .get(getRestaurantById)
  .put(protect, authorizeRoles("admin"), updateUserByAdmin)
  .delete(protect, authorizeRoles("admin"), deleteUserByAdmin);

export default router;
