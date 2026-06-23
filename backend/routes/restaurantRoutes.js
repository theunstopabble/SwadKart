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
  getAllRestaurantsAdmin,
} from "../controllers/restaurantController.js";
import Restaurant from "../models/restaurantModel.js";
import { sanitizeObjectId } from "../utils/sanitize.js";

import { protect, authorizeRoles } from "../middleware/authMiddleware.js";
import { cacheResponse } from "../middleware/cacheMiddleware.js";

// =================================================================
// 🟢 PUBLIC & GENERAL ROUTES
// =================================================================
router
  .route("/")
  .get(cacheResponse("restaurants:list", 300), getRestaurants) // Home Page (Verified + Dummy) — 5 min cache
  .post(protect, authorizeRoles("restaurant_owner"), createRestaurant);

router.get("/top", cacheResponse("restaurants:top", 300), getTopRestaurants); // Top Rated — 5 min cache

// =================================================================
// 🔴 ADMIN ROUTES (Specific routes BEFORE dynamic /:id)
// =================================================================

// Get ALL restaurants (including pending) for admin
router.get(
  "/admin/all",
  protect,
  authorizeRoles("admin"),
  getAllRestaurantsAdmin
);

// Approve/Verify restaurant
router.put(
  "/:id/approve",
  protect,
  authorizeRoles("admin"),
  verifyRestaurant
);

// Restaurant Owner Settings (MUST be before /:id route)
router.put(
  "/settings",
  protect,
  authorizeRoles("restaurant_owner"),
  updateRestaurantSettings
);

// Update restaurant details (admin)
router.put(
  "/:id",
  protect,
  authorizeRoles("admin"),
  async (req, res) => {
    try {
      const restaurant = await Restaurant.findById(sanitizeObjectId(req.params.id));
      if (!restaurant) return res.status(404).json({ message: "Restaurant not found" });

      const { name, image, description, openingTime, closingTime, address, phone } = req.body;
      if (name) restaurant.name = name;
      if (image) restaurant.image = image;
      if (description) restaurant.description = description;
      if (openingTime) restaurant.openingTime = openingTime;
      if (closingTime) restaurant.closingTime = closingTime;
      if (address) restaurant.address = address;
      if (phone) restaurant.phone = phone;

      const updated = await restaurant.save();
      res.json({ message: "Restaurant updated", restaurant: updated });
    } catch (error) {
      next(error);
    }
  }
);

// Delete restaurant (admin)
router.delete(
  "/:id",
  protect,
  authorizeRoles("admin"),
  async (req, res) => {
    try {
      const restaurant = await Restaurant.findById(sanitizeObjectId(req.params.id));
      if (!restaurant) return res.status(404).json({ message: "Restaurant not found" });

      const Product = (await import("../models/productModel.js")).default;
      await Product.deleteMany({ restaurant: sanitizeObjectId(req.params.id) });

      await restaurant.deleteOne();
      res.json({ message: "Restaurant and associated menu items deleted" });
    } catch (error) {
      next(error);
    }
  }
);

// Reviews
router.route("/:id/reviews").post(protect, createRestaurantReview);

// ROUTE-01 FIX: Specific routes MUST come before /:id param routes
// router.get('/admin/all', protect, authorizeRoles('admin'), getAllRestaurantsAdmin);
// Note: /admin/all is ALREADY defined above correctly but /:id was causing issues if not strictly LAST
// /:id routes AFTER all specific string routes
router.get('/:id', getRestaurantById);

export default router;
