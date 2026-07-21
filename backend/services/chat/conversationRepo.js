/**
 * Conversation Repository — Persistence Layer for Chat Conversations
 *
 * Provides atomic message appending with capped arrays, recent message loading
 * with 24h freshness check, conversation listing, and single conversation retrieval.
 *
 * Requirements: 7.1, 7.2, 7.3, 7.8, 7.9
 */

import mongoose from "mongoose";
import Conversation from "../../models/conversationModel.js";

/**
 * Maximum number of messages retained per conversation document.
 */
const MAX_MESSAGES = 200;

/**
 * Maximum retry attempts for persistence failures.
 */
const MAX_RETRIES = 2;

/**
 * Base delay in milliseconds for exponential backoff.
 */
const BASE_DELAY_MS = 200;

/**
 * Freshness window in milliseconds (24 hours).
 */
const FRESHNESS_MS = 24 * 60 * 60 * 1000;

/**
 * Sleep utility for exponential backoff.
 *
 * @param {number} ms - Milliseconds to wait
 * @returns {Promise<void>}
 */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Append messages to a conversation atomically with $push + $slice:-200.
 * Retries up to 2 times with exponential backoff (200ms, 400ms) on failure.
 *
 * @param {{ sessionId: string, userId: string|null, messages: Array<object> }} params
 * @returns {Promise<object>} The updated conversation document
 * @throws {Error} If all retry attempts are exhausted
 */
export async function appendMessages({ sessionId, userId, messages }) {
  if (!sessionId) throw new Error("sessionId required");
  let lastError;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const update = {
        $push: {
          messages: {
            $each: messages,
            $slice: -MAX_MESSAGES,
          },
        },
      };

      // Set userId if provided (on upsert or update)
      if (userId) {
        update.$set = { userId };
      }

      const conversation = await Conversation.findOneAndUpdate(
        { sessionId },
        update,
        {
          upsert: true,
          returnDocument: "after",
          setDefaultsOnInsert: true,
        }
      );

      return conversation;
    } catch (error) {
      lastError = error;

      // If we haven't exhausted retries, wait with exponential backoff
      if (attempt < MAX_RETRIES) {
        const delay = BASE_DELAY_MS * Math.pow(2, attempt);
        await sleep(delay);
      }
    }
  }

  throw lastError;
}

/**
 * Load the most recent 20 messages for a session.
 * Returns empty array if the conversation's updatedAt is older than 24 hours (stale).
 *
 * @param {string} sessionId - The session identifier
 * @returns {Promise<Array<object>>} Last 20 messages or empty array if stale/not found
 */
export async function loadRecentMessages(sessionId) {
  const conversation = await Conversation.findOne({ sessionId });

  if (!conversation) {
    return [];
  }

  // Check 24h freshness
  const now = Date.now();
  const updatedAt = new Date(conversation.updatedAt).getTime();

  if (now - updatedAt > FRESHNESS_MS) {
    return [];
  }

  // Return last 20 messages
  const messages = conversation.messages || [];
  return messages.slice(-20);
}

/**
 * List the top 10 conversations for a user, sorted by updatedAt descending.
 *
 * @param {string} userId - The user's ID
 * @returns {Promise<Array<{ id: string, sessionId: string, lastMessage: string, updatedAt: Date }>>}
 */
export async function listConversations(userId) {
  if (!userId) return [];
  const conversations = await Conversation.find({ userId })
    .sort({ updatedAt: -1 })
    .limit(10)
    .select("sessionId messages updatedAt")
    .lean();

  return conversations.map((conv) => {
    const lastMsg =
      conv.messages && conv.messages.length > 0
        ? conv.messages[conv.messages.length - 1].content
        : "";

    return {
      id: conv._id.toString(),
      sessionId: conv.sessionId,
      lastMessage: lastMsg,
      updatedAt: conv.updatedAt,
    };
  });
}

/**
 * Load a single conversation by ID and userId.
 * Returns the full conversation document or null if not found / not owned by user.
 *
 * @param {string} conversationId - The conversation's _id
 * @param {string} userId - The user's ID (ownership check)
 * @returns {Promise<object|null>} The conversation document or null
 */
export async function loadConversation(conversationId, userId) {
  if (!mongoose.Types.ObjectId.isValid(conversationId)) return null;
  const conversation = await Conversation.findOne({
    _id: conversationId,
    userId,
  }).lean();

  return conversation || null;
}
