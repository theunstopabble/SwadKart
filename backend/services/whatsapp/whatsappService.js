import axios from "axios";
import whatsappConfig, { ensureEnabled } from "../../config/whatsapp.js";
import { logOutbound, logInbound, updateMessageStatus } from "./whatsappLogger.js";
import { enqueueRetry } from "./whatsappRetryQueue.js";
import * as T from "./whatsappTemplates.js";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function api() {
  ensureEnabled();
  return axios.create({
    baseURL: `${whatsappConfig.baseUrl}/api`,
    headers: {
      "X-API-Key": whatsappConfig.apiKey,
      "Content-Type": "application/json",
    },
    timeout: whatsappConfig.requestTimeout,
  });
}

const sessionNameCache = new Map();
let sessionNameCacheTimer = null;
function resetSessionCache() {
  sessionNameCache.clear();
  sessionNameCacheTimer = null;
}

async function resolveSessionId(nameOrId) {
  if (!nameOrId || UUID_REGEX.test(nameOrId)) return nameOrId;
  if (sessionNameCache.has(nameOrId)) return sessionNameCache.get(nameOrId);
  try {
    const { data } = await api().get("/sessions");
    const sessions = Array.isArray(data) ? data : [];
    const match = sessions.find((s) => s.name === nameOrId);
    if (match) {
      sessionNameCache.set(nameOrId, match.id);
      if (!sessionNameCacheTimer) sessionNameCacheTimer = setTimeout(resetSessionCache, 5 * 60 * 1000);
      return match.id;
    }
  } catch {}
  return nameOrId;
}

async function retry(fn, attempts = whatsappConfig.maxRetries) {
  let lastErr;
  for (let i = 0; i <= attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (i < attempts) {
        await new Promise((r) => setTimeout(r, Math.pow(2, i) * 200));
      }
    }
  }
  throw lastErr;
}

function extractPhone(chatId) {
  if (!chatId) return "";
  return chatId.replace(/@[cgs]\.us$/, "").replace(/@s\.whatsapp\.net$/, "").replace(/^91(\d{10})$/, "$1");
}

async function logSend(sessionId, chatId, body, msgType, start, result, error, logCtx) {
  const durationMs = Date.now() - start;
  const phone = logCtx?.phone || extractPhone(chatId);
  if (!logCtx?.suppressLog) {
    logOutbound({
      messageType: msgType,
      sessionId,
      chatId,
      phone,
      messageId: result?.messageId || "",
      body: body || "",
      status: error ? "failed" : "sent",
      error: error?.message || null,
      durationMs,
      user: logCtx?.user || null,
      order: logCtx?.order || null,
      metadata: logCtx?.metadata || {},
    });
  }
  if (error && !logCtx?.suppressRetry) {
    enqueueRetry({
      direction: "outbound",
      messageType: msgType,
      sessionId,
      chatId,
      phone,
      body: body || "",
      user: logCtx?.user || null,
      order: logCtx?.order || null,
      metadata: { ...logCtx?.metadata, url: logCtx?.url, filename: logCtx?.filename, error: error.message },
    });
  }
}

export async function createSession(name, config = {}) {
  return retry(async () => {
    const { data } = await api().post("/sessions", { name, config });
    return data;
  });
}

export async function startSession(sessionId) {
  return retry(async () => {
    const { data } = await api().post(`/sessions/${sessionId}/start`);
    return data;
  });
}

export async function stopSession(sessionId) {
  return retry(async () => {
    const { data } = await api().post(`/sessions/${sessionId}/stop`);
    return data;
  });
}

export async function getSession(sessionId) {
  const { data } = await api().get(`/sessions/${sessionId}`);
  return data;
}

export async function listSessions(limit = 100, offset = 0) {
  const { data } = await api().get("/sessions", { params: { limit, offset } });
  return data;
}

export async function getQRCode(sessionId) {
  const { data } = await api().get(`/sessions/${sessionId}/qr`);
  return data;
}

export async function deleteSession(sessionId) {
  await api().delete(`/sessions/${sessionId}`);
}

export async function sendText(sessionId, chatId, text, logCtx = {}) {
  const start = Date.now();
  const sid = await resolveSessionId(sessionId);
  try {
    const { data } = await retry(async () => {
      const res = await api().post(`/sessions/${sid}/messages/send-text`, { chatId, text });
      return res.data;
    });
    logSend(sid, chatId, text, "text", start, data, null, logCtx);
    return data;
  } catch (error) {
    logSend(sid, chatId, text, "text", start, null, error, logCtx);
    throw error;
  }
}

export async function sendImage(sessionId, chatId, url, caption = "", logCtx = {}) {
  const start = Date.now();
  const sid = await resolveSessionId(sessionId);
  try {
    const { data } = await retry(async () => {
      const res = await api().post(`/sessions/${sid}/messages/send-image`, { chatId, url, caption });
      return res.data;
    });
    logSend(sid, chatId, caption, "image", start, data, null, { ...logCtx, url, metadata: { ...logCtx.metadata, url } });
    return data;
  } catch (error) {
    logSend(sid, chatId, caption, "image", start, null, error, { ...logCtx, url, metadata: { ...logCtx.metadata, url } });
    throw error;
  }
}

export async function sendDocument(sessionId, chatId, url, filename, caption = "", logCtx = {}) {
  const start = Date.now();
  const sid = await resolveSessionId(sessionId);
  try {
    const { data } = await retry(async () => {
      const res = await api().post(`/sessions/${sid}/messages/send-document`, { chatId, url, filename, caption });
      return res.data;
    });
    logSend(sid, chatId, filename, "document", start, data, null, { ...logCtx, url, filename, metadata: { ...logCtx.metadata, url, filename } });
    return data;
  } catch (error) {
    logSend(sid, chatId, filename, "document", start, null, error, { ...logCtx, url, filename, metadata: { ...logCtx.metadata, url, filename } });
    throw error;
  }
}

export async function sendTemplate(sessionId, chatId, templateName, vars = {}, logCtx = {}) {
  const start = Date.now();
  try {
    const { data } = await retry(async () => {
      const res = await api().post(`/sessions/${sessionId}/messages/send-template`, { chatId, templateName, vars });
      return res.data;
    });
    logSend(sessionId, chatId, templateName, "template", start, data, null, logCtx);
    return data;
  } catch (error) {
    logSend(sessionId, chatId, templateName, "template", start, null, error, logCtx);
    throw error;
  }
}

export async function sendBulk(sessionId, messages, options = {}) {
  const { data } = await api().post(`/sessions/${sessionId}/messages/send-bulk`, { messages, options });
  if (data?.batchId) {
    logOutbound({
      messageType: "text",
      sessionId,
      status: "pending",
      body: `bulk:${data.batchId} (${messages.length} messages)`,
      batchId: data.batchId,
      metadata: { totalMessages: messages.length, batchId: data.batchId },
    });
  }
  return data;
}

export async function getBatchStatus(sessionId, batchId) {
  const { data } = await api().get(`/sessions/${sessionId}/messages/batch/${batchId}`);
  return data;
}

export async function getMessageHistory(sessionId, chatId, limit = 50, offset = 0) {
  const { data } = await api().get(`/sessions/${sessionId}/messages`, {
    params: { chatId, limit, offset },
  });
  return data;
}

export async function setupWebhook(sessionId, url, events, secret = "") {
  const { data } = await api().post(`/sessions/${sessionId}/webhooks`, { url, events, secret });
  return data;
}

export async function getContacts(sessionId, limit = 1000, offset = 0) {
  const { data } = await api().get(`/sessions/${sessionId}/contacts`, {
    params: { limit, offset },
  });
  return data;
}

export async function checkContact(sessionId, number) {
  const { data } = await api().get(`/sessions/${sessionId}/contacts/check/${number}`);
  return data;
}

export async function sendPairingCode(sessionId, phoneNumber) {
  const { data } = await api().post(`/sessions/${sessionId}/pairing-code`, {
    phoneNumber,
  });
  return data;
}

// ─── High-Level Convenience Methods ──────────────────────────────

const DEFAULT_SESSION = "default";

function toChatId(phone) {
  const p = String(phone).replace(/^\+/, "");
  return p.includes("@") ? p : `${p}@c.us`;
}

export async function sendOrderConfirmation(order, user, sessionId = DEFAULT_SESSION) {
  if (!user?.phoneVerified) return;
  const text = T.getORDER_CONFIRMATION(order, order.isPaid);
  const orderRef = order._id.toString().slice(-6).toUpperCase();
  return sendText(sessionId, toChatId(user.phone), text, { user: user._id, order: order._id, phone: user.phone, metadata: { type: "order_confirmation", orderRef } });
}

export async function sendStatusUpdate(order, user, newStatus, sessionId = DEFAULT_SESSION) {
  if (!user?.phoneVerified) return;
  const text = T.getORDER_STATUS(order, newStatus);
  const orderRef = order._id.toString().slice(-6).toUpperCase();
  return sendText(sessionId, toChatId(user.phone), text, { user: user._id, order: order._id, phone: user.phone, metadata: { type: "status_update", orderRef, newStatus } });
}

export async function sendOTP(phone, otp, sessionId = DEFAULT_SESSION) {
  const text = T.getOTP(otp);
  return sendText(sessionId, toChatId(phone), text, { phone, metadata: { type: "otp" } });
}

export async function sendPhoneOTP(phone, otp, sessionId = DEFAULT_SESSION, extraCtx = {}) {
  const text = T.getPhoneOTP(otp);
  return sendText(sessionId, toChatId(phone), text, { ...extraCtx, phone, metadata: { ...extraCtx.metadata, type: "phone_otp" } });
}

export async function sendPromotional(user, coupon, sessionId = DEFAULT_SESSION) {
  if (!user?.phoneVerified) return;
  const text = T.getPROMOTIONAL(coupon);
  return sendText(sessionId, toChatId(user.phone), text, { user: user._id, phone: user.phone, metadata: { type: "promotional", couponCode: coupon.code } });
}

export async function sendDriverAssigned(order, user, partner, sessionId = DEFAULT_SESSION) {
  if (!user?.phoneVerified) return;
  const text = T.getDRIVER_ASSIGNED(order, partner);
  return sendText(sessionId, toChatId(user.phone), text, { user: user._id, order: order._id, phone: user.phone, metadata: { type: "driver_assigned", partnerId: partner._id } });
}

export async function sendOrderCancelled(order, user, reason, sessionId = DEFAULT_SESSION) {
  if (!user?.phoneVerified) return;
  const text = T.getORDER_CANCELLED(order, reason);
  return sendText(sessionId, toChatId(user.phone), text, { user: user._id, order: order._id, phone: user.phone, metadata: { type: "order_cancelled", reason } });
}

export async function sendDeliveryRequest(order, partner, sessionId = DEFAULT_SESSION) {
  const text = T.getDELIVERY_REQUEST(order, partner);
  return sendText(sessionId, toChatId(partner.phone), text, { user: partner._id, order: order._id, phone: partner.phone, metadata: { type: "delivery_request" } });
}

export async function sendRestaurantAlert(order, restaurantName, sessionId = DEFAULT_SESSION) {
  const text = T.getRESTAURANT_ALERT(order, restaurantName);
  return sendText(sessionId, toChatId(order.restaurantPhone), text, { order: order._id, phone: order.restaurantPhone, metadata: { type: "restaurant_alert", restaurantName } });
}
