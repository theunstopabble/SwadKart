import express from "express";
import { chatWithGenie } from "../controllers/chatController.js";
import rateLimit from "express-rate-limit";

const router = express.Router();

// Strict rate limit for AI endpoint (10 requests per minute per IP)
const chatLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { reply: "Arre boss! Thoda slow lo. 1 minute baad try karna. ⏳" },
});

router.post("/", chatLimiter, chatWithGenie);

export default router;
