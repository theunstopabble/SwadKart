import WhatsAppLog from "../../models/whatsappLogModel.js";

const MAX_BODY_LENGTH = 500;

function truncate(str, max = MAX_BODY_LENGTH) {
  if (!str) return "";
  return str.length > max ? str.slice(0, max) + "..." : str;
}

export async function logOutbound({
  messageType = "text",
  sessionId = "",
  chatId = "",
  phone = "",
  messageId = "",
  body = "",
  status = "pending",
  error = null,
  durationMs = 0,
  user = null,
  order = null,
  batchId = null,
  metadata = {},
}) {
  try {
    await WhatsAppLog.create({
      direction: "outbound",
      messageType,
      sessionId,
      chatId,
      phone,
      messageId,
      body: truncate(body),
      status,
      error: error ? truncate(error, 300) : null,
      durationMs,
      user,
      order,
      batchId,
      metadata,
    });
  } catch (err) {
    console.error("[whatsappLogger] Failed to persist outbound log:", err.message);
  }
}

export async function logInbound({
  sessionId = "",
  chatId = "",
  phone = "",
  messageId = "",
  body = "",
  messageType = "unknown",
  metadata = {},
}) {
  try {
    await WhatsAppLog.create({
      direction: "inbound",
      messageType,
      sessionId,
      chatId,
      phone,
      messageId,
      body: truncate(body),
      status: "delivered",
      metadata,
    });
  } catch (err) {
    console.error("[whatsappLogger] Failed to persist inbound log:", err.message);
  }
}

export async function updateMessageStatus(messageId, status, error = null) {
  try {
    await WhatsAppLog.findOneAndUpdate(
      { messageId },
      { status, error: error ? truncate(error, 300) : null },
    );
  } catch (err) {
    console.error("[whatsappLogger] Failed to update message status:", err.message);
  }
}
