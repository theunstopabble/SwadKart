import express from "express";
const router = express.Router();

// 1. 👇 Order Controller
import {
  addOrderItems,
  getOrderById,
  getMyOrders,
  cancelOrder,
  getOrders, // ✅ NEW IMPORT: Admin ko orders dikhane ke liye zaroori hai
} from "../controllers/orderController.js";

// 2. 👇 Delivery Controller
import {
  assignDeliveryPartner,
  updateDeliveryAction,
  updateOrderToDelivered,
  getMyDeliveryOrders,
} from "../controllers/deliveryController.js";

// 3. 👇 Admin Controller
import {
  getSalesStats,
  getDashboardStats,
} from "../controllers/adminController.js";

// 👇 Auth Middlewares
import { protect, authorizeRoles } from "../middleware/authMiddleware.js";

// ============================================================
// 👑 ROOT ROUTES (CREATE & ADMIN LIST)
// ============================================================

router
  .route("/")
  .post(protect, addOrderItems) // 🛒 User: Create New Order
  .get(protect, authorizeRoles("admin"), getOrders); // 👑 Admin: Get All Orders (FIXED)

// ============================================================
// 📊 ANALYTICS & STATS
// ============================================================

router.get("/sales-stats", protect, authorizeRoles("admin"), getSalesStats);

router.get(
  "/analytics",
  protect,
  authorizeRoles("admin", "restaurant_owner"),
  getDashboardStats
);

// ============================================================
// 🛵 DELIVERY PARTNER ROUTES
// ============================================================

router.get(
  "/my-deliveries",
  protect,
  authorizeRoles("delivery_partner"),
  getMyDeliveryOrders
);

router.put(
  "/:id/delivery-action",
  protect,
  authorizeRoles("delivery_partner"),
  updateDeliveryAction
);

router.put(
  "/:id/deliver",
  protect,
  authorizeRoles("admin", "delivery_partner"),
  updateOrderToDelivered
);

// ============================================================
// 🛒 GENERAL USER ROUTES
// ============================================================

router.get("/myorders", protect, getMyOrders);

router.put("/:id/cancel", protect, cancelOrder);

// ============================================================
// 🔧 ADMIN OPERATIONS
// ============================================================

// Assign Delivery Partner
router.put(
  "/:id/assign",
  protect,
  authorizeRoles("admin", "restaurant_owner"),
  assignDeliveryPartner
);

// ============================================================
// 🔍 FETCHING BY ID (Must be at the end)
// ============================================================

router.get("/:id", protect, getOrderById);

export default router;
