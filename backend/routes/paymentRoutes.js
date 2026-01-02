import express from "express";
const router = express.Router();

// 🎮 Controllers Import (.js extension is mandatory in ESM)
import {
  createRazorpayOrder,
  verifyPayment,
  getRazorpayKey,
} from "../controllers/paymentController.js";

// 🛡️ Auth Middleware
import { protect } from "../middleware/authMiddleware.js";

// ============================================================
// 💳 RAZORPAY PAYMENT PROTOCOLS
// ============================================================

/**
 * @desc    Fetch Razorpay Public Key for Frontend
 * @route   GET /api/v1/payment/key
 * @access  Private (To prevent unauthorized API scraping)
 */
router.route("/key").get(protect, getRazorpayKey);

/**
 * @desc    Initiate a new payment order
 * @route   POST /api/v1/payment/create-order
 * @access  Private
 */
router.route("/create-order").post(protect, createRazorpayOrder);

/**
 * @desc    Verify signature and update order status in DB
 * @route   POST /api/v1/payment/verify
 * @access  Private
 */
router.route("/verify").post(protect, verifyPayment);

// 🚀 Export for Server.js
export default router;
