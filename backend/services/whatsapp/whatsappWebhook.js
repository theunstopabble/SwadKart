import crypto from "crypto";
import User from "../../models/userModel.js";
import Order from "../../models/orderModel.js";
import SupportMessage from "../../models/supportMessageModel.js";
import whatsappConfig from "../../config/whatsapp.js";
import { logOutbound, logInbound } from "./whatsappLogger.js";

function verifySignature(rawBody, signature) {
  if (!whatsappConfig.webhookSecret) return true;
  if (!signature) {
    console.warn("[webhook] Missing signature header, skipping verification");
    return false;
  }
  let expected;
  try {
    expected = crypto
      .createHmac("sha256", whatsappConfig.webhookSecret)
      .update(rawBody)
      .digest("hex");
  } catch {
    return false;
  }
  if (signature.length !== expected.length) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  } catch {
    return false;
  }
}

function extractPhone(chatId) {
  if (!chatId) return "";
  return chatId.replace(/@[cgs]\.us$/, "").replace(/@s\.whatsapp\.net$/, "");
}

let recentMessages = new Map();
setInterval(() => recentMessages.clear(), 60 * 1000);

function isDuplicate(senderPhone, body) {
  const key = `${senderPhone}:${body}`;
  if (recentMessages.has(key)) return true;
  recentMessages.set(key, Date.now());
  return false;
}

async function getOrCreateSession(phone) {
  if (!whatsappConfig.isolateSessions) return whatsappConfig.defaultSession;
  try {
    const { listSessions, createSession, startSession } = await import("./whatsappService.js");
    const sessionName = `swadkart_${phone}`;
    const sessions = await listSessions(100);
    const existing = sessions?.find((s) => s.name === sessionName);
    if (existing) return existing.id;
    const created = await createSession(sessionName, { autoReconnect: true });
    startSession(created.id).catch(() => {});
    return created.id;
  } catch {
    return whatsappConfig.defaultSession;
  }
}

async function replyToUser(chatId, text, sessionId, logCtx) {
  try {
    const { sendText } = await import("./whatsappService.js");
    await sendText(sessionId, chatId, text, logCtx);
  } catch (err) {
    console.error("[whatsappWebhook] Failed to send reply:", err.message);
  }
}

async function handleComplaintIntent(chatId, senderPhone, body, userId, sessionId) {
  try {
    await SupportMessage.create({
      user: userId,
      phone: senderPhone,
      message: body.slice(0, 2000),
      sessionId,
      chatId,
    });
    await replyToUser(
      chatId,
      "🙏 I've forwarded your concern to our support team. They'll reach out to you shortly.",
      sessionId,
      { user: userId, phone: senderPhone, metadata: { type: "support_ack" } },
    );
  } catch (err) {
    console.error("[whatsappWebhook] Support routing error:", err.message);
  }
}

async function updateOrderNote(chatId, senderPhone, body, userId) {
  if (!userId) return;
  try {
    const order = await Order.findOne({ user: userId, orderStatus: { $nin: ["Delivered", "Cancelled"] } })
      .sort({ createdAt: -1 })
      .select("_id orderStatus whatsappOrderNote")
      .lean();
    if (!order) return;
    const existing = order.whatsappOrderNote || "";
    const updated = existing
      ? `${existing}\n[WhatsApp ${new Date().toLocaleString()}] ${body.slice(0, 500)}`
      : `[WhatsApp ${new Date().toLocaleString()}] ${body.slice(0, 500)}`;
    await Order.findByIdAndUpdate(order._id, { whatsappOrderNote: updated.slice(0, 2000) });
  } catch (err) {
    console.error("[whatsappWebhook] Order note update error:", err.message);
  }
}

async function routeToChatbot(chatId, senderPhone, body, sessionId) {
  const waSessionId = `wa_${senderPhone}`;

  try {
    const user = await User.findOne({
      phone: { $in: [senderPhone, senderPhone.replace(/^91/, ""), `91${senderPhone.replace(/^91/, "")}`] },
    }).select("_id phone whatsappNotifications").lean();

    const userId = user?._id || null;

    const { runChatPipeline } = await import("../chat/chatPipeline.js");
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    const result = await runChatPipeline({
      userId,
      sessionId: waSessionId,
      message: body,
      signal: controller.signal,
    });
    clearTimeout(timeout);

    const reply = result?.reply;
    const intent = result?.intent;

    // Route complaints to support queue
    if (intent === "complaint") {
      handleComplaintIntent(chatId, senderPhone, body, userId, sessionId);
      return;
    }

    // Update order note with customer reply
    if (intent === "order_inquiry" || intent === "order_placement") {
      updateOrderNote(chatId, senderPhone, body, userId);
    }

    if (reply) {
      await replyToUser(chatId, reply, sessionId, {
        user: userId,
        phone: senderPhone,
        metadata: { type: "chatbot_reply", waSessionId },
      });
    }
  } catch (err) {
    if (err.message === "pipeline_aborted") {
      await replyToUser(chatId, "⏳ I'm taking a bit longer than usual. Please try again in a moment.", sessionId);
      return;
    }
    await replyToUser(chatId, "🤖 I'm here to help! You can ask about menu, orders, or track delivery. Type 'help' to see what I can do.", sessionId);
  }
}

export async function handleWebhookEvent(event, sessionId, data) {
  switch (event) {
    case "message.received":
      return handleIncomingMessage(sessionId, data);
    case "session.status":
      return handleSessionStatus(sessionId, data);
    case "message.ack":
      return handleMessageAck(sessionId, data);
    default:
      console.log(`[whatsappWebhook] Unknown event: ${event}`);
      return { received: true };
  }
}

async function handleIncomingMessage(sessionId, data) {
  const { chatId, body, type, fromMe } = data;

  if (!body || type === "revoked" || fromMe) return { received: true };

  const senderPhone = extractPhone(chatId);

  if (isDuplicate(senderPhone, body)) {
    return { received: true, deduped: true };
  }

  logInbound({
    sessionId,
    chatId,
    phone: senderPhone,
    body: body.slice(0, 200),
    messageType: type === "text" ? "text" : "unknown",
  });

  routeToChatbot(chatId, senderPhone, body, sessionId);

  return { received: true, senderPhone, sessionId, routed: "chatbot" };
}

async function handleSessionStatus(sessionId, data) {
  const { status, lastError } = data;
  console.log(
    `[whatsappWebhook] Session ${sessionId} status: ${status}${lastError ? ` (${lastError})` : ""}`
  );

  if (status === "disconnected" || status === "failed") {
    console.warn(`[whatsappWebhook] Session ${sessionId} went ${status}`);
  }

  return { received: true, sessionId, status };
}

async function handleMessageAck(sessionId, data) {
  const { messageId, status } = data;
  try {
    const { updateMessageStatus } = await import("./whatsappLogger.js");
    updateMessageStatus(messageId, status).catch(() => {});
  } catch {}
  return { received: true };
}

export function parseWebhookPayload(rawBody, headers) {
  const signature = headers["x-webhook-signature"] || headers["x-wa-signature"] || "";
  if (!verifySignature(rawBody, signature)) {
    const err = new Error("Invalid webhook signature");
    err.statusCode = 401;
    throw err;
  }

  const payload = JSON.parse(rawBody.toString("utf-8"));
  const { event, sessionId, data } = payload;

  if (!event || !sessionId) {
    const err = new Error("Invalid webhook payload: missing event or sessionId");
    err.statusCode = 400;
    throw err;
  }

  return { event, sessionId, data: data || {} };
}
