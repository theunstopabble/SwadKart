import redisClient from '../config/redis.js';

// Retrieve data from cache based on key
export const getCache = async (key) => {
    try {
        const data = await redisClient.get(key);
        return data ? JSON.parse(data) : null;
    } catch (error) {
        console.error(`Redis Get Error for key ${key}:`, error);
        return null; // Return null if cache fails so DB can take over
    }
};

// Save data to cache with a Time-To-Live (TTL) in seconds
export const setCache = async (key, data, ttl = 3600) => {
    try {
        await redisClient.setEx(key, ttl, JSON.stringify(data));
    } catch (error) {
        console.error(`Redis Set Error for key ${key}:`, error);
    }
};

// Delete a specific key from cache
export const clearCache = async (key) => {
    try {
        await redisClient.del(key);
    } catch (error) {
        console.error(`Redis Del Error for key ${key}:`, error);
    }
};