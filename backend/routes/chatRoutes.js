import express from "express";
import multer from "multer";
import { chatWithGenie } from "../controllers/chatController.js";
import rateLimit from "express-rate-limit";
import { optionalAuth } from "../middleware/authMiddleware.js";

const router = express.Router();

// 📎 Multer config for chat file attachments
const storage = multer.memoryStorage(); // Store in memory (fast, no disk cleanup needed)
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max per file
  fileFilter: (req, file, cb) => {
    const allowedMimes = [
      "image/jpeg", "image/png", "image/gif", "image/webp",
      "application/pdf",
      "text/plain",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only images (JPG, PNG, GIF, WebP), PDF, TXT, and DOCX are allowed."));
    }
  },
});

// Strict rate limit for AI endpoint (10 requests per minute per IP)
const chatLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { reply: "Arre boss! Thoda slow lo. 1 minute baad try karna. ⏳" },
});

router.post("/", chatLimiter, optionalAuth, upload.array("attachments", 3), chatWithGenie);

export default router;
