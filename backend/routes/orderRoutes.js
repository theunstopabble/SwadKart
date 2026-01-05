import express from "express";
const router = express.Router();

// 1. 👇 Order Controller
import {
  addOrderItems,
  getOrderById,
  getMyOrders,
  getOrders,
  updateOrderStatus,
  updateOrderToPaid,
  cancelOrder,
  getMyRestaurantOrders, // 👈 NEW: For Restaurant Dashboard (Fixes 403 Error)
} from "../controllers/orderController.js";
import { protect, authorizeRoles } from "../middleware/authMiddleware.js";

// 2. 👇 Delivery Controller
import {
  assignDeliveryPartner,
  updateDeliveryAction,
  updateOrderToDelivered,
  getMyDeliveryOrders,
  triggerSOS,
} from "../controllers/deliveryController.js";

// 3. 👇 Admin Controller
import {
  getSalesStats,
  getDashboardStats,
  getHeatmapData,
} from "../controllers/adminController.js";

// 👇 Auth Middlewares


// ============================================================
// 👑 ROOT ROUTES (CREATE & ADMIN LIST)
// ============================================================

router
  .route("/")
  .post(protect, addOrderItems) // 🛒 User: Create New Order
  .get(protect, authorizeRoles("admin"), getOrders); // 👑 Admin: Get All Orders

// ============================================================
// 📊 ANALYTICS & STATS
// ============================================================

router.post("/sos", protect, authorizeRoles("delivery_partner"), triggerSOS);

// ✅ FIX: Added "restaurant_owner" to allow access to sales stats
router.get(
  "/sales-stats",
  protect,
  authorizeRoles("admin", "restaurant_owner"),
  getSalesStats
);

router.get(
  "/analytics",
  protect,
  authorizeRoles("admin", "restaurant_owner"),
  getDashboardStats
);

router.get("/heatmap", protect, authorizeRoles("admin"), getHeatmapData);

// ============================================================
// 👨‍🍳 RESTAURANT OWNER SPECIFIC ROUTES (NEW)
// ============================================================

// ✅ FIX: Restaurant Dashboard Data Load
// Ye route "/:id" se pehle hona chahiye warna error aayega (404 fix)
router.get(
  "/restaurant-orders",
  protect,
  authorizeRoles("restaurant_owner"),
  getMyRestaurantOrders
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

// Driver Accept/Reject Logic
router.put(
  "/:id/delivery-action",
  protect,
  authorizeRoles("delivery_partner"),
  updateDeliveryAction
);

// Verify OTP & Mark Delivered
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
// 🔧 RESTAURANT & ADMIN OPERATIONS
// ============================================================

// ✅ Restaurant: Update Status (Preparing/Ready)
router.put(
  "/:id/status",
  protect,
  authorizeRoles("admin", "restaurant_owner"),
  updateOrderStatus
);

// ✅ Admin/Restaurant: Assign Delivery Partner
router.put(
  "/:id/assign",
  protect,
  authorizeRoles("admin", "restaurant_owner"),
  assignDeliveryPartner
);

// ============================================================
// 💳 PAYMENT CONFIRMATION
// ============================================================

// ✅ Mark as Paid (Called after successful Razorpay transaction)
router.put("/:id/pay", protect, updateOrderToPaid);

// ============================================================
// 🔍 FETCHING BY ID (Must be at the end)
// ============================================================

// ⚠️ IMPORTANT: Ye hamesha last me rakho, warna baaki routes break ho jayenge
router.get("/:id", protect, getOrderById);

export default router;
