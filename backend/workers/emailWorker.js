import dotenv from "dotenv";
dotenv.config();

const isProduction = process.env.NODE_ENV === "production";

// Only start the worker in production with Redis
if (isProduction && process.env.REDIS_URL) {
  const { Worker } = await import("bullmq");
  const IORedis = (await import("ioredis")).default;
  const axios = (await import("axios")).default;

  const connection = new IORedis(process.env.REDIS_URL, {
    maxRetriesPerRequest: null,
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
      const senderEmail = process.env.SMTP_MAIL;
      const apiKey = process.env.BREVO_API_KEY;

      if (!senderEmail || !apiKey) {
        throw new Error("Missing 'SMTP_MAIL' or 'BREVO_API_KEY' in .env file.");
      }

      const url = "https://api.brevo.com/v3/smtp/email";

      const htmlContent = options.html
        ? options.html
        : `<html><body style="font-family: Arial, sans-serif; line-height: 1.6;">
            <p>${
              options.message
                ? options.message.replace(/\n/g, "<br>")
                : "No message content."
            }</p>
          </body></html>`;

      const data = {
        sender: {
          name: "SwadKart Support",
          email: senderEmail,
        },
        to: [
          {
            email: options.email,
            name: options.email ? options.email.split("@")[0] : "User",
          },
        ],
        subject: options.subject || "SwadKart Notification",
        htmlContent: htmlContent,
      };

      const response = await axios.post(url, data, {
        headers: {
          accept: "application/json",
          "api-key": apiKey,
          "content-type": "application/json",
        },
      });

      return response.data;
    },
    { connection },
  );

  emailWorker.on("completed", (job) => {
    console.log(`✅ [BullMQ] Email sent successfully to: ${job.data.email}`);
  });

  emailWorker.on("failed", (job, err) => {
    console.error(
      `❌ [BullMQ] Email job failed for ${job.data.email}: ${err.message}`,
    );
  });
}

export default isProduction ? null : { on: () => {} };
