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

// 🛡️ SECURITY FIX (SEC-4): Raw body parsing is handled globally in server.js
// Do NOT add express.raw() here — it would consume the stream twice.
router.post("/webhook", razorpayWebhook);

export default router;
