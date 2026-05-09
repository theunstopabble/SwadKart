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
        if (retries > 3) return false;
        return Math.min(retries * 1000, 5000);
      },
      connectTimeout: 5000,
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
      if (!isProduction && (!target.isReady || !target.isOpen)) {
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
