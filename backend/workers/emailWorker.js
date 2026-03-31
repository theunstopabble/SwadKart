import { Worker } from "bullmq";
import axios from "axios";
import IORedis from "ioredis";
import dotenv from "dotenv";
dotenv.config();

// BullMQ strictly requires an ioredis connection
const connection = new IORedis(
  process.env.REDIS_URL || "redis://127.0.0.1:6379",
  {
    maxRetriesPerRequest: null,
  },
);

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

export default emailWorker;
