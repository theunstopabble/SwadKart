import dotenv from "dotenv";
dotenv.config();

import axios from "axios";
import sendEmail from "../utils/sendEmail.js";
import getAdminEmail from "../utils/getAdminEmail.js";
import { getSender } from "../utils/emailProvider.js";

const FREE_DOMAINS = [
  "gmail.com",
  "googlemail.com",
  "yahoo.com",
  "outlook.com",
  "hotmail.com",
  "live.com",
  "aol.com",
];

const isFreeDomain = (email) => {
  if (!email || !email.includes("@")) return false;
  return FREE_DOMAINS.includes(email.split("@")[1].toLowerCase());
};

// @desc    Diagnose email delivery (admin only)
// @route   POST /api/v1/admin/test-email
// @access  Private/Admin
export const testEmailDelivery = async (req, res) => {
  const sender = getSender();

  const report = {
    timestamp: new Date().toISOString(),
    environment: {
      NODE_ENV: process.env.NODE_ENV || "(unset)",
      SMTP_MAIL: process.env.SMTP_MAIL ? "✅ set" : "❌ missing",
      BREVO_API_KEY: process.env.BREVO_API_KEY ? "✅ set" : "❌ missing",
      SMTP_HOST: process.env.SMTP_HOST ? "✅ set" : "❌ missing (no SMTP fallback)",
      SMTP_PASSWORD: process.env.SMTP_PASSWORD ? "✅ set" : "❌ missing (no SMTP fallback)",
      SMTP_FROM_EMAIL: process.env.SMTP_FROM_EMAIL
        ? "✅ set"
        : "⚠️ not set (falls back to SMTP_MAIL)",
      SMTP_FROM_NAME: process.env.SMTP_FROM_NAME || "⚠️ not set (defaults to SwadKart Support)",
      REDIS_URL: process.env.REDIS_URL ? "✅ set (BullMQ enabled)" : "⚠️ not set (direct send)",
    },
    resolvedSender: {
      email: sender.email || null,
      name: sender.name,
      isFreeDomain: isFreeDomain(sender.email),
      warning:
        isFreeDomain(sender.email) && process.env.BREVO_API_KEY
          ? "⚠️ Sender is a free-email domain (gmail/yahoo/outlook). Brevo usually blocks these for transactional mail — verify the sender in Brevo or use a custom domain via SMTP_FROM_EMAIL."
          : null,
    },
    brevoSenders: null,
    adminEmail: null,
    testSend: null,
  };

  // 1. Resolve admin email
  try {
    report.adminEmail = await getAdminEmail();
  } catch (err) {
    report.adminEmail = `Error: ${err.message}`;
  }

  // 2. Check Brevo verified senders (reveals if the sender address is approved)
  if (process.env.BREVO_API_KEY) {
    try {
      const resp = await axios.get("https://api.brevo.com/v3/senders", {
        headers: {
          accept: "application/json",
          "api-key": process.env.BREVO_API_KEY,
        },
        timeout: 10000,
      });
      report.brevoSenders = (resp.data?.senders || []).map((s) => ({
        email: s.email,
        name: s.name,
        active: s.active,
      }));
    } catch (err) {
      const msg = err?.response?.data?.message || err.message;
      report.brevoSenders = `Brevo API error: ${msg}`;
    }
  }

  // 3. Attempt a real test send to the admin address
  const target = report.adminEmail || process.env.SMTP_MAIL;
  if (target && typeof target === "string") {
    try {
      await sendEmail({
        email: target,
        subject: "🧪 SwadKart Email Diagnostic Test",
        html: `
          <div style="font-family: sans-serif; padding: 20px;">
            <h2 style="color: #ff4757;">Email Diagnostic ✅</h2>
            <p>This is a test email from the SwadKart diagnostic endpoint.</p>
            <p>If you received this, email delivery is working.</p>
            <p><strong>Sent at:</strong> ${report.timestamp}</p>
            <p><strong>Target:</strong> ${target}</p>
          </div>
        `,
      });
      report.testSend = `✅ Test email dispatched to ${target}`;
    } catch (err) {
      report.testSend = `❌ Test send failed: ${err.message}`;
    }
  } else {
    report.testSend = "❌ No admin email to send to";
  }

  return res.json(report);
};
