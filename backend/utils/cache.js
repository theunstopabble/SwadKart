import redisClient from '../config/redis.js';

const isProduction = process.env.NODE_ENV === "production";
const TAG_PREFIX = "cache:tag:";

// Retrieve data from cache based on key
export const getCache = async (key) => {
    if (!isProduction) return null;
    try {
        const data = await redisClient.get(key);
        if (data === null) {
            console.log(`[Cache] MISS ${key}`);
            return null;
        }
        return JSON.parse(data);
    } catch (error) {
        console.error("[Cache] ERROR %s:", key, error);
        return null;
    }
};

// Save data to cache and track key under a tag prefix for bulk invalidation
export const setCache = async (key, data, ttl = 3600, tagPrefix) => {
    if (!isProduction) return;
    try {
        await redisClient.setEx(key, ttl, JSON.stringify(data));
        if (tagPrefix) {
            const tagKey = TAG_PREFIX + tagPrefix;
            await redisClient.sAdd(tagKey, key);
            await redisClient.expire(tagKey, Math.max(ttl, 3600));
        }
    } catch (error) {
        console.error("Redis Set Error for key %s:", key, error);
    }
};

// Delete a specific key from cache
export const clearCache = async (key) => {
    if (!isProduction) return;
    try {
        await redisClient.del(key);
    } catch (error) {
        console.error("Redis Del Error for key %s:", key, error);
    }
};

// Invalidate all cache keys with a given tag prefix
export const invalidateByTag = async (tagPrefix) => {
    if (!isProduction) return;
    try {
        const tagKey = TAG_PREFIX + tagPrefix;
        // Get all keys tagged with this prefix
        const keys = await redisClient.sMembers(tagKey);
        if (keys && keys.length > 0) {
            await redisClient.del(...keys);
        }
        // Delete the tag set itself
        await redisClient.del(tagKey);
    } catch (error) {
        console.error("Cache invalidation error for tag %s:", tagPrefix, error);
    }
};
