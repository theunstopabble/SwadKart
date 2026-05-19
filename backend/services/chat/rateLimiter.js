import cacheClient from "../../config/redis.js";

/**
 * Dual-tier rate limiter for the chatbot service.
 *
 * - IP tier: max 10 requests per 60-second fixed window
 * - User tier: max 50 requests per 3600-second fixed window (only when userId is present)
 *
 * Uses Redis (via the shared cacheClient) with a 200ms health probe.
 * Falls back to an in-memory Map when Redis is unavailable.
 *
 * Requirements: 10.1, 10.2, 10.3, 10.4, 10.5
 */

// --- Configuration ---
const IP_LIMIT = 10;
const IP_WINDOW_SECONDS = 60;

const USER_LIMIT = 50;
const USER_WINDOW_SECONDS = 3600;

const REDIS_HEALTH_TIMEOUT_MS = 200;

// --- In-memory fallback store ---
// Structure: Map<key, { count: number, expiresAt: number }>
const inMemoryStore = new Map();

/**
 * Increment a counter in the in-memory store with a fixed window.
 * Returns { count, ttlSeconds } where ttlSeconds is the remaining time in the window.
 */
function inMemoryIncrement(key, windowSeconds) {
  const now = Date.now();
  const entry = inMemoryStore.get(key);

  if (!entry || now >= entry.expiresAt) {
    // Start a new window
    const expiresAt = now + windowSeconds * 1000;
    inMemoryStore.set(key, { count: 1, expiresAt });
    return { count: 1, ttlSeconds: windowSeconds };
  }

  // Increment within existing window
  entry.count += 1;
  const ttlSeconds = Math.max(1, Math.ceil((entry.expiresAt - now) / 1000));
  return { count: entry.count, ttlSeconds };
}

/**
 * Check if Redis is healthy by issuing a PING with a 200ms timeout.
 * Also verifies that the client supports the commands we need (incr, expire, ttl).
 * Returns true if Redis responds in time and has full command support, false otherwise.
 */
async function isRedisHealthy() {
  try {
    // The cacheClient Proxy routes to in-memory when Redis isn't ready.
    // We need to verify that the actual Redis commands (incr, expire, ttl) are available.
    if (typeof cacheClient.incr !== "function") {
      return false;
    }

    const result = await Promise.race([
      cacheClient.ping(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Redis health probe timeout")), REDIS_HEALTH_TIMEOUT_MS)
      ),
    ]);

    // Additional check: ensure incr/expire/ttl are real Redis commands, not undefined
    // When the Proxy falls back to inMemoryClient, these won't exist as functions
    if (typeof cacheClient.expire !== "function" || typeof cacheClient.ttl !== "function") {
      return false;
    }

    return result === "PONG";
  } catch {
    return false;
  }
}

/**
 * Increment a rate-limit counter in Redis using INCR + EXPIRE NX pattern.
 * Returns { count, ttlSeconds }.
 */
async function redisIncrement(key, windowSeconds) {
  // INCR atomically increments (or creates with value 1)
  const count = await cacheClient.incr(key);

  if (count === 1) {
    // First request in this window — set expiry
    await cacheClient.expire(key, windowSeconds);
  }

  // Get remaining TTL
  const ttl = await cacheClient.ttl(key);
  // ttl can be -1 (no expiry set, race condition) or -2 (key gone)
  const ttlSeconds = ttl > 0 ? ttl : windowSeconds;

  return { count, ttlSeconds };
}

/**
 * Check rate limits for a chat request.
 *
 * @param {Object} params
 * @param {string} params.ip - Source IP address (required)
 * @param {string|null} params.userId - Authenticated user ID (optional)
 * @returns {Promise<{ ok: true } | { ok: false, retryAfterSeconds: number }>}
 */
export async function checkRateLimits({ ip, userId }) {
  const redisAvailable = await isRedisHealthy();

  // Choose increment strategy based on Redis availability
  const increment = redisAvailable
    ? redisIncrement
    : (key, windowSeconds) => Promise.resolve(inMemoryIncrement(key, windowSeconds));

  // --- IP-based limit ---
  const ipKey = `chat:rl:ip:${ip}`;
  let ipResult;
  try {
    ipResult = await increment(ipKey, IP_WINDOW_SECONDS);
  } catch {
    // Redis call failed mid-request — fall back to in-memory for this key
    ipResult = inMemoryIncrement(ipKey, IP_WINDOW_SECONDS);
  }

  if (ipResult.count > IP_LIMIT) {
    const retryAfterSeconds = Math.max(1, Math.min(IP_WINDOW_SECONDS, ipResult.ttlSeconds));
    return { ok: false, retryAfterSeconds };
  }

  // --- User-based limit (only if userId is present) ---
  if (userId) {
    const userKey = `chat:rl:user:${userId}`;
    let userResult;
    try {
      userResult = await increment(userKey, USER_WINDOW_SECONDS);
    } catch {
      // Redis call failed mid-request — fall back to in-memory for this key
      userResult = inMemoryIncrement(userKey, USER_WINDOW_SECONDS);
    }

    if (userResult.count > USER_LIMIT) {
      const retryAfterSeconds = Math.max(1, Math.min(USER_WINDOW_SECONDS, userResult.ttlSeconds));
      return { ok: false, retryAfterSeconds };
    }
  }

  return { ok: true };
}

// Export internals for testing
export const _internals = {
  inMemoryStore,
  inMemoryIncrement,
  isRedisHealthy,
  IP_LIMIT,
  IP_WINDOW_SECONDS,
  USER_LIMIT,
  USER_WINDOW_SECONDS,
  REDIS_HEALTH_TIMEOUT_MS,
};
