/**
 * Chat History Controller — List and Load Past Conversations
 *
 * Provides endpoints for authenticated users to browse and load
 * their past chat conversations.
 *
 * Requirements: 7.4, 7.6
 */

import * as conversationRepo from "../services/chat/conversationRepo.js";

/**
 * GET /api/v1/chat/history — List the user's most recent 10 conversations
 */
export const listConversations = async (req, res) => {
  try {
    const userId = req.user._id.toString();

    const conversations = await conversationRepo.listConversations(userId);

    return res.json({ conversations });
  } catch (error) {
    console.error("Chat history list error:", error.message);
    return res.status(500).json({
      error: "Failed to load conversation history.",
    });
  }
};

/**
 * GET /api/v1/chat/history/:id — Load a specific conversation by ID
 */
export const getConversation = async (req, res) => {
  try {
    const userId = req.user._id.toString();
    const conversationId = req.params.id;

    if (!conversationId) {
      return res.status(400).json({ error: "Conversation ID is required." });
    }

    const conversation = await conversationRepo.loadConversation(
      conversationId,
      userId
    );

    if (!conversation) {
      return res.status(404).json({ error: "Conversation not found." });
    }

    return res.json({
      id: conversation._id.toString(),
      sessionId: conversation.sessionId,
      language: conversation.language,
      messages: conversation.messages,
      escalationFlag: conversation.escalationFlag,
      updatedAt: conversation.updatedAt,
      createdAt: conversation.createdAt,
    });
  } catch (error) {
    console.error("Chat history load error:", error.message);
    return res.status(500).json({
      error: "Failed to load conversation.",
    });
  }
};
