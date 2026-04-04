import { Queue } from "bullmq";
import IORedis from "ioredis";
import dotenv from "dotenv";
dotenv.config();

const isProduction = process.env.NODE_ENV === "production";

// Create Redis Connection for the Queue
const connection = new IORedis(
  process.env.REDIS_URL || "redis://127.0.0.1:6379",
  {
    maxRetriesPerRequest: null,
    lazyConnect: true,
    retryStrategy: (times) => {
      if (times > 3) return null; // Stop retrying
      return Math.min(times * 1000, 5000);
    },
  },
);

// Initialize the Queue
const emailQueue = new Queue("emailQueue", { connection });

// @desc    Add Email to BullMQ Queue (Non-Blocking)
const sendEmail = async (options) => {
  try {
    if (!isProduction) {
      // In dev, just log — don't wait for Redis
      emailQueue.add("sendEmailJob", options, {
        attempts: 1,
        removeOnComplete: true,
      }).catch(() => {}); // Silently fail if Redis is down
      return;
    }

    const job = await emailQueue.add("sendEmailJob", options, {
      attempts: 3,
      backoff: { type: "exponential", delay: 5000 },
      removeOnComplete: true,
    });
    console.log(`📥 [BullMQ] Email Job Added with ID: ${job.id}`);
  } catch (error) {
    if (isProduction) {
      console.error("❌ [BullMQ] Failed to add email job to queue:", error.message);
    }
  }
};

export default sendEmail;
