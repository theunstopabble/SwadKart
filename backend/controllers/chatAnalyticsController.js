/**
 * Chat Analytics Controller — Aggregate Metrics for Admin Dashboard
 */

import prisma from "../config/prisma.js";

/** The fixed intent set for distribution reporting */
const INTENT_SET = [
  "order_inquiry",
  "recommendation",
  "complaint",
  "navigation_help",
  "order_placement",
  "general_chat",
  "greeting",
  "farewell",
  "unknown",
];

/**
 * GET /api/v1/admin/chatbot-analytics — Aggregate chatbot metrics
 */
export const getChatbotAnalytics = async (req, res) => {
  try {
    const now = new Date();
    const defaultFrom = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    let from = req.query.from ? new Date(req.query.from) : defaultFrom;
    let to = req.query.to ? new Date(req.query.to) : now;

    if (isNaN(from.getTime()) || isNaN(to.getTime())) {
      return res.status(400).json({ error: "Invalid date format. Use ISO date strings." });
    }

    if (from > to) {
      return res.status(400).json({ error: "Start date must be on or before end date." });
    }

    if (to > now) {
      return res.status(400).json({ error: "End date cannot be in the future." });
    }

    const conversations = await prisma.conversation.findMany({
      where: {
        createdAt: { gte: from, lte: to },
      },
      select: {
        id: true,
        userId: true,
        messages: true,
        createdAt: true,
      },
    });

    const totalConversations = conversations.length;

    // Intent and Sentiment distributions
    const intentMap = Object.fromEntries(INTENT_SET.map((label) => [label, 0]));
    let negative = 0;
    let neutral = 0;
    let positive = 0;

    const authConversationsWithLastAssistant = [];

    for (const conv of conversations) {
      const messages = Array.isArray(conv.messages) ? conv.messages : [];
      let lastAssistantTime = null;

      for (const msg of messages) {
        if (msg.role === "user") {
          if (msg.intent && INTENT_SET.includes(msg.intent)) {
            intentMap[msg.intent] += 1;
          }
          if (typeof msg.sentiment === "number") {
            if (msg.sentiment < -0.4) {
              negative += 1;
            } else if (msg.sentiment > 0.4) {
              positive += 1;
            } else {
              neutral += 1;
            }
          }
        } else if (msg.role === "assistant") {
          lastAssistantTime = msg.createdAt ? new Date(msg.createdAt) : conv.createdAt;
        }
      }

      if (conv.userId && lastAssistantTime) {
        authConversationsWithLastAssistant.push({
          userId: conv.userId,
          lastAssistantTime,
        });
      }
    }

    const intentDistribution = Object.entries(intentMap)
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([label, count]) => ({ label, count }));

    const sentimentDistribution = { negative, neutral, positive };

    // Chat to order conversion rate
    let conversionsCount = 0;
    const totalAuthenticated = authConversationsWithLastAssistant.length;

    if (totalAuthenticated > 0) {
      const userIds = authConversationsWithLastAssistant.map((c) => c.userId);
      const orders = await prisma.order.findMany({
        where: {
          userId: { in: userIds },
          createdAt: { gte: from },
        },
        select: { userId: true, createdAt: true },
      });

      for (const { userId, lastAssistantTime } of authConversationsWithLastAssistant) {
        const orderTimeLimit = new Date(lastAssistantTime.getTime() + 24 * 60 * 60 * 1000);
        const hasOrder = orders.some(
          (o) =>
            o.userId === userId &&
            new Date(o.createdAt) >= lastAssistantTime &&
            new Date(o.createdAt) <= orderTimeLimit
        );
        if (hasOrder) conversionsCount += 1;
      }
    }

    const conversionRate =
      totalAuthenticated > 0
        ? parseFloat(((conversionsCount / totalAuthenticated) * 100).toFixed(1))
        : 0.0;

    return res.json({
      dateRange: { from: from.toISOString(), to: to.toISOString() },
      totalConversations,
      avgResponseTimeMs: 0,
      intentDistribution,
      sentimentDistribution,
      conversionRate,
    });
  } catch (error) {
    console.error("Chat analytics error:", error.message);
    return res.status(500).json({
      error: "Failed to compute analytics.",
    });
  }
};
