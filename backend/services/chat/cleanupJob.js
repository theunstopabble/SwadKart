import prisma from "../../config/prisma.js";

// =================================================
// 🧹 CLEANUP JOB — 90-day conversation TTL sweep
// Deletes Conversation documents whose updatedAt is more than 90 days in the past.
// Runs at most once per 24 hours.
// =================================================

const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000;
const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

let lastRunAt = null;
let intervalId = null;

/**
 * Cleans up expired unpaid orders and group orders.
 * - Orders: status "Placed", older than 60 min → cancel + restore stock
 * - Group orders: expiresAt < now → mark as cancelled
 */
async function cleanupExpiredOrders() {
  const cutoff = new Date(Date.now() - 60 * 60 * 1000);

  // Cancel expired unpaid orders & restore stock
  const expiredOrders = await prisma.order.findMany({
    where: {
      orderStatus: "Placed",
      isPaid: false,
      createdAt: { lt: cutoff },
    },
    select: { id: true, orderItems: true },
  });

  for (const order of expiredOrders) {
    const items = Array.isArray(order.orderItems) ? order.orderItems : [];
    for (const item of items) {
      const prodId = (item.product || item._id || item.id)?.toString();
      if (prodId) {
        try {
          await prisma.product.update({
            where: { id: prodId },
            data: {
              countInStock: { increment: Number(item.qty || 1) },
            },
          });
        } catch {
          // Ignore if product was deleted
        }
      }
    }
  }

  const orderResult = await prisma.order.updateMany({
    where: {
      orderStatus: "Placed",
      isPaid: false,
      createdAt: { lt: cutoff },
    },
    data: {
      orderStatus: "Cancelled",
      cancelledAt: new Date(),
      cancellationReason: "Expired unpaid order auto-cancelled",
    },
  });

  // Expire stale group orders
  const groupResult = await prisma.groupOrder.updateMany({
    where: {
      expiresAt: { lt: new Date() },
      status: "open",
    },
    data: { status: "cancelled" },
  });

  const orderCount = orderResult.count || 0;
  const groupCount = groupResult.count || 0;

  if (orderCount || groupCount) {
    console.log(
      `[CleanupJob] Expired: ${orderCount} order(s), ${groupCount} group order(s).`
    );
  }

  return { orderCount, groupCount };
}

export async function runCleanup() {
  try {
    const now = Date.now();

    // Guard: skip if last run was less than 24 hours ago
    if (lastRunAt && now - lastRunAt < TWENTY_FOUR_HOURS_MS) {
      return { skipped: true };
    }

    const cutoffDate = new Date(now - NINETY_DAYS_MS);

    const [conversationResult, expiredResult] = await Promise.allSettled([
      prisma.conversation.deleteMany({ where: { updatedAt: { lt: cutoffDate } } }),
      cleanupExpiredOrders(),
    ]);

    const deletedCount =
      conversationResult.status === "fulfilled"
        ? conversationResult.value.count || 0
        : 0;

    if (conversationResult.status === "rejected") {
      console.error(
        "[CleanupJob] Conversation cleanup error:",
        conversationResult.reason.message
      );
    }

    if (expiredResult.status === "rejected") {
      console.error(
        "[CleanupJob] Expired order cleanup error:",
        expiredResult.reason.message
      );
    }

    lastRunAt = now;

    console.log(
      `[CleanupJob] Deleted ${deletedCount} conversation(s) older than 90 days.`
    );

    return { skipped: false, deletedCount };
  } catch (error) {
    console.error("[CleanupJob] Error during cleanup:", error.message);
    return { skipped: false, deletedCount: 0 };
  }
}

/**
 * Schedules the cleanup job to run every 24 hours.
 * Safe to call multiple times — only one interval will be active.
 */
export async function scheduleCleanup() {
  if (intervalId) return;

  intervalId = setInterval(runCleanup, TWENTY_FOUR_HOURS_MS);

  // Run immediately on first schedule
  await runCleanup();

  console.log("[CleanupJob] Scheduled to run every 24 hours.");
}

// Exported for testing purposes
export function _resetForTesting() {
  lastRunAt = null;
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
}

export function _getLastRunAt() {
  return lastRunAt;
}

export function _setLastRunAt(timestamp) {
  lastRunAt = timestamp;
}
