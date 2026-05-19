/**
 * Groq Queue — Free-Tier Budget Manager
 *
 * Caps Groq calls at 27 per calendar minute (3-call safety margin under
 * the 30-rpm Groq free-tier limit). Excess calls go into a Redis-backed
 * FIFO queue with cap 100; queued calls have a 10-second deadline.
 *
 * Requirements: 15.1, 15.6, 15.7, 15.8
 *
 * Redis Key Schema:
 *   chat:groq:rpm:<YYYYMMDDHHmm>  — per-minute counter (TTL 90s)
 *   chat:groq:queue                — LIST of serialized queued items
 */

import cacheClient from "../../config/redis.js";

const RPM_CAP = 27;
const QUEUE_CAP = 100;
const DEADLINE_MS = 10_000;
const COUNTER_TTL_SECONDS = 90;

/**
 * Get the current minute key in format YYYYMMDDHHmm
 * @returns {string}
 */
function getMinuteKey() {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  const day = String(now.getUTCDate()).padStart(2, "0");
  const hour = String(now.getUTCHours()).padStart(2, "0");
  const min = String(now.getUTCMinutes()).padStart(2, "0");
  return `${year}${month}${day}${hour}${min}`;
}

/**
 * Get the Redis key for the current minute's RPM counter.
 * @returns {string}
 */
function getRpmRedisKey() {
  return `chat:groq:rpm:${getMinuteKey()}`;
}

const QUEUE_KEY = "chat:groq:queue";

/**
 * In-memory fallback state for when Redis is unavailable.
 * Tracks per-minute counts and a simple FIFO queue.
 */
const inMemoryState = {
  currentMinute: "",
  count: 0,
  queue: [], // Array of { resolve, reject, fn, enqueueTs }
};

/**
 * Reset in-memory counter if the minute has changed.
 */
function refreshInMemoryMinute() {
  const minute = getMinuteKey();
  if (inMemoryState.currentMinute !== minute) {
    inMemoryState.currentMinute = minute;
    inMemoryState.count = 0;
  }
}

/**
 * Try to increment the RPM counter in Redis.
 * Returns the new count, or null if Redis is unavailable.
 */
async function tryIncrementRedis() {
  try {
    const key = getRpmRedisKey();
    // Use a simple get/set pattern compatible with the existing redis client proxy
    const current = await cacheClient.get(key);
    const count = current ? parseInt(current, 10) + 1 : 1;
    await cacheClient.setEx(key, COUNTER_TTL_SECONDS, String(count));
    return count;
  } catch {
    return null;
  }
}

/**
 * Get the current RPM count from Redis.
 * Returns the count, or null if Redis is unavailable.
 */
async function getCurrentRpmCount() {
  try {
    const key = getRpmRedisKey();
    const current = await cacheClient.get(key);
    return current ? parseInt(current, 10) : 0;
  } catch {
    return null;
  }
}

/**
 * Enqueue an item into the Redis-backed FIFO queue.
 * Returns true if enqueued, false if queue is full.
 */
async function enqueueRedis(item) {
  try {
    // Check queue length — use a stored counter since the basic redis client
    // may not support LLEN directly. We store serialized items as a JSON list value.
    const raw = await cacheClient.get(QUEUE_KEY);
    const queue = raw ? JSON.parse(raw) : [];
    if (queue.length >= QUEUE_CAP) {
      return false;
    }
    queue.push(item);
    // No TTL on the queue key itself; items self-expire via deadline
    await cacheClient.setEx(QUEUE_KEY, 120, JSON.stringify(queue));
    return true;
  } catch {
    return false;
  }
}

/**
 * Dequeue the oldest item from the Redis-backed FIFO queue.
 * Returns the item or null if empty/unavailable.
 */
async function dequeueRedis() {
  try {
    const raw = await cacheClient.get(QUEUE_KEY);
    if (!raw) return null;
    const queue = JSON.parse(raw);
    if (queue.length === 0) return null;
    const item = queue.shift();
    if (queue.length > 0) {
      await cacheClient.setEx(QUEUE_KEY, 120, JSON.stringify(queue));
    } else {
      await cacheClient.del(QUEUE_KEY);
    }
    return item;
  } catch {
    return null;
  }
}

/**
 * Process queued items when budget becomes available.
 * Called after each successful execution to drain the queue.
 */
async function drainQueue() {
  const rpmCount = await getCurrentRpmCount();
  if (rpmCount === null) {
    // Redis unavailable — drain in-memory queue
    drainInMemoryQueue();
    return;
  }

  let available = RPM_CAP - rpmCount;
  while (available > 0) {
    const item = await dequeueRedis();
    if (!item) break;

    // Check deadline
    const elapsed = Date.now() - item.enqueueTs;
    if (elapsed >= DEADLINE_MS) {
      // Item expired — resolve with fallback indicator
      // The caller's promise was already set up; we need to handle this
      // via the pendingCallbacks map
      if (pendingCallbacks.has(item.id)) {
        const { resolve } = pendingCallbacks.get(item.id);
        pendingCallbacks.delete(item.id);
        resolve({ fallback: true, reason: "deadline_exceeded" });
      }
      continue;
    }

    // Execute the queued call
    if (pendingCallbacks.has(item.id)) {
      const { resolve, reject, fn } = pendingCallbacks.get(item.id);
      pendingCallbacks.delete(item.id);
      await tryIncrementRedis();
      available--;
      try {
        const result = await fn();
        resolve(result);
      } catch (err) {
        reject(err);
      }
    }

    available--;
  }
}

/**
 * Drain the in-memory queue when Redis is unavailable.
 */
function drainInMemoryQueue() {
  refreshInMemoryMinute();
  let available = RPM_CAP - inMemoryState.count;

  while (available > 0 && inMemoryState.queue.length > 0) {
    const item = inMemoryState.queue.shift();
    const elapsed = Date.now() - item.enqueueTs;

    if (elapsed >= DEADLINE_MS) {
      item.resolve({ fallback: true, reason: "deadline_exceeded" });
      continue;
    }

    inMemoryState.count++;
    available--;
    item
      .fn()
      .then(item.resolve)
      .catch(item.reject);
  }
}

/**
 * Map of pending callbacks for queued Redis items.
 * Key: unique item ID, Value: { resolve, reject, fn }
 */
const pendingCallbacks = new Map();
let callbackIdCounter = 0;

/**
 * Execute a Groq call through the rate-limited queue.
 *
 * @param {Function} fn - An async function that performs the Groq API call.
 *                        Should return the Groq response.
 * @returns {Promise<*>} The result of fn(), or { fallback: true } if deadline exceeded.
 * @throws If the queue is full (cap 100) and cannot accept the call.
 */
export async function callGroq(fn) {
  // Try Redis-based counter first
  const rpmCount = await getCurrentRpmCount();

  if (rpmCount !== null) {
    // Redis is available
    if (rpmCount < RPM_CAP) {
      // Under budget — execute immediately
      await tryIncrementRedis();
      const result = await fn();
      // Try to drain queue after successful execution
      drainQueue().catch(() => {});
      return result;
    }

    // Over budget — enqueue
    const id = `q_${++callbackIdCounter}_${Date.now()}`;
    const item = { id, enqueueTs: Date.now() };

    return new Promise((resolve, reject) => {
      pendingCallbacks.set(id, { resolve, reject, fn });

      enqueueRedis(item).then((enqueued) => {
        if (!enqueued) {
          pendingCallbacks.delete(id);
          reject(new Error("groq_queue_full"));
        }
      });

      // Set a deadline timeout
      setTimeout(() => {
        if (pendingCallbacks.has(id)) {
          pendingCallbacks.delete(id);
          resolve({ fallback: true, reason: "deadline_exceeded" });
        }
      }, DEADLINE_MS);
    });
  }

  // Redis unavailable — use in-memory fallback
  refreshInMemoryMinute();

  if (inMemoryState.count < RPM_CAP) {
    // Under budget — execute immediately
    inMemoryState.count++;
    const result = await fn();
    // Drain in-memory queue
    drainInMemoryQueue();
    return result;
  }

  // Over budget — enqueue in memory
  if (inMemoryState.queue.length >= QUEUE_CAP) {
    throw new Error("groq_queue_full");
  }

  return new Promise((resolve, reject) => {
    const item = { resolve, reject, fn, enqueueTs: Date.now() };
    inMemoryState.queue.push(item);

    // Set a deadline timeout
    setTimeout(() => {
      const idx = inMemoryState.queue.indexOf(item);
      if (idx !== -1) {
        inMemoryState.queue.splice(idx, 1);
        resolve({ fallback: true, reason: "deadline_exceeded" });
      }
    }, DEADLINE_MS);
  });
}

// Export constants for testing
export const _internals = {
  RPM_CAP,
  QUEUE_CAP,
  DEADLINE_MS,
  getMinuteKey,
  getRpmRedisKey,
  QUEUE_KEY,
  // For testing: reset in-memory state
  resetState() {
    inMemoryState.currentMinute = "";
    inMemoryState.count = 0;
    inMemoryState.queue = [];
    pendingCallbacks.clear();
    callbackIdCounter = 0;
  },
};
