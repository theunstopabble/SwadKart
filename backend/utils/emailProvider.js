import dotenv from "dotenv";
dotenv.config();

import axios from "axios";
import nodemailer from "nodemailer";

/**
 * Resolve the sender (from-address) for outgoing email.
 * Prefer a verified custom-domain sender (SMTP_FROM_EMAIL) so you can
 * migrate off a Gmail sender without code changes. Falls back to SMTP_MAIL.
 *
 * @returns {{ email: string, name: string }}
 */
export const getSender = () => {
  const email = process.env.SMTP_FROM_EMAIL || process.env.SMTP_MAIL;
  const name = process.env.SMTP_FROM_NAME || "SwadKart Support";
  return { email, name };
};

// Free email providers force the from-address to equal the authenticated
// account, so we must not try to spoof a custom-domain sender through them.
const FREE_PROVIDER_HINTS = [
  "gmail",
  "googlemail",
  "yahoo",
  "outlook",
  "hotmail",
  "live",
  "aol",
];

const isFreeEmailProvider = (host) => {
  if (!host) return false;
  const h = host.toLowerCase();
  return FREE_PROVIDER_HINTS.some((p) => h.includes(p));
};

/**
 * Send one transactional email using Brevo REST API or SMTP fallback.
 * This module is used both by the BullMQ worker and by the direct-send
 * fallback in development / when Redis is unavailable.
 *
 * @param {Object} options
 * @param {string} options.email       Recipient address
 * @param {string} options.subject     Email subject
 * @param {string} [options.message]   Plain-text message (fallback if html missing)
 * @param {string} [options.html]      HTML content
 * @param {string} [options.name]      Recipient display name
 */
const sendEmailWithProvider = async (options) => {
  if (!options || !options.email) {
    throw new Error("Recipient email is required.");
  }

  const sender = getSender();
  if (!sender.email) {
    throw new Error(
      "Missing sender address. Set SMTP_FROM_EMAIL or SMTP_MAIL.",
    );
  }

  const htmlContent = options.html
    ? options.html
    : `<html><body style="font-family: Arial, sans-serif; line-height: 1.6;">
        <p>${
          options.message
            ? options.message.replace(/\n/g, "<br>")
            : "No message content."
        }</p>
      </body></html>`;

  // ------------------------------------------------------------------
  // 1. Try Brevo (Sendinblue) REST API first
  // ------------------------------------------------------------------
  if (process.env.BREVO_API_KEY) {
    try {
      const url = "https://api.brevo.com/v3/smtp/email";
      const data = {
        sender: {
          name: sender.name,
          email: sender.email,
        },
        to: [
          {
            email: options.email,
            name: options.name || options.email.split("@")[0] || "User",
          },
        ],
        subject: options.subject || "SwadKart Notification",
        htmlContent,
      };

      const response = await axios.post(url, data, {
        headers: {
          accept: "application/json",
          "api-key": process.env.BREVO_API_KEY,
          "content-type": "application/json",
        },
        timeout: 15000,
      });

      console.log(`✅ [Brevo] Email sent to: ${options.email}`);
      return response.data;
    } catch (brevoErr) {
      const message = brevoErr?.response?.data?.message || brevoErr.message;
      console.error(`❌ [Brevo] Failed to send to ${options.email}:`, message);

      // If no SMTP fallback is configured, rethrow the Brevo error
      if (!process.env.SMTP_HOST || !process.env.SMTP_PASSWORD) {
        throw brevoErr;
      }

      console.log(`🔄 [Email] Falling back to SMTP for ${options.email}`);
    }
  }

  // ------------------------------------------------------------------
  // 2. SMTP fallback (useful when Brevo is down / not configured)
  // ------------------------------------------------------------------
  if (process.env.SMTP_HOST && process.env.SMTP_PASSWORD) {
    const port = Number(process.env.SMTP_PORT) || 587;
    const authUser = process.env.SMTP_MAIL;

    if (!authUser) {
      throw new Error(
        "SMTP_HOST & SMTP_PASSWORD are set but SMTP_MAIL (auth user) is missing.",
      );
    }

    // Free providers (Gmail, Yahoo, Outlook) force from = auth account.
    // Custom-domain relays (Brevo SMTP, SES, SendGrid) allow the configured sender.
    const fromEmail = isFreeEmailProvider(process.env.SMTP_HOST)
      ? authUser
      : sender.email;

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure: port === 465,
      auth: {
        user: authUser,
        pass: process.env.SMTP_PASSWORD,
      },
      tls: {
        rejectUnauthorized: process.env.NODE_ENV === "production",
      },
    });

    const info = await transporter.sendMail({
      from: `"${sender.name}" <${fromEmail}>`,
      to: options.email,
      subject: options.subject || "SwadKart Notification",
      html: htmlContent,
    });

    console.log(`✅ [SMTP] Email sent to: ${options.email} | ${info.messageId}`);
    return info;
  }

  throw new Error(
    "No email provider configured. Set BREVO_API_KEY or SMTP_HOST + SMTP_PASSWORD + SMTP_MAIL.",
  );
};

export default sendEmailWithProvider;
