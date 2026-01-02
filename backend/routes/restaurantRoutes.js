import express from "express";
const router = express.Router();
import {
  getRestaurants,
  approveRestaurant,
  getAllRestaurantsAdmin,
} from "../controllers/restaurantController.js";
import { protect, authorizeRoles } from "../middleware/authMiddleware.js";

// 1. Home Page Route (Public)
router.route("/").get(getRestaurants);

// 2. Admin: Get All for Dashboard
router
  .route("/admin/all")
  .get(protect, authorizeRoles("admin"), getAllRestaurantsAdmin);

// 3. Admin: Approve Restaurant
router
  .route("/:id/approve")
  .put(protect, authorizeRoles("admin"), approveRestaurant);

export default router;
