/**
 * Conversation Repository — Persistence Layer for Chat Conversations
 *
 * Provides atomic message appending with capped arrays, recent message loading
 * with 24h freshness check, conversation listing, and single conversation retrieval.
 */

import prisma from "../../config/prisma.js";

const MAX_MESSAGES = 200;
const MAX_RETRIES = 2;
const BASE_DELAY_MS = 200;
const FRESHNESS_MS = 24 * 60 * 60 * 1000;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Append messages to a conversation atomically.
 * Retries up to 2 times with exponential backoff on failure.
 *
 * @param {{ sessionId: string, userId: string|null, messages: Array<object> }} params
 * @returns {Promise<object>} The updated conversation document
 */
export async function appendMessages({ sessionId, userId, messages }) {
  if (!sessionId) throw new Error("sessionId required");
  let lastError;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const existing = await prisma.conversation.findUnique({
        where: { sessionId },
      });

      const existingMessages = existing && Array.isArray(existing.messages) ? existing.messages : [];
      const updatedMessages = [...existingMessages, ...messages].slice(-MAX_MESSAGES);

      const conversation = await prisma.conversation.upsert({
        where: { sessionId },
        create: {
          sessionId,
          userId: userId || null,
          messages: updatedMessages,
        },
        update: {
          ...(userId ? { userId } : {}),
          messages: updatedMessages,
        },
      });

      return conversation;
    } catch (error) {
      lastError = error;
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
  const conversation = await prisma.conversation.findUnique({
    where: { sessionId },
  });

  if (!conversation) {
    return [];
  }

  // Check 24h freshness
  const now = Date.now();
  const updatedAt = new Date(conversation.updatedAt).getTime();

  if (now - updatedAt > FRESHNESS_MS) {
    return [];
  }

  const messages = Array.isArray(conversation.messages) ? conversation.messages : [];
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
  const conversations = await prisma.conversation.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    take: 10,
    select: {
      id: true,
      sessionId: true,
      messages: true,
      updatedAt: true,
    },
  });

  return conversations.map((conv) => {
    const messages = Array.isArray(conv.messages) ? conv.messages : [];
    const lastMsg =
      messages.length > 0 ? messages[messages.length - 1].content || "" : "";

    return {
      id: conv.id.toString(),
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
 * @param {string} conversationId - The conversation's ID
 * @param {string} userId - The user's ID (ownership check)
 * @returns {Promise<object|null>} The conversation document or null
 */
export async function loadConversation(conversationId, userId) {
  if (!conversationId) return null;
  const conversation = await prisma.conversation.findFirst({
    where: {
      id: conversationId,
      userId,
    },
  });

  return conversation || null;
}
