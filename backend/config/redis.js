import { createClient } from "redis";
import dotenv from "dotenv";
dotenv.config();

const isProduction = process.env.NODE_ENV === "production";
const IN_MEMORY_MAX = 1000;
const inMemoryCache = new Map();

function evictLRU() {
  if (inMemoryCache.size < IN_MEMORY_MAX) return;
  const oldest = inMemoryCache.keys().next().value;
  if (oldest) inMemoryCache.delete(oldest);
}

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
    evictLRU();
    inMemoryCache.set(key, { value, expire: Date.now() + ttl * 1000 });
  },
  del: async (key) => {
    inMemoryCache.delete(key);
  },
  incr: async () => { throw new Error("in-memory does not support incr"); },
  expire: async () => {},
  sadd: async () => {},
  sAdd: async () => {},
  smembers: async () => [],
  sMembers: async () => [],
  on: () => {},
  connect: async () => {},
  ping: async () => "PONG",
  isReady: false,
  isOpen: false,
};

let cacheClient = inMemoryClient;

// Only connect to Redis if URL is provided
if (process.env.REDIS_URL) {
  const redisClient = createClient({
    url: process.env.REDIS_URL,
    socket: {
      reconnectStrategy: (retries) => {
        if (retries > 10) return false; // Give up after 10 retries
        return Math.min(retries * 2000, 30000); // Max 30s between retries
      },
      connectTimeout: 10000,
    },
  });

  redisClient.on("error", (err) => {
    if (isProduction) {
      console.error("Redis Client Error", err);
    }
  });
  redisClient.on("connect", () => console.log("Redis connected successfully 🔥"));

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

  cacheClient = new Proxy(redisClient, {
    get: (target, prop) => {
      // Fallback to in-memory if Redis is not ready (both dev AND production)
      if (!target.isReady || !target.isOpen) {
        return inMemoryClient[prop];
      }
      return target[prop];
    },
  });
} else {
  if (!isProduction) {
    console.log("⚡ No REDIS_URL — using in-memory cache for local dev");
  }
}

export default cacheClient;
