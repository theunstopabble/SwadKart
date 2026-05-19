/**
 * Chat Stream Controller — SSE Handler
 *
 * Opens a Server-Sent Events stream and delegates to chatPipeline.js
 * with an `emit` callback that writes to the response.
 *
 * Features:
 * - SSE headers (Content-Type: text/event-stream, Cache-Control: no-cache, Connection: keep-alive)
 * - Client disconnect detection via req.on('close') → abort pipeline
 * - 30-second inactivity timeout (no token emitted) → close stream with error event
 *
 * Requirements: 11.1, 11.3, 11.4, 11.6, 11.7
 */

import { runChatPipeline } from "../services/chat/chatPipeline.js";
import { serializeEvent } from "../services/chat/sseSerializer.js";

const MAX_MESSAGE_LENGTH = 2000;

/** Inactivity timeout in milliseconds (30 seconds with no token) */
const STREAM_INACTIVITY_TIMEOUT_MS = 30_000;

/**
 * POST /api/v1/chat/stream — SSE streamed reply
 *
 * Opens an SSE connection, runs the chat pipeline with an emit callback,
 * and closes the stream when done or on timeout/disconnect.
 */
export const streamChat = async (req, res) => {
  const { message, cartItems, sessionId } = req.body;
  const userId = req.user ? req.user._id.toString() : null;

  // ─── Validation ──────────────────────────────────────────────────
  if (!message || typeof message !== "string" || message.trim().length === 0) {
    return res
      .status(400)
      .json({ error: "Message is required." });
  }

  if (message.length > MAX_MESSAGE_LENGTH) {
    return res.status(400).json({
      error: `Message exceeds maximum length of ${MAX_MESSAGE_LENGTH} characters.`,
    });
  }

  if (!sessionId) {
    return res.status(400).json({
      error: "Session ID is required.",
    });
  }

  // ─── Set SSE headers ─────────────────────────────────────────────
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no", // Disable nginx buffering
  });

  // ─── State tracking ──────────────────────────────────────────────
  let clientDisconnected = false;
  let inactivityTimer = null;
  let abortController = new AbortController();

  /**
   * Reset the inactivity timer. Called each time a token is emitted.
   */
  const resetInactivityTimer = () => {
    if (inactivityTimer) {
      clearTimeout(inactivityTimer);
    }
    inactivityTimer = setTimeout(() => {
      if (!clientDisconnected) {
        // Stream stalled — send error event and close
        try {
          const errorEvent = serializeEvent({
            id: `timeout_${Date.now()}`,
            type: "error",
            payload: { message: "Stream timeout — no response received for 30 seconds." },
          });
          res.write(errorEvent);
        } catch {
          // Swallow serialization errors
        }
        res.end();
      }
    }, STREAM_INACTIVITY_TIMEOUT_MS);
  };

  /**
   * Emit callback — writes SSE data to the response stream.
   * Resets the inactivity timer on each emission.
   */
  const emit = (data) => {
    if (clientDisconnected) return;
    resetInactivityTimer();
    res.write(data);
  };

  // ─── Client disconnect detection ────────────────────────────────
  req.on("close", () => {
    clientDisconnected = true;
    abortController.abort();
    if (inactivityTimer) {
      clearTimeout(inactivityTimer);
      inactivityTimer = null;
    }
  });

  // ─── Start inactivity timer ──────────────────────────────────────
  resetInactivityTimer();

  // ─── Run pipeline ────────────────────────────────────────────────
  try {
    const attachments = (req.files || []).map((f) => ({
      originalname: f.originalname,
      mimetype: f.mimetype,
      size: f.size,
      buffer: f.buffer,
    }));

    await runChatPipeline({
      userId,
      sessionId,
      message: message.trim(),
      cartItems: cartItems || [],
      attachments,
      emit,
    });
  } catch (error) {
    // Pipeline threw — send error event if client is still connected
    if (!clientDisconnected) {
      try {
        const errorEvent = serializeEvent({
          id: `err_${Date.now()}`,
          type: "error",
          payload: { message: "An error occurred while processing your request." },
        });
        res.write(errorEvent);
      } catch {
        // Swallow
      }
    }
  } finally {
    // Clean up timer
    if (inactivityTimer) {
      clearTimeout(inactivityTimer);
      inactivityTimer = null;
    }
    // Close the stream if client is still connected
    if (!clientDisconnected) {
      res.end();
    }
  }
};
