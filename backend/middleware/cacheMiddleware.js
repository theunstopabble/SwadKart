import { getCache, setCache, invalidateByTag } from "../utils/cache.js";

// In-process mutex for cache stampede protection
const locks = new Map();

/**
 * Generic response cache middleware with stampede protection
 * Usage: router.get("/", cacheResponse("restaurants:list", 300), handler)
 * @param {string} keyPrefix - cache key prefix
 * @param {number} ttlSeconds - time to live in seconds
 */
export const cacheResponse = (keyPrefix, ttlSeconds = 300) => {
  return async (req, res, next) => {
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
      // Cache error, proceed to DB
    }

    // Stampede protection: if another request is already fetching this key, wait for it
    if (locks.has(cacheKey)) {
      try {
        const result = await locks.get(cacheKey);
        if (result) {
          return res.json(result);
        }
      } catch {
        // Previous fetch failed, proceed to re-fetch
      }
    }

    // Create a lock promise that resolves when the first request completes
    let resolveLock;
    const lockPromise = new Promise((resolve) => {
      resolveLock = resolve;
    });
    locks.set(cacheKey, lockPromise);

    const originalJson = res.json.bind(res);
    res.json = (body) => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        setCache(cacheKey, body, ttlSeconds, keyPrefix).catch(() => {});
        resolveLock(body);
      } else {
        resolveLock(null); // don't cache error responses
      }
      locks.delete(cacheKey);
      return originalJson(body);
    };

    next();
  };
};

/**
 * Invalidate all cache keys with the given tag prefix.
 * Use in POST/PUT/DELETE controllers after successful writes.
 */
export const invalidateCache = async (keyPrefix) => {
  try {
    await invalidateByTag(keyPrefix);
  } catch {
    // Silent fail — best-effort cache invalidation
  }
};
