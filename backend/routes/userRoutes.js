import express from "express";
import multer from "multer";
import { contactSupport } from "../controllers/supportController.js";
import { testEmailDelivery } from "../controllers/diagnosticController.js";

// Controllers Import
import {
  registerUser,
  verifyEmailAPI,
  loginUser,
  logoutUser,
  forgotPassword,
  resetPassword,
  resendOTP,
} from "../controllers/authController.js";

import {
  getUserProfile,
  updateUserProfile,
  updateBiometricStatus,
  getBiometricStatus,
  getAllRestaurantsPublic,
  getDeliveryPartners,
  // 👇 IMPORTANT: Is function ko import kiya taaki Admin ko SAARA data mile
  getUsers,
  createRestaurantByAdmin,
  createDummyRestaurant,
  seedDatabase,
  updateUserByAdmin,
  deleteUserByAdmin,
  subscribeToNewsletter,
  googleCheck,
  googleRegister,
  verifyPhone,
} from "../controllers/userController.js";

import {
  getAllUsersAdmin,
  updateUserRole,
  toggleRestaurantApproval,
  deleteUser,
} from "../controllers/adminController.js";

// Middleware Import
import { protect, authorizeRoles } from "../middleware/authMiddleware.js";
import { validate } from "../middleware/validationMiddleware.js";

const router = express.Router();

const profileUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

// =================================================================
// 🌍 PUBLIC ROUTES (No Auth Required)
// =================================================================

// Standard Auth
router.post("/register", validate("register"), registerUser);
router.post("/verify-email", verifyEmailAPI);
router.post("/login", validate("login"), loginUser);
router.post("/logout", logoutUser);
router.post("/password/forgot", validate("forgotPassword"), forgotPassword);
router.put("/password/reset/:token", resetPassword);
router.post("/resend-otp", resendOTP);
router.post("/contact-support", validate("contactSupport"), contactSupport);

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
  getDeliveryPartners,
);

// User Profile (Self Access)
router
  .route("/profile")
  .get(protect, getUserProfile)
  .put(protect, (req, res, next) => {
    profileUpload.single("image")(req, res, (err) => {
      if (err) {
        return res.status(400).json({ message: err.message });
      }
      next();
    });
  }, updateUserProfile);

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
  getUsers, // 👈 Ab ye function call hoga
);

// Shop Management
router.post(
  "/admin/create-shop",
  protect,
  authorizeRoles("admin"),
  createRestaurantByAdmin,
);

router.post(
  "/admin/create-dummy",
  protect,
  authorizeRoles("admin"),
  createDummyRestaurant,
);

// Database Seeding (Dev only)
router.post("/admin/seed", protect, authorizeRoles("admin"), seedDatabase);

// Email Delivery Diagnostic (Admin only)
router.post(
  "/admin/test-email",
  protect,
  authorizeRoles("admin"),
  testEmailDelivery,
);

// Phone Verification (Firebase Phone Auth)
router.post("/verify-phone", protect, verifyPhone);

// =================================================================
// 🆔 DYNAMIC ID ROUTES (MUST BE AT THE END)
// =================================================================

// Admin Control by ID (Update/Delete any user)
router
  .route("/admin/user/:id")
  .put(protect, authorizeRoles("admin"), updateUserByAdmin)
  .delete(protect, authorizeRoles("admin"), deleteUserByAdmin);

// ARCH-01 FIX: Removed duplicate /:id routes — use /admin/user/:id for admin ops
// The GET /:id route was misleadingly named getRestaurantById but fetched Users

// Orphaned adminController functions wired to routes
router.get("/admin/users", protect, authorizeRoles("admin"), getAllUsersAdmin);
router.put("/admin/user/:id/role", protect, authorizeRoles("admin"), updateUserRole);
router.put("/admin/restaurant/:id/approve", protect, authorizeRoles("admin"), toggleRestaurantApproval);
router.delete("/admin/user/:id/delete", protect, authorizeRoles("admin"), deleteUser);

export default router;
