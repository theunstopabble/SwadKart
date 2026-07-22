/**
 * Sentiment Analyzer — Pure Helper + Async Analyzer
 *
 * clampSentiment(value): Pure function that clamps any input to [-1.0, 1.0]
 * or returns 0.0 for non-numeric / NaN / undefined inputs.
 *
 * analyzeSentiment(message, { groq }): Async function that calls Groq to
 * produce a sentiment score within 3 seconds, with fallback to 0.0.
 *
 * Requirements: 8.1, 8.2, 8.3
 */

import { callGroq } from "./groqQueue.js";

/**
 * Clamp a sentiment value to the closed interval [-1.0, 1.0].
 *
 * - If the input is not a number or is NaN, returns 0.0
 * - If the input is ±Infinity, clamps to -1.0 or 1.0
 * - Otherwise clamps to [-1.0, 1.0]
 *
 * @param {*} value - Raw sentiment value (may be any type)
 * @returns {number} A finite number in [-1.0, 1.0]
 */
export function clampSentiment(value) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return 0.0;
  }
  return Math.max(-1.0, Math.min(1.0, value));
}

/**
 * Analyze sentiment of a message using Groq LLM.
 *
 * Calls Groq with max_tokens=10 and a 3-second timeout.
 * Parses the response as a float, clamps to [-1.0, 1.0].
 * Returns 0.0 on any error (timeout, parse failure, API error).
 *
 * @param {string} message - The user message to analyze
 * @param {{ groq: object }} deps - Dependencies (Groq client)
 * @returns {Promise<number>} Sentiment score in [-1.0, 1.0]
 */
export async function analyzeSentiment(message, { groq }) {
  try {
    let sentimentTimer;
    const sentimentTimeoutPromise = new Promise((_, reject) => {
      sentimentTimer = setTimeout(() => reject(new Error("Sentiment analysis timeout")), 3000);
    });
    const completion = await Promise.race([
      callGroq(() => groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages: [
          {
            role: "system",
            content:
              "You are a sentiment analyzer. Analyze the sentiment of the user message and respond with ONLY a single number between -1.0 and 1.0, where -1.0 is extremely negative, 0.0 is neutral, and 1.0 is extremely positive. Respond with ONLY the number, nothing else.",
          },
          {
            role: "user",
            content: message,
          },
        ],
        max_tokens: 10,
        temperature: 0,
      })),
      sentimentTimeoutPromise,
    ]).finally(() => clearTimeout(sentimentTimer));

    const rawOutput = completion?.choices?.[0]?.message?.content?.trim();
    const score = parseFloat(rawOutput);

    if (Number.isNaN(score) || !Number.isFinite(score)) {
      return 0.0;
    }

    return clampSentiment(score);
  } catch {
    // Groq call failed, timed out, or any other error — return neutral
    return 0.0;
  }
}
