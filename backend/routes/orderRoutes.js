import express from "express";
const router = express.Router();

// 1. 👇 Order Controller (Core order logic)
import {
  addOrderItems,
  getOrderById,
  getMyOrders,
  cancelOrder,
  // ❌ updateOrderToPaid function yahan se hata diya hai kyunki ye paymentController me merge ho gaya hai
} from "../controllers/orderController.js";

// 2. 👇 Delivery Controller (Driver & Tracking logic)
import {
  assignDeliveryPartner,
  updateDeliveryAction,
  updateOrderToDelivered,
  getMyDeliveryOrders,
} from "../controllers/deliveryController.js";

// 3. 👇 Admin Controller (Stats & Analytics logic)
import {
  getSalesStats,
  getDashboardStats,
} from "../controllers/adminController.js";

// 👇 Auth Middlewares
import { protect, authorizeRoles } from "../middleware/authMiddleware.js";

// ============================================================
// 📊 ANALYTICS & STATS (Admin & Restaurant Owner)
// ============================================================

// ग्राफ के लिए रोजाना की सेल्स (Recharts Graph Data)
router.get("/sales-stats", protect, authorizeRoles("admin"), getSalesStats);

// कार्ड्स के लिए टोटल स्टैट्स (Dashboard Analytics)
router.get(
  "/analytics",
  protect,
  authorizeRoles("admin", "restaurant_owner"),
  getDashboardStats
);

// ============================================================
// 🛵 DELIVERY PARTNER ROUTES
// ============================================================

// ड्राइवर के अपने असाइन किए हुए ऑर्डर्स
router.get(
  "/my-deliveries",
  protect,
  authorizeRoles("delivery_partner"),
  getMyDeliveryOrders
);

// ड्राइवर द्वारा आर्डर स्वीकार या अस्वीकार करना
router.put(
  "/:id/delivery-action",
  protect,
  authorizeRoles("delivery_partner"),
  updateDeliveryAction
);

// ड्राइवर या एडमिन द्वारा आर्डर डिलीवर मार्क करना (OTP के साथ)
router.put(
  "/:id/deliver",
  protect,
  authorizeRoles("admin", "delivery_partner"),
  updateOrderToDelivered
);

// ============================================================
// 🛒 GENERAL ORDER ROUTES
// ============================================================

// नया आर्डर बनाना
router.post("/", protect, addOrderItems);

// यूजर का अपना आर्डर इतिहास
router.get("/myorders", protect, getMyOrders);

// आर्डर कैंसिल करना
router.put("/:id/cancel", protect, cancelOrder);

// एडमिन द्वारा पार्टनर असाइन करना
router.put(
  "/:id/assign",
  protect,
  authorizeRoles("admin", "restaurant_owner"),
  assignDeliveryPartner
);

// ✅ NOTE: Razorpay Payment ke liye alag routes file (paymentRoutes.js) use ho rahi hai.
// Agar koi purana code /:id/pay ko call kar raha hai, toh use ignore karein ya
// frontend se payment gateway wala naya API call karein.

// ============================================================
// 🔍 FETCHING BY ID (Must be at the end)
// ============================================================

router.get("/:id", protect, getOrderById);

export default router;
