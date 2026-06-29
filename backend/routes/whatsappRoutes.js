import express from "express";
import crypto from "crypto";
import { parseWebhookPayload, handleWebhookEvent } from "../services/whatsapp/whatsappWebhook.js";
import WhatsAppLog from "../models/whatsappLogModel.js";
import User from "../models/userModel.js";
import { setOTP, getOTP, deleteOTP } from "../utils/otpStore.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/send-otp", protect, async (req, res) => {
  try {
    const { phone } = req.body;
    const phoneRegex = /^[6-9]\d{9}$/;
    if (!phoneRegex.test(String(phone))) {
      return res.status(400).json({ message: "Invalid Indian phone number." });
    }
    const phoneExists = await User.findOne({ phone: String(phone) });
    if (phoneExists) {
      return res.status(400).json({ message: "Phone already linked to another account." });
    }
    const otp = crypto.randomInt(100000, 999999).toString();
    const { sendPhoneOTP } = await import("../services/whatsapp/whatsappService.js");
    try {
      await sendPhoneOTP(phone, otp);
    } catch (sendErr) {
      if (sendErr.response?.status === 429 || sendErr.message?.includes("429")) {
        console.warn("[send-otp] OpenWA rate limited, retrying in 15s...");
        await new Promise((r) => setTimeout(r, 15000));
        const { sendPhoneOTP: sendOTP2 } = await import("../services/whatsapp/whatsappService.js");
        await sendOTP2(phone, otp);
        return res.json({ message: "OTP sent to WhatsApp", expiresIn: 300 });
      }
      throw sendErr;
    }
    setOTP(req.user._id, { phone: String(phone), otp });
    res.json({ message: "OTP sent to WhatsApp", expiresIn: 300 });
  } catch (err) {
    console.error("[send-otp] Error:", err.message);
    res.status(500).json({ message: "Failed to send OTP. Try again." });
  }
});

router.post("/verify-phone-otp", protect, async (req, res) => {
  try {
    const { otp } = req.body;
    const pending = getOTP(req.user._id);
    if (!pending) {
      return res.status(400).json({ message: "OTP expired. Request a new one." });
    }
    if (pending.otp !== String(otp)) {
      return res.status(400).json({ message: "Invalid OTP." });
    }
    const existing = await User.findOne({ phone: String(pending.phone) });
    if (existing) {
      return res.status(400).json({ message: "Phone already linked to another account." });
    }
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { phone: String(pending.phone), phoneVerified: true },
      { returnDocument: "after" }
    ).select("-password");
    deleteOTP(req.user._id);
    res.json({ message: "Phone verified successfully!", user });
  } catch (err) {
    res.status(500).json({ message: "Verification failed." });
  }
});

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
