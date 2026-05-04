import { getCache, setCache, clearCache } from "../utils/cache.js";

/**
 * Generic response cache middleware
 * Usage: router.get("/", cacheResponse("restaurants:list", 300), handler)
 * @param {string} keyPrefix - cache key prefix
 * @param {number} ttlSeconds - time to live in seconds
 */
export const cacheResponse = (keyPrefix, ttlSeconds = 300) => {
  return async (req, res, next) => {
    // Build cache key from prefix + query params hash
    const queryKey = Object.keys(req.query).length > 0
      ? ":" + Buffer.from(JSON.stringify(req.query)).toString("base64url").slice(0, 32)
      : "";
    const cacheKey = `${keyPrefix}${queryKey}`;

    try {
      const cached = await getCache(cacheKey);
      if (cached) {
        return res.json(cached);
      }
    } catch {
      // Cache miss or error, proceed to DB
    }

    // Override res.json to intercept and cache the response
    const originalJson = res.json.bind(res);
    res.json = (body) => {
      // Only cache successful responses
      if (res.statusCode >= 200 && res.statusCode < 300) {
        setCache(cacheKey, body, ttlSeconds).catch(() => {});
      }
      return originalJson(body);
    };

    next();
  };
};

/**
 * Invalidate cache keys by prefix pattern
 * Use in POST/PUT/DELETE controllers after successful writes
 */
export const invalidateCache = async (keyPrefix) => {
  // Redis ke paas pattern delete nahi hota basic client mein
  // Isliye explicit key delete karna hoga
  // Production mein Redis SCAN use karo, yahan simple key list maintain karte hain
  try {
    await clearCache(keyPrefix);
  } catch {
    // Silent fail — cache stale hoga but system chalega
  }
};
