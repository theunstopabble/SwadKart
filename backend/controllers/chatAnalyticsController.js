/**
 * Chat Analytics Controller — Aggregate Metrics for Admin Dashboard
 *
 * Provides aggregated chatbot metrics over a configurable date range:
 * - Total conversations
 * - Average response time (ms)
 * - Intent distribution (count per intent label)
 * - Sentiment distribution (negative/neutral/positive buckets)
 * - Chat-to-order conversion rate
 *
 * Requirements: 9.3, 9.4, 9.5, 9.6, 9.7
 */

import Conversation from "../models/conversationModel.js";
import Order from "../models/orderModel.js";

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
 *
 * Query params:
 *   from: ISO date string (default: 7 days ago)
 *   to:   ISO date string (default: now)
 */
export const getChatbotAnalytics = async (req, res) => {
  try {
    // ─── Parse and validate date range ─────────────────────────────
    const now = new Date();
    const defaultFrom = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    let from = req.query.from ? new Date(req.query.from) : defaultFrom;
    let to = req.query.to ? new Date(req.query.to) : now;

    // Validate dates
    if (isNaN(from.getTime()) || isNaN(to.getTime())) {
      return res.status(400).json({ error: "Invalid date format. Use ISO date strings." });
    }

    if (from > to) {
      return res.status(400).json({ error: "Start date must be on or before end date." });
    }

    if (to > now) {
      return res.status(400).json({ error: "End date cannot be in the future." });
    }

    // ─── Total conversations ───────────────────────────────────────
    const totalConversations = await Conversation.countDocuments({
      createdAt: { $gte: from, $lte: to },
    });

    // ─── Average response time ─────────────────────────────────────
    const avgResponseResult = await Conversation.aggregate([
      { $match: { createdAt: { $gte: from, $lte: to }, lastResponseMs: { $ne: null } } },
      { $group: { _id: null, avgMs: { $avg: "$lastResponseMs" } } },
    ]);
    const avgResponseTimeMs = avgResponseResult.length > 0
      ? Math.round(avgResponseResult[0].avgMs)
      : 0;

    // ─── Intent distribution ───────────────────────────────────────
    const intentAgg = await Conversation.aggregate([
      { $match: { createdAt: { $gte: from, $lte: to } } },
      { $unwind: "$messages" },
      { $match: { "messages.role": "user", "messages.intent": { $exists: true, $ne: null } } },
      { $group: { _id: "$messages.intent", count: { $sum: 1 } } },
    ]);

    // Build full intent distribution with all labels (including 0-count)
    const intentMap = Object.fromEntries(INTENT_SET.map((label) => [label, 0]));
    for (const item of intentAgg) {
      if (INTENT_SET.includes(item._id)) {
        intentMap[item._id] = item.count;
      }
    }

    // Sort by count descending, then label ascending as tie-breaker
    const intentDistribution = Object.entries(intentMap)
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([label, count]) => ({ label, count }));

    // ─── Sentiment distribution ────────────────────────────────────
    const sentimentAgg = await Conversation.aggregate([
      { $match: { createdAt: { $gte: from, $lte: to } } },
      { $unwind: "$messages" },
      {
        $match: {
          "messages.role": "user",
          "messages.sentiment": { $exists: true, $ne: null },
        },
      },
      {
        $group: {
          _id: null,
          negative: {
            $sum: { $cond: [{ $lt: ["$messages.sentiment", -0.4] }, 1, 0] },
          },
          neutral: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $gte: ["$messages.sentiment", -0.4] },
                    { $lte: ["$messages.sentiment", 0.4] },
                  ],
                },
                1,
                0,
              ],
            },
          },
          positive: {
            $sum: { $cond: [{ $gt: ["$messages.sentiment", 0.4] }, 1, 0] },
          },
        },
      },
    ]);

    const sentimentDistribution = sentimentAgg.length > 0
      ? {
          negative: sentimentAgg[0].negative,
          neutral: sentimentAgg[0].neutral,
          positive: sentimentAgg[0].positive,
        }
      : { negative: 0, neutral: 0, positive: 0 };

    // ─── Conversion rate ───────────────────────────────────────────
    // Conversations with authenticated users in the date range
    const authenticatedConversations = await Conversation.find({
      createdAt: { $gte: from, $lte: to },
      userId: { $ne: null },
    })
      .select("userId messages updatedAt")
      .lean();

    let conversionsCount = 0;
    const totalAuthenticated = authenticatedConversations.length;

    if (totalAuthenticated > 0) {
      // For each authenticated conversation, check if the user placed an order
      // within 24 hours of the conversation's last assistant message
      for (const conv of authenticatedConversations) {
        // Find the last assistant message timestamp
        const assistantMessages = (conv.messages || []).filter(
          (m) => m.role === "assistant"
        );
        if (assistantMessages.length === 0) continue;

        const lastAssistantTime = new Date(
          assistantMessages[assistantMessages.length - 1].createdAt
        );
        const windowEnd = new Date(
          lastAssistantTime.getTime() + 24 * 60 * 60 * 1000
        );

        // Check if an order was placed in that window
        const orderExists = await Order.exists({
          user: conv.userId,
          createdAt: { $gte: lastAssistantTime, $lte: windowEnd },
        });

        if (orderExists) {
          conversionsCount++;
        }
      }
    }

    const conversionRate =
      totalAuthenticated > 0
        ? parseFloat(((conversionsCount / totalAuthenticated) * 100).toFixed(1))
        : 0.0;

    // ─── Response ──────────────────────────────────────────────────
    return res.json({
      dateRange: { from: from.toISOString(), to: to.toISOString() },
      totalConversations,
      avgResponseTimeMs,
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
