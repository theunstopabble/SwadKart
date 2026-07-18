/**
 * Chat Controller — Thin Adapter
 *
 * Delegates to chatPipeline.js for the JSON one-shot reply endpoint.
 * Keeps existing request validation (message required, 1-2000 chars).
 *
 * Requirements: 7.4, 7.6, 11.1
 */

import { runChatPipeline } from "../services/chat/chatPipeline.js";

const MAX_MESSAGE_LENGTH = 2000;

const UUID_V4_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * POST /api/v1/chat — JSON one-shot reply (legacy + non-streaming clients)
 */
export const chatWithGenie = async (req, res) => {
  try {
    const { message, cartItems } = req.body;
    const userId = req.user ? req.user._id.toString() : null;
    const rawSessionId = typeof req.body.sessionId === "string" ? req.body.sessionId.trim() : "";
    const sessionId = UUID_V4_REGEX.test(rawSessionId) ? rawSessionId : null;

    // ─── Validation ────────────────────────────────────────────────
    if (!message || typeof message !== "string" || message.trim().length === 0) {
      return res
        .status(400)
        .json({ reply: "Kuch boliyega toh hi madat karunga na! 🧞‍♂️" });
    }

    if (message.length > MAX_MESSAGE_LENGTH) {
      return res.status(400).json({
        reply: `Arre boss, message bahut lamba hai! Max ${MAX_MESSAGE_LENGTH} characters allowed. 😅`,
      });
    }

    if (!sessionId) {
      return res.status(400).json({
        reply: "Session ID is required. Please refresh and try again.",
      });
    }

    // ─── Delegate to pipeline ──────────────────────────────────────
    const attachments = (req.files || []).map((f) => ({
      originalname: f.originalname,
      mimetype: f.mimetype,
      size: f.size,
      buffer: f.buffer,
    }));

    const result = await runChatPipeline({
      userId,
      sessionId,
      message: message.trim(),
      cartItems: cartItems || [],
      attachments,
      emit: null, // JSON mode — no streaming
    });

    return res.json({
      reply: result.reply,
      language: result.language,
      intent: result.intent,
      sentiment: result.sentiment,
      degraded: result.degraded,
      messageId: result.messageId,
      attachments: (req.files || []).map((f) => ({
        name: f.originalname,
        type: f.mimetype,
        size: f.size,
      })),
    });
  } catch (error) {
    console.error("🧞‍♂️ Genie Brain Freeze:", error.message);
    res.status(500).json({
      reply: "Arre boss! Server thoda busy hai. 2 minute baad try karna! 😴",
    });
  }
};
