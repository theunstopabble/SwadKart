import express from "express";
import {
  getRestaurants,
  getRestaurantById,
  getTopRestaurants,
  getAllRestaurantsAdmin,
  createRestaurant,
  getOwnerRestaurant,
  updateRestaurantSettings,
  updateRestaurantProfile,
  verifyRestaurant,
  createRestaurantReview,
} from "../controllers/restaurantController.js";
import { protect, authorizeRoles } from "../middleware/authMiddleware.js";
import prisma from "../config/prisma.js";

const router = express.Router();

// Public routes
router.get("/", getRestaurants);
router.get("/top", getTopRestaurants);

// Admin: Get all shops (MUST be before /:id)
router.get(
  "/admin/all",
  protect,
  authorizeRoles("admin"),
  getAllRestaurantsAdmin,
);

// Restaurant Owner routes (MUST be before /:id)
router.get("/mine", protect, getOwnerRestaurant);
router.put(
  "/settings",
  protect,
  authorizeRoles("restaurant_owner"),
  updateRestaurantSettings,
);
router.put(
  "/profile",
  protect,
  authorizeRoles("restaurant_owner"),
  updateRestaurantProfile,
);

// Create new restaurant (seller registration)
router.post(
  "/",
  protect,
  authorizeRoles("restaurant_owner", "admin"),
  createRestaurant,
);

// Admin: Verify / Authorize restaurant
router.put(
  "/:id/approve",
  protect,
  authorizeRoles("admin"),
  verifyRestaurant,
);

// Delete restaurant (admin)
router.delete(
  "/:id",
  protect,
  authorizeRoles("admin"),
  async (req, res, next) => {
    try {
      const restaurant = await prisma.restaurant.findUnique({
        where: { id: req.params.id },
      });
      if (!restaurant) return res.status(404).json({ message: "Restaurant not found" });

      await prisma.product.deleteMany({ where: { restaurantId: req.params.id } });
      await prisma.restaurant.delete({ where: { id: req.params.id } });
      res.json({ message: "Restaurant and associated menu items deleted" });
    } catch (error) {
      next(error);
    }
  },
);

// Reviews
router.route("/:id/reviews").post(protect, createRestaurantReview);

// Specific /:id route must be strictly last
router.get("/:id", getRestaurantById);

export default router;
