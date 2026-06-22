import dotenv from "dotenv";
dotenv.config();

const isProduction = process.env.NODE_ENV === "production";

let emailQueue = null;
let queueConnection = null;

/**
 * Lazily create and cache a BullMQ email queue when a Redis URL is provided.
 * We reuse the same connection instead of creating one per email.
 */
const getEmailQueue = async () => {
  if (emailQueue) return emailQueue;
  if (!process.env.REDIS_URL) return null;

  const { Queue } = await import("bullmq");
  const IORedis = (await import("ioredis")).default;

  queueConnection = new IORedis(process.env.REDIS_URL, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    lazyConnect: true,
    retryStrategy: (times) => {
      if (times > 3) return null;
      return Math.min(times * 1000, 5000);
    },
  });

  emailQueue = new Queue("emailQueue", { connection: queueConnection });
  return emailQueue;
};

/**
 * Send an email.
 * - Production + Redis   -> enqueue to BullMQ (worker sends via Brevo/SMTP)
 * - No Redis / dev / fail -> send directly so emails are never silently dropped
 *
 * @param {Object} options
 * @param {string} options.email
 * @param {string} options.subject
 * @param {string} [options.message]
 * @param {string} [options.html]
 */
const sendEmail = async (options) => {
  try {
    const envLabel = isProduction ? "PROD" : "DEV";
    console.log(`📧 [${envLabel}] Queuing email to: ${options.email} | ${options.subject}`);

    // Prefer BullMQ in production when Redis is configured
    const queue = await getEmailQueue();
    if (queue) {
      const job = await queue.add("sendEmailJob", options, {
        attempts: 3,
        backoff: { type: "exponential", delay: 5000 },
        removeOnComplete: true,
      });
      console.log(`📥 [BullMQ] Email Job Added with ID: ${job.id}`);
      return job;
    }

    // Fallback: send directly (development or when Redis is not configured)
    const { default: sendEmailWithProvider } = await import("./emailProvider.js");
    return await sendEmailWithProvider(options);
  } catch (error) {
    console.error("❌ sendEmail failed:", error.message);

    // Last-resort fallback if the queue itself failed
    try {
      const { default: sendEmailWithProvider } = await import("./emailProvider.js");
      return await sendEmailWithProvider(options);
    } catch (directError) {
      console.error("❌ Direct email fallback also failed:", directError.message);
      // Non-blocking: rethrow only contains diagnostic info, caller decides handling
      throw directError;
    }
  }
};

export default sendEmail;
