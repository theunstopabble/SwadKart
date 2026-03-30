import { createClient } from "redis";
import dotenv from "dotenv";
dotenv.config();

// Create Redis client using the URL from .env
const redisClient = createClient({
  url: process.env.REDIS_URL,
});

// Event listeners for Redis
redisClient.on("error", (err) => console.error("Redis Client Error", err));
redisClient.on("connect", () => console.log("Redis connected successfully 🔥"));

// Connect to Redis server
const connectRedis = async () => {
  try {
    await redisClient.connect();
  } catch (error) {
    console.error("Failed to connect to Redis", error);
  }
};

connectRedis();

export default redisClient;
