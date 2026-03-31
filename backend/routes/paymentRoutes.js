import express from "express";
import {
  getRazorpayKey,
  createRazorpayOrder,
  verifyPayment,
  razorpayWebhook, // Import the new controller
} from "../controllers/paymentController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/key", protect, getRazorpayKey);
router.post("/create", protect, createRazorpayOrder);
router.post("/verify", protect, verifyPayment);

// 🛡️ SECURITY FIX (SEC-4): Use express.raw() for webhook to preserve raw body for HMAC verification
router.post("/webhook", express.raw({ type: "application/json" }), razorpayWebhook);

export default router;
