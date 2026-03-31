import { Queue } from "bullmq";
import IORedis from "ioredis";
import dotenv from "dotenv";
dotenv.config();

// Create Redis Connection for the Queue
const connection = new IORedis(
  process.env.REDIS_URL || "redis://127.0.0.1:6379",
  {
    maxRetriesPerRequest: null,
  },
);

// Initialize the Queue
const emailQueue = new Queue("emailQueue", { connection });

// @desc    Add Email to BullMQ Queue (Non-Blocking)
const sendEmail = async (options) => {
  try {
    // Adds job to the queue, it returns immediately without waiting for actual email dispatch
    const job = await emailQueue.add("sendEmailJob", options, {
      attempts: 3, // Agar fail ho jaye toh 3 baar retry karega
      backoff: {
        type: "exponential",
        delay: 5000, // Fail hone par 5 sec wait karke wapas try karega
      },
      removeOnComplete: true, // Queue complete hone par task delete kar dega memory bachane ke liye
    });

    console.log(`📥 [BullMQ] Email Job Added with ID: ${job.id}`);
  } catch (error) {
    console.error(
      "❌ [BullMQ] Failed to add email job to queue:",
      error.message,
    );
  }
};

export default sendEmail;
