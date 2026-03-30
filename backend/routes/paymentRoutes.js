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

// Route for Razorpay Webhooks (No 'protect' middleware here)
router.post("/webhook", razorpayWebhook);

export default router;
