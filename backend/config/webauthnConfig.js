import dotenv from "dotenv";
dotenv.config();

/**
 * 🔐 WEBAUTHN CONFIGURATION
 * Centralized config to handle domain logic for Localhost vs DevTunnels
 */

// 1. Get Origin from Environment Variable (Must be set in .env)
// Example: 'http://localhost:5173' or 'https://your-tunnel-url.devtunnels.ms'
const origin = process.env.FRONTEND_URL || "http://localhost:5173";

// 2. Derive RP ID (Relying Party ID) - This must be the HOSTNAME only (no http/https, no port)
// Example: 'localhost' or 'your-tunnel-url.devtunnels.ms'
const rpID = new URL(origin).hostname;

export const webAuthnConfig = {
  rpName: "SwadKart", // App Name visible in the fingerprint prompt
  rpID: rpID,
  origin: origin,
};

console.log("🔒 WebAuthn Config Loaded:", webAuthnConfig);
