import express from "express";
import { parseWebhookPayload, handleWebhookEvent } from "../services/whatsapp/whatsappWebhook.js";
import WhatsAppLog from "../models/whatsappLogModel.js";

const router = express.Router();

router.post("/webhook", async (req, res) => {
  try {
    const rawBody = req.body;
    const { event, sessionId, data } = parseWebhookPayload(rawBody, req.headers);
    const result = await handleWebhookEvent(event, sessionId, data);
    return res.status(200).json(result);
  } catch (err) {
    const status = err.statusCode || 500;
    return res.status(status).json({ error: err.message });
  }
});

router.get("/health", async (_req, res) => {
  try {
    const { listSessions } = await import("../services/whatsapp/whatsappService.js");
    const sessions = await listSessions(1);
    return res.json({ status: "ok", sessions: Array.isArray(sessions) ? sessions.length : 0 });
  } catch {
    return res.status(503).json({ status: "unavailable" });
  }
});

router.get("/metrics", async (_req, res) => {
  try {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    const [daily, hourly, byStatus, byType] = await Promise.all([
      WhatsAppLog.countDocuments({ createdAt: { $gte: oneDayAgo } }),
      WhatsAppLog.countDocuments({ createdAt: { $gte: oneHourAgo } }),
      WhatsAppLog.aggregate([
        { $match: { createdAt: { $gte: oneDayAgo } } },
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]),
      WhatsAppLog.aggregate([
        { $match: { createdAt: { $gte: oneDayAgo } } },
        { $group: { _id: "$messageType", count: { $sum: 1 } } },
      ]),
    ]);

    const statusMap = {};
    for (const s of byStatus) statusMap[s._id] = s.count;
    const typeMap = {};
    for (const t of byType) typeMap[t._id] = t.count;

    res.json({
      status: "ok",
      metrics: {
        total24h: daily,
        total1h: hourly,
        byStatus: statusMap,
        byType: typeMap,
      },
    });
  } catch (err) {
    res.status(503).json({ status: "unavailable", error: err.message });
  }
});

export default router;
