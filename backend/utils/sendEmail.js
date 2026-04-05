import dotenv from "dotenv";
dotenv.config();

const isProduction = process.env.NODE_ENV === "production";

// @desc    Add Email to BullMQ Queue (Non-Blocking)
// If Redis is not available, skip queueing in dev
const sendEmail = async (options) => {
  try {
    if (!isProduction) {
      // In dev, just log — skip Redis entirely
      console.log(`📧 [DEV] Email would be sent to: ${options.email}`);
      return;
    }

    // Production: Use BullMQ
    const { Queue } = await import("bullmq");
    const IORedis = (await import("ioredis")).default;

    if (!process.env.REDIS_URL) {
      console.error("❌ REDIS_URL not set in production. Email queue disabled.");
      return;
    }

    const connection = new IORedis(process.env.REDIS_URL, {
      maxRetriesPerRequest: null,
      lazyConnect: true,
      retryStrategy: (times) => {
        if (times > 3) return null;
        return Math.min(times * 1000, 5000);
      },
    });

    const emailQueue = new Queue("emailQueue", { connection });
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
