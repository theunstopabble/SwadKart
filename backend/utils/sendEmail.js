import dotenv from "dotenv";
dotenv.config();

const isProduction = process.env.NODE_ENV === "production";

/**
 * Send an email directly via emailProvider (Brevo / SMTP).
 * BullMQ / Redis intentionally not used here — Redis is reserved for
 * chat pipeline (rate-limiter, groq queue, intent cache) and general
 * data caching to stay within Upstash free tier (500k ops/month).
 *
 * @param {Object} options
 * @param {string} options.email
 * @param {string} options.subject
 * @param {string} [options.message]
 * @param {string} [options.html]
 */
const sendEmail = async (options) => {
  const envLabel = isProduction ? "PROD" : "DEV";
  console.log(`📧 [${envLabel}] Sending email to: ${options.email} | ${options.subject}`);

  try {
    const { default: sendEmailWithProvider } = await import("./emailProvider.js");
    return await sendEmailWithProvider(options);
  } catch (error) {
    console.error("❌ sendEmail failed:", error.message);
    throw error;
  }
};

export default sendEmail;
