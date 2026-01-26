import dotenv from "dotenv";
dotenv.config();

/**
 * 🔐 WEBAUTHN CONFIGURATION
 * Centralized config to handle domain logic for Localhost vs DevTunnels
 */

// 1. Get Origin from Environment Variable (Must be set in .env)
// Example: 'http://localhost:5173' or 'https://your-tunnel-url.devtunnels.ms'
// 1. Get Origin from Environment Variable (Must be set in .env)
// Example: 'http://localhost:5173' or 'https://your-tunnel-url.devtunnels.ms'
const origin = process.env.FRONTEND_URL || "http://localhost:5173";

// 2. Derive RP ID (Relying Party ID)
// Priority: Env Var > Hostname of Origin > 'localhost'
let derivedRpID = "localhost";
try {
  derivedRpID = new URL(origin).hostname;
} catch (e) {
  console.warn("⚠️ Invalid FRONTEND_URL, defaulting RP ID to localhost");
}

const rpID = process.env.RP_ID || derivedRpID;
const rpName = process.env.RP_NAME || "SwadKart";

export const webAuthnConfig = {
  rpName: rpName,
  rpID: rpID,
  origin: origin,
};

console.log("🔒 WebAuthn Config Loaded:", webAuthnConfig);
