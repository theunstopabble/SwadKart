/**
 * Token Budget — Pure Function
 *
 * Fits system prompt, conversation history, and new user message within
 * a 6000-token budget using tiktoken cl100k_base encoding.
 *
 * The cl100k_base tokenizer consistently over-counts vs. Llama, providing
 * a safety margin under the budget.
 */

import { encoding_for_model } from "tiktoken";

const MAX_TOKENS = 6000;

/**
 * Count tokens in a string using cl100k_base encoding.
 * Creates and frees the encoder on each call to avoid WASM memory leaks.
 * @param {string} text - The text to tokenize
 * @returns {number} Token count
 */
export function countTokens(text) {
  if (!text || typeof text !== "string") return 0;
  const encoder = encoding_for_model("gpt-4");
  const tokens = encoder.encode(text);
  const count = tokens.length;
  encoder.free();
  return count;
}

/**
 * Fit messages within the token budget.
 *
 * Strategy:
 * 1. Always include system prompt and new user message.
 * 2. If system + user alone exceed budget, return just those two (no truncation of user message).
 * 3. Otherwise, add history messages from newest to oldest until budget is reached,
 *    then reverse to chronological order.
 *
 * @param {{ systemPrompt: string, history: Array<{role: string, content: string}>, newUserMessage: string }} params
 * @returns {{ messages: Array<{role: string, content: string}>, dropped: number, totalTokens: number }}
 */
export function fitToBudget({ systemPrompt, history, newUserMessage }) {
  const systemMsg = { role: "system", content: systemPrompt || "" };
  const userMsg = { role: "user", content: newUserMessage || "" };

  const systemTokens = countTokens(systemPrompt || "");
  const userTokens = countTokens(newUserMessage || "");
  const baseTokens = systemTokens + userTokens;

  // If system + user alone exceed budget, return just those two
  if (baseTokens > MAX_TOKENS) {
    return {
      messages: [systemMsg, userMsg],
      dropped: (history || []).length,
      totalTokens: baseTokens,
    };
  }

  // No history to include
  if (!history || history.length === 0) {
    return {
      messages: [systemMsg, userMsg],
      dropped: 0,
      totalTokens: baseTokens,
    };
  }

  // Add history from newest to oldest until budget is reached
  let remainingBudget = MAX_TOKENS - baseTokens;
  const kept = [];
  let dropped = 0;

  // Iterate from newest (end) to oldest (start)
  for (let i = history.length - 1; i >= 0; i--) {
    const msg = history[i];
    const msgTokens = countTokens(msg.content || "");

    if (msgTokens <= remainingBudget) {
      kept.unshift(msg); // prepend to maintain chronological order
      remainingBudget -= msgTokens;
    } else {
      // This message and all older ones are dropped
      dropped = i + 1;
      break;
    }
  }

  // If we iterated through all history without breaking, dropped stays at 0
  if (kept.length + dropped < history.length) {
    // This means we didn't break — all messages fit or we need to recalculate dropped
    dropped = history.length - kept.length;
  }

  const totalTokens = MAX_TOKENS - remainingBudget;

  return {
    messages: [systemMsg, ...kept, userMsg],
    dropped,
    totalTokens,
  };
}
