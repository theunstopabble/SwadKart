import { createClient } from "redis";
import dotenv from "dotenv";
dotenv.config();

const isProduction = process.env.NODE_ENV === "production";
const inMemoryCache = new Map();

// In-memory fallback for local dev
const inMemoryClient = {
  get: async (key) => {
    const entry = inMemoryCache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expire) {
      inMemoryCache.delete(key);
      return null;
    }
    return entry.value;
  },
  setEx: async (key, ttl, value) => {
    inMemoryCache.set(key, { value, expire: Date.now() + ttl * 1000 });
  },
  del: async (key) => {
    inMemoryCache.delete(key);
  },
  on: () => {},
  connect: async () => {},
};

// Create Redis client using the URL from .env
const redisClient = createClient({
  url: process.env.REDIS_URL,
  socket: {
    reconnectStrategy: (retries) => {
      if (retries > 3) return false; // Stop retrying after 3 attempts
      return Math.min(retries * 1000, 5000);
    },
    connectTimeout: 5000,
  },
});

// Event listeners for Redis
redisClient.on("error", (err) => {
  if (isProduction) {
    console.error("Redis Client Error", err);
  } else {
    // Silent fail in dev — in-memory cache handles it
  }
});
redisClient.on("connect", () => console.log("Redis connected successfully 🔥"));

// Connect to Redis server
const connectRedis = async () => {
  try {
    await redisClient.connect();
  } catch (error) {
    if (isProduction) {
      console.error("Failed to connect to Redis", error);
    } else {
      console.log("⚡ Redis unavailable — using in-memory cache for local dev");
    }
  }
};

connectRedis();

// Export a wrapper that falls back to in-memory if Redis is down
const cacheClient = new Proxy(redisClient, {
  get: (target, prop) => {
    if (!isProduction && !target.isOpen) {
      return inMemoryClient[prop];
    }
    return target[prop];
  },
});

export default cacheClient;
