import Conversation from "../../models/conversationModel.js";

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
export async function runCleanup() {
  try {
    const now = Date.now();

    // Guard: skip if last run was less than 24 hours ago
    if (lastRunAt && now - lastRunAt < TWENTY_FOUR_HOURS_MS) {
      return { skipped: true };
    }

    const cutoffDate = new Date(now - NINETY_DAYS_MS);

    const result = await Conversation.deleteMany({
      updatedAt: { $lt: cutoffDate },
    });

    const deletedCount = result.deletedCount || 0;
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

  // Run immediately on first schedule
  await runCleanup();

  intervalId = setInterval(runCleanup, TWENTY_FOUR_HOURS_MS);

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
