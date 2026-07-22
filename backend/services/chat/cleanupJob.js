import Conversation from "../../models/conversationModel.js";
import Order from "../../models/orderModel.js";
import GroupOrder from "../../models/groupOrderModel.js";
import Product from "../../models/productModel.js";

// =================================================
// 🧹 CLEANUP JOB — 90-day conversation TTL sweep
// Requirement 7.7: Deletes Conversation documents
// whose updatedAt is more than 90 days in the past.
// Runs at most once per 24 hours.
// =================================================

const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000;
const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

let lastRunAt = null;
let intervalId = null;

/**
 * Runs the cleanup sweep — deletes all Conversation documents
 * whose updatedAt is older than 90 days from now.
 *
 * Includes a guard so it won't execute more than once per 24 hours,
 * even if called manually.
 *
 * @returns {Promise<{ skipped: boolean, deletedCount?: number }>}
 */
/**
 * Cleans up expired unpaid orders and group orders.
 * - Orders: status "pending", older than 60 min → cancel + restore stock
 * - Group orders: expiresAt < now → mark as expired
 */
async function cleanupExpiredOrders() {
  const cutoff = new Date(Date.now() - 60 * 60 * 1000);

  // Cancel expired unpaid orders & restore stock
  const expiredOrders = await Order.find({
    status: "pending",
    createdAt: { $lt: cutoff },
  }).lean();

  for (const order of expiredOrders) {
    if (order.items && order.items.length > 0) {
      for (const item of order.items) {
        if (item.product) {
          await Product.findByIdAndUpdate(item.product, {
            $inc: { countInStock: item.quantity || 1 },
          });
        }
      }
    }
  }

  const orderResult = await Order.updateMany(
    { status: "pending", createdAt: { $lt: cutoff } },
    { $set: { status: "cancelled", cancelledAt: new Date() } }
  );

  // Expire stale group orders
  const groupResult = await GroupOrder.updateMany(
    { expiresAt: { $lt: new Date() }, status: "active" },
    { $set: { status: "expired" } }
  );

  const orderCount = orderResult.modifiedCount || 0;
  const groupCount = groupResult.modifiedCount || 0;

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
      Conversation.deleteMany({ updatedAt: { $lt: cutoffDate } }),
      cleanupExpiredOrders(),
    ]);

    const deletedCount =
      conversationResult.status === "fulfilled"
        ? conversationResult.value.deletedCount || 0
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
 *
 * @returns {void}
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
