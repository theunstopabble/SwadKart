import express from "express";
const router = express.Router();
import {
  addOrderItems,
  getOrderById,
  updateOrderToPaid,
  updateOrderToDelivered,
  updateOrderStatus,
  getMyOrders,
  getOrders,
  getAllOrdersAdmin,
  assignDeliveryPartner,
  getMyDeliveryOrders,
  updateDeliveryAction, // 👈 New: Accept/Reject
  cancelOrder, // 👈 New: Cancellation
  getDashboardStats, // 👈 New: Analytics
} from "../controllers/orderController.js";

import { protect, authorizeRoles } from "../middleware/authMiddleware.js";

// ==================================================================
// 👇 SPECIFIC ROUTES (Must come BEFORE /:id routes)
// ==================================================================

// 1. Dashboard Analytics (Admin & Restaurant)
router
  .route("/analytics")
  .get(protect, authorizeRoles("admin", "restaurant_owner"), getDashboardStats);

// 2. User's Order History
router.route("/myorders").get(protect, getMyOrders);

// 3. Admin: Get All Orders
router
  .route("/admin/all")
  .get(protect, authorizeRoles("admin"), getAllOrdersAdmin);

// 4. Delivery Partner: Get My Assigned Deliveries
router
  .route("/my-deliveries")
  .get(protect, authorizeRoles("delivery_partner"), getMyDeliveryOrders);

// ==================================================================
// 👇 GENERAL ROUTES
// ==================================================================

// 5. Create Order / Get All Orders (Restaurant/Admin)
router
  .route("/")
  .post(protect, addOrderItems)
  .get(protect, authorizeRoles("admin", "restaurant_owner"), getOrders);

// ==================================================================
// 👇 ID BASED ROUTES (Must come LAST)
// ==================================================================

// 6. 🚫 Cancel Order (User & Admin)
router.route("/:id/cancel").put(protect, cancelOrder);

// 7. 🛵 Delivery Action (Accept/Reject by Partner)
router
  .route("/:id/delivery-action")
  .put(protect, authorizeRoles("delivery_partner"), updateDeliveryAction);

// 8. General Status Update (Cooking, Ready, etc.)
router
  .route("/:id/status")
  .put(protect, authorizeRoles("admin", "restaurant_owner"), updateOrderStatus);

// 9. Assign Delivery Partner (Admin/Restaurant)
router
  .route("/:id/assign")
  .put(
    protect,
    authorizeRoles("admin", "restaurant_owner"),
    assignDeliveryPartner
  );

// 10. Mark as Delivered (Delivery Partner/Admin)
router
  .route("/:id/deliver")
  .put(
    protect,
    authorizeRoles("admin", "restaurant_owner", "delivery_partner"),
    updateOrderToDelivered
  );

// 11. Mark Payment as Paid
router.route("/:id/pay").put(protect, updateOrderToPaid);

// 12. 🔥 GET SINGLE ORDER BY ID (This MUST be the Last Route)
router.route("/:id").get(protect, getOrderById);

export default router;
