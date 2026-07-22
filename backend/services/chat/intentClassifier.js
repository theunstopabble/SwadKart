/**
 * Intent Classifier — Cache-first LLM Classification
 *
 * Classifies user messages into one of the predefined intent labels.
 * Uses SHA-256 hashing for cache keys and Redis for caching results.
 * Falls back to "unknown" on any failure or timeout.
 *
 * Requirements: 3.1, 3.2, 3.3, 3.5, 15.3
 */

import crypto from "crypto";
import { callGroq } from "./groqQueue.js";

/**
 * The fixed set of valid intent labels.
 */
export const INTENT_SET = [
  "order_inquiry",
  "recommendation",
  "complaint",
  "navigation_help",
  "order_placement",
  "general_chat",
  "greeting",
  "farewell",
  "unknown",
];

/**
 * Compute SHA-256 hash of the normalized (trimmed + lowercased) message.
 *
 * @param {string} message - Raw user message
 * @returns {string} Hex-encoded SHA-256 hash
 */
export function computeCacheKey(message) {
  const normalized = message.trim().toLowerCase();
  return crypto.createHash("sha256").update(normalized).digest("hex");
}

/**
 * Classify the intent of a user message.
 *
 * 1. Compute SHA-256 of message.trim().toLowerCase()
 * 2. Redis GET intent:<hash> with 200ms timeout; on hit, return cached label
 * 3. Otherwise Groq call: max_tokens=10, timeout=2000ms
 * 4. Trim + lowercase output; if not in INTENT_SET → "unknown"
 * 5. Cache result for 3600s (best-effort, swallow Redis errors)
 *
 * @param {string} message - The user message to classify
 * @param {{ redis: object, groq: object }} deps - Dependencies
 * @returns {Promise<string>} A label from INTENT_SET
 */
export async function classifyIntent(message, { redis, groq }) {
  const hash = computeCacheKey(message);
  const cacheKey = `chat:intent:${hash}`;

  // Step 1: Try Redis cache with 200ms timeout
  try {
    const cached = await Promise.race([
      redis.get(cacheKey),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Redis timeout")), 200)
      ),
    ]);

    if (cached && INTENT_SET.includes(cached)) {
      return cached;
    }
  } catch {
    // Redis unavailable or timed out — proceed to Groq
  }

  // Step 2: Call Groq with max_tokens=10 and 2s timeout
  let rawLabel = "unknown";
  try {
    const completion = await Promise.race([
      callGroq(() => groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages: [
          {
            role: "system",
            content: `You are an intent classifier. Classify the user message into exactly one of these intents: ${INTENT_SET.join(", ")}. Respond with ONLY the intent label, nothing else.`,
          },
          {
            role: "user",
            content: message,
          },
        ],
        max_tokens: 10,
        temperature: 0,
      })),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Groq timeout")), 2000)
      ),
    ]);

    rawLabel =
      completion?.choices?.[0]?.message?.content?.trim().toLowerCase() ||
      "unknown";
  } catch {
    // Groq call failed or timed out — default to "unknown"
    rawLabel = "unknown";
  }

  // Step 3: Normalize and validate against INTENT_SET
  const intent = INTENT_SET.includes(rawLabel) ? rawLabel : "unknown";

  // Step 4: Cache for 3600s (best-effort, swallow errors)
  redis.setEx(cacheKey, 3600, intent).catch(() => {});

  return intent;
}
