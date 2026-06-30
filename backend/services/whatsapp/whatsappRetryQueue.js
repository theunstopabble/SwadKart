import WhatsAppLog from "../../models/whatsappLogModel.js";
import { sendText, sendImage, sendDocument } from "./whatsappService.js";
import { updateMessageStatus } from "./whatsappLogger.js";

const MAX_RETRIES = 3;
const RETRY_INTERVAL_MS = 30 * 1000;
const isProduction = process.env.NODE_ENV === "production";
let intervalHandle = null;

function scheduleNext() {
  if (intervalHandle) return;
  if (!isProduction) {
    console.log("[whatsappRetryQueue] Retry queue active every 30s");
  }
  intervalHandle = setInterval(processFailedMessages, RETRY_INTERVAL_MS);
  if (intervalHandle.unref) intervalHandle.unref();
}

export function startRetryQueue() {
  scheduleNext();
}

export function stopRetryQueue() {
  if (intervalHandle) {
    clearInterval(intervalHandle);
    intervalHandle = null;
  }
}

async function processFailedMessages() {
  try {
    const OTP_TYPES = ["otp", "phone_otp"];

    // Bulk-cancel all OTP failed entries — they expire in 5 min, never retry
    await WhatsAppLog.updateMany(
      { direction: "outbound", status: "failed", "metadata.type": { $in: OTP_TYPES } },
      { $set: { status: "cancelled", error: "OTP expired — not retried" } },
    );

    // Clean stale entries older than 1 hour
    const staleCutoff = new Date(Date.now() - 60 * 60 * 1000);
    await WhatsAppLog.updateMany(
      { direction: "outbound", status: "failed", createdAt: { $lt: staleCutoff } },
      { $set: { status: "cancelled", error: "Stale — not retried" } },
    );

    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const failed = await WhatsAppLog.find({
      direction: "outbound",
      status: "failed",
      createdAt: { $gte: cutoff },
    }).lean().limit(20);

    for (const log of failed) {
      // NEVER retry OTPs — they expire in 5 minutes
      if (OTP_TYPES.includes(log.metadata?.type)) {
        await updateMessageStatus(log.messageId, "cancelled", "OTP expired — not retried");
        continue;
      }

      const retryCount = (log.metadata?.retryCount || 0) + 1;
      if (retryCount > MAX_RETRIES) {
        await updateMessageStatus(log.messageId, "cancelled", "Max retries exceeded");
        continue;
      }

      try {
        let result;
        const retryCtx = { suppressRetry: true, suppressLog: true };
        switch (log.messageType) {
          case "image":
            result = await sendImage(log.sessionId || "default", log.chatId, log.metadata?.url || "", "", retryCtx);
            break;
          case "document":
            result = await sendDocument(log.sessionId || "default", log.chatId, log.metadata?.url || "", log.metadata?.filename || "", "", retryCtx);
            break;
          default:
            result = await sendText(log.sessionId || "default", log.chatId, log.body || "", retryCtx);
        }

        const newMsgId = result?.messageId || "";
        await updateMessageStatus(log.messageId, "sent");
        await WhatsAppLog.findOneAndUpdate(
          { _id: log._id },
          {
            $set: {
              messageId: newMsgId || log.messageId,
              status: "sent",
              error: null,
              "metadata.retryCount": retryCount,
              "metadata.retriedAt": new Date().toISOString(),
            },
          },
        );
      } catch (err) {
        if (err.response?.status === 429) {
          console.warn("[whatsappRetryQueue] Rate limited — marking entry as rate_limited");
          await WhatsAppLog.findOneAndUpdate(
            { _id: log._id },
            {
              $set: {
                status: "rate_limited",
                error: "Rate limited",
                "metadata.retryCount": retryCount,
                "metadata.retriedAt": new Date().toISOString(),
              },
            },
          );
          continue;
        }
        // Non-429 error (timeout, network, etc.) — mark failed but let next cycle retry
        await WhatsAppLog.findOneAndUpdate(
          { _id: log._id },
          {
            $set: {
              status: "failed",
              error: err.message,
              "metadata.retryCount": retryCount,
              "metadata.retriedAt": new Date().toISOString(),
            },
          },
        );
      }

      await new Promise((r) => setTimeout(r, 3000));
    }
  } catch (err) {
    console.error("[whatsappRetryQueue] Processing error:", err.message);
  }
}

export async function enqueueRetry(logEntry) {
  try {
    await WhatsAppLog.create({
      ...logEntry,
      direction: logEntry.direction || "outbound",
      status: "failed",
      metadata: { ...logEntry.metadata, retryCount: 0, queuedAt: new Date().toISOString() },
    });
    scheduleNext();
  } catch (err) {
    console.error("[whatsappRetryQueue] Enqueue error:", err.message);
  }
}
