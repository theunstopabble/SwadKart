import dotenv from "dotenv";

dotenv.config();

const isProduction = process.env.NODE_ENV === "production";
const isConfigured = !!(process.env.OPENWA_BASE_URL && process.env.OPENWA_API_KEY);

if (!isConfigured && isProduction) {
  throw new Error("Missing WhatsApp/OpenWA env vars: OPENWA_BASE_URL, OPENWA_API_KEY");
}

if (!isConfigured && !isProduction) {
  console.log("⚡ OpenWA not configured — WhatsApp features are disabled in dev");
}

if (isConfigured && !process.env.OPENWA_API_KEY.startsWith("owa_k1_")) {
  console.warn("⚠️  OPENWA_API_KEY does not match expected format (owa_k1_...). Generate one with: node backend/scripts/generate-openwa-key.js");
}

const config = {
  baseUrl: process.env.OPENWA_BASE_URL ? process.env.OPENWA_BASE_URL.replace(/\/+$/, "") : "",
  apiKey: process.env.OPENWA_API_KEY || "",
  webhookSecret: process.env.OPENWA_WEBHOOK_SECRET || "",
  requestTimeout: parseInt(process.env.OPENWA_TIMEOUT_MS || "15000", 10),
  maxRetries: parseInt(process.env.OPENWA_MAX_RETRIES || "2", 10),
  enabled: isConfigured,

  // CIDR whitelist for OpenWA (comma-separated)
  allowedIps: process.env.OPENWA_ALLOWED_IPS || "",

  // Default session ID for outgoing messages
  defaultSession: process.env.OPENWA_DEFAULT_SESSION || "default",

  // Session isolation: each WhatsApp number gets its own OpenWA session
  isolateSessions: process.env.OPENWA_ISOLATE_SESSIONS !== "false",

  // Rate limiting
  rateLimitMax: parseInt(process.env.OPENWA_RATE_LIMIT || "60", 10),
  rateLimitWindowMs: 60000,
};

function ensureEnabled() {
  if (!config.enabled) {
    throw new Error("OpenWA is not configured. Set OPENWA_BASE_URL and OPENWA_API_KEY env vars.");
  }
}

export default config;
export { ensureEnabled };
