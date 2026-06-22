import dotenv from "dotenv";
dotenv.config();

const isProduction = process.env.NODE_ENV === "production";

// Only start the BullMQ worker in production with a Redis URL.
// When Redis is absent, sendEmail.js falls back to direct delivery.
if (isProduction && process.env.REDIS_URL) {
  const { Worker } = await import("bullmq");
  const IORedis = (await import("ioredis")).default;

  const { default: sendEmailWithProvider } = await import(
    "../utils/emailProvider.js"
  );

  const connection = new IORedis(process.env.REDIS_URL, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    lazyConnect: true,
    retryStrategy: (times) => {
      if (times > 3) return null;
      return Math.min(times * 1000, 5000);
    },
  });

  const emailWorker = new Worker(
    "emailQueue",
    async (job) => {
      const options = job.data;
      return await sendEmailWithProvider(options);
    },
    { connection },
  );

  emailWorker.on("completed", (job) => {
    console.log(`✅ [BullMQ] Email sent successfully to: ${job.data.email}`);
  });

  emailWorker.on("failed", (job, err) => {
    console.error(
      `❌ [BullMQ] Email job failed for ${job?.data?.email}: ${err.message}`,
    );
  });

  emailWorker.on("error", (err) => {
    console.error("❌ [BullMQ Worker] Connection error:", err.message);
  });
}

export default isProduction ? null : { on: () => {} };
