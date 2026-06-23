/**
 * Groq Client — Singleton SDK Initialization
 *
 * Reuses the same initialization pattern from chatController.js
 * but exports a single shared instance for all chat services.
 *
 * Requirements: 15.1 (Free-tier Groq usage)
 */

import Groq from "groq-sdk";
import dotenv from "dotenv";

dotenv.config();

if (!process.env.GROQ_API_KEY) throw new Error("GROQ_API_KEY not set");

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

export default groq;
