import express from "express";
import multer from "multer";
import { chatWithGenie } from "../controllers/chatController.js";
import { streamChat } from "../controllers/chatStreamController.js";
import { listConversations, getConversation } from "../controllers/chatHistoryController.js";
import { getSuggestions } from "../controllers/chatSuggestionsController.js";
import { getChatbotAnalytics } from "../controllers/chatAnalyticsController.js";
import { checkRateLimits } from "../services/chat/rateLimiter.js";
import { optionalAuth, protect, authorizeRoles } from "../middleware/authMiddleware.js";

const router = express.Router();
const adminRouter = express.Router();

// 📎 Multer config for chat file attachments
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max per file
  fileFilter: (_req, file, cb) => {
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

// ============================================================
// 🚦 Rate Limiter Middleware
// Wraps the checkRateLimits service into Express middleware
// ============================================================
const rateLimiterMiddleware = async (req, res, next) => {
  try {
    const result = await checkRateLimits({
      ip: req.ip,
      userId: req.user?._id?.toString() ?? null,
    });

    if (!result.ok) {
      return res.status(429).json({
        error: "rate_limited",
        retryAfterSeconds: result.retryAfterSeconds,
      });
    }

    next();
  } catch (error) {
    // If rate limiter itself errors, allow the request through (fail-open)
    next();
  }
};

// ============================================================
// 💬 Chat Routes (mounted at /api/v1/chat)
// ============================================================

// POST /api/v1/chat — JSON one-shot reply (existing, refactored)
router.post(
  "/",
  optionalAuth,
  rateLimiterMiddleware,
  upload.array("attachments", 3),
  chatWithGenie
);

// POST /api/v1/chat/stream — SSE streamed reply
router.post(
  "/stream",
  optionalAuth,
  rateLimiterMiddleware,
  upload.array("attachments", 3),
  streamChat
);

// GET /api/v1/chat/history — List past conversations (auth required)
router.get(
  "/history",
  protect,
  listConversations
);

// GET /api/v1/chat/history/:id — Load a specific conversation (auth required)
router.get(
  "/history/:id",
  protect,
  getConversation
);

// POST /api/v1/chat/suggestions — Quick-action chips (optional auth)
router.post(
  "/suggestions",
  optionalAuth,
  getSuggestions
);

// ============================================================
// 📊 Admin Analytics Route (mounted at /api/v1/admin)
// ============================================================

// GET /api/v1/admin/chatbot-analytics — Admin-protected analytics
adminRouter.get(
  "/chatbot-analytics",
  protect,
  authorizeRoles("admin"),
  getChatbotAnalytics
);

export default router;
export { adminRouter };
