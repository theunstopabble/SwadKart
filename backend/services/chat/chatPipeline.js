/**
 * Chat Pipeline Orchestrator
 *
 * Single entrypoint shared by both the JSON endpoint (POST /api/v1/chat)
 * and the SSE endpoint (POST /api/v1/chat/stream). Coordinates:
 *   1. Load conversation history
 *   2. Detect language (synchronous, pure)
 *   3. Parallel: classify intent + analyze sentiment
 *   4. Retrieve products (for recommendation/order_inquiry/order_placement intents)
 *   5. Build prompt with token budget
 *   6. Build tools from registry (auth-conditional)
 *   7. Multi-tool loop: execute tool_calls, accumulate results, re-call LLM until final text
 *   8. Emit streaming events (token + done)
 *   9. Persist messages
 *  10. Escalation flag logic (3 consecutive sentiment < -0.4)
 *  11. Fallback on failure
 *
 * Requirements: 1.1, 1.2, 2.5, 3.1, 3.4, 6.3, 6.4, 6.5, 7.3, 7.4, 7.5, 7.6, 8.1, 8.5, 12.1, 12.2, 12.3, 12.5, 15.2
 */

import { detectLanguage } from "./languageDetector.js";
import { classifyIntent } from "./intentClassifier.js";
import { analyzeSentiment } from "./sentimentAnalyzer.js";
import { retrieveProducts } from "./retrievalService.js";
import { fitToBudget } from "./tokenBudget.js";
import { callGroq } from "./groqQueue.js";
import { buildToolRegistry, getToolExecutor } from "./tools/toolRegistry.js";
import * as conversationRepo from "./conversationRepo.js";
import { buildFallback } from "./fallbackResponder.js";
import { serializeEvent } from "./sseSerializer.js";
import groq from "./groqClient.js";
import cacheClient from "../../config/redis.js";
import Conversation from "../../models/conversationModel.js";

/** Total pipeline timeout in milliseconds */
const PIPELINE_TIMEOUT_MS = 15_000;

/** Max length for product names and descriptions in system prompt */
const MAX_PRODUCT_NAME_LENGTH = 100;
const MAX_DESCRIPTION_LENGTH = 200;

/**
 * Sanitize a string for safe inclusion in the system prompt.
 * Strips control characters and truncates to a reasonable length.
 * @param {string} str - Input string
 * @param {number} maxLen - Maximum allowed length
 * @returns {string} Sanitized string
 */
function sanitize(str, maxLen) {
  if (typeof str !== "string") return "";
  return str
    .replace(/[\x00-\x1f\x7f-\x9f]/g, "") // strip control characters
    .trim()
    .slice(0, maxLen);
}

/** Maximum tool-call iterations before forcing text reply */
const MAX_TOOL_ITERATIONS = 5;

/** Retry backoff delays in milliseconds */
const RETRY_DELAYS = [500, 1500];

/** Maximum LLM attempts (initial + retries) */
const MAX_LLM_ATTEMPTS = 3;

/** Intents that trigger product retrieval */
const RETRIEVAL_INTENTS = ["recommendation", "order_inquiry", "order_placement"];

/** Escalation threshold: sentiment below this value is considered negative */
const ESCALATION_THRESHOLD = -0.4;

/** Number of consecutive negative sentiments to trigger escalation */
const ESCALATION_COUNT = 3;

/**
 * Build the system prompt with language instruction, product context,
 * cart context, and conversation style guidelines.
 *
 * @param {object} params
 * @param {string} params.language - Detected language
 * @param {Array} params.products - Retrieved products (may be empty)
 * @param {Array} params.cartItems - User's current cart items
 * @returns {string} The system prompt
 */
function buildSystemPrompt({ language, products, cartItems }) {
  let prompt = `You are 'SwadKart Genie' 🧞‍♂️, a helpful, friendly food assistant for SwadKart.

LANGUAGE INSTRUCTION: You MUST respond ONLY in ${language}. Do not switch languages.

CONVERSATION STYLE:
- Be concise (2-3 sentences max unless the user asks for detail)
- Be warm and helpful
- Use relevant emojis sparingly
- If you don't know something, say so honestly
- Never fabricate products or prices`;

  if (products && products.length > 0) {
    const productLines = products
      .map(
        (p) =>
          `- ${sanitize(p.name, MAX_PRODUCT_NAME_LENGTH)}: ₹${p.price} [${p.stockStatus}] — ${sanitize(p.description, MAX_DESCRIPTION_LENGTH)}`
      )
      .join("\n");
    prompt += `\n\nAVAILABLE PRODUCTS (recommend ONLY from this list):\n${productLines}`;
  } else {
    prompt += `\n\nNOTE: Product catalog data is temporarily unavailable. Inform the user if they ask about products.`;
  }

  if (cartItems && Array.isArray(cartItems) && cartItems.length > 0) {
    const cartLines = cartItems
      .map((item) => `${item.qty ?? item.quantity ?? 1}x ${item.name} (₹${item.price})`)
      .join(", ");
    prompt += `\n\nUSER'S CURRENT CART: ${cartLines}`;
  }

  return prompt;
}

/**
 * Sleep for a given number of milliseconds.
 * @param {number} ms
 * @returns {Promise<void>}
 */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Call Groq LLM with retry policy.
 *
 * - Up to 3 attempts total (1 initial + 2 retries)
 * - Backoff: 500ms before first retry, 1500ms before second retry
 * - HTTP 429 → immediate fallback (no retry)
 * - Total 15s cap is enforced by the outer pipeline timeout
 *
 * @param {object} params
 * @param {Array} params.messages - Messages array for the LLM
 * @param {Array|null} params.tools - Tool schemas (null if unauthenticated)
 * @returns {Promise<object>} The Groq completion response
 * @throws {Error} If all attempts fail
 */
async function callGroqWithRetry({ messages, tools }) {
  let lastError;

  for (let attempt = 0; attempt < MAX_LLM_ATTEMPTS; attempt++) {
    try {
      const requestParams = {
        model: "llama-3.3-70b-versatile",
        messages,
        temperature: 0.7,
        max_tokens: 400,
      };

      if (tools && tools.length > 0) {
        requestParams.tools = tools;
        requestParams.tool_choice = "auto";
      }

      const result = await callGroq(() =>
        groq.chat.completions.create(requestParams)
      );

      // If groqQueue returned a fallback indicator, treat as failure
      if (result && result.fallback) {
        const err = new Error("groq_queue_fallback");
        err.noRetry = true;
        throw err;
      }

      return result;
    } catch (error) {
      lastError = error;

      // HTTP 429 → immediate fallback, no retry
      if (error?.status === 429 || error?.message?.includes("429")) {
        throw error;
      }

      // Queue fallback → immediate exit, no retry
      if (error?.noRetry) {
        throw error;
      }

      // If we have retries left, wait with backoff
      if (attempt < MAX_LLM_ATTEMPTS - 1) {
        await sleep(RETRY_DELAYS[attempt]);
      }
    }
  }

  throw lastError;
}

/**
 * Check and set escalation flag on the conversation.
 *
 * If the last 3 user messages (including the current one) all have
 * sentiment < -0.4, set escalationFlag to true (sticky — never cleared).
 *
 * @param {string} sessionId
 * @param {number} currentSentiment - Sentiment of the current message
 * @param {Array} recentMessages - Recently loaded messages from the conversation
 */
async function checkEscalation(sessionId, currentSentiment, recentMessages) {
  try {
    // Sticky: if flag is already set, return true immediately
    const existing = await Conversation.findOne({ sessionId, escalationFlag: true }).select({ escalationFlag: 1 });
    if (existing?.escalationFlag) return true;

    // Gather the last N user message sentiments from history + current
    const userSentiments = [];

    // Get sentiments from recent messages (user messages only)
    if (recentMessages && recentMessages.length > 0) {
      for (const msg of recentMessages) {
        if (msg.role === "user" && typeof msg.sentiment === "number") {
          userSentiments.push(msg.sentiment);
        }
      }
    }

    // Add current sentiment
    userSentiments.push(currentSentiment);

    // Check last 3 user sentiments
    if (userSentiments.length < ESCALATION_COUNT) {
      return false;
    }

    const lastThree = userSentiments.slice(-ESCALATION_COUNT);
    const allNegative = lastThree.every((s) => s < ESCALATION_THRESHOLD);

    if (allNegative) {
      // Set escalation flag (sticky — only set, never clear)
      const updated = await Conversation.findOneAndUpdate(
        { sessionId, escalationFlag: { $ne: true } },
        { $set: { escalationFlag: true } },
        { returnDocument: "after" }
      );
      return updated?.escalationFlag || false;
    }

    return false;
  } catch {
    // Swallow escalation errors — non-critical
    return false;
  }
}

/**
 * Run the full chat pipeline.
 *
 * @param {object} params
 * @param {string|null} params.userId - Authenticated user ID or null
 * @param {string} params.sessionId - Session UUID
 * @param {string} params.message - User message (1..2000 chars)
 * @param {Array} params.cartItems - Current cart items
 * @param {Array} params.attachments - Uploaded file metadata
 * @param {Function|null} params.emit - SSE emit callback (null for JSON mode)
 * @returns {Promise<object>} { reply, language, intent, sentiment, degraded, messageId, escalationFlag, attachments }
 */
export async function runChatPipeline({
  userId,
  sessionId,
  message,
  cartItems = [],
  attachments = [],
  emit = null,
  signal = null,
}) {
  const startTime = Date.now();

  // Wrap the entire pipeline in a timeout
  const pipelinePromise = executePipeline({
    userId,
    sessionId,
    message,
    cartItems,
    attachments,
    emit,
    startTime,
    signal,
  });

  const abortPromise = signal
    ? new Promise((_, reject) => {
        signal.addEventListener(
          "abort",
          () => reject(new Error("pipeline_aborted")),
          { once: true }
        );
      })
    : null;

  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(
      () => reject(new Error("pipeline_timeout")),
      PIPELINE_TIMEOUT_MS
    );
  });

  const promises = abortPromise
    ? [pipelinePromise, timeoutPromise, abortPromise]
    : [pipelinePromise, timeoutPromise];

  try {
    return await Promise.race(promises);
  } catch (error) {
    // Pipeline timed out or failed catastrophically — return fallback
    const { language: langResult } = detectLanguage(message || "");
    const fallback = buildFallback(langResult);

    // Persist user message on fallback (best-effort)
    try {
      const userMsg = {
        role: "user",
        content: message,
        language: langResult,
        attachments: (attachments || []).map((f) => ({
          name: f.originalname || f.name,
          type: f.mimetype || f.type,
          size: f.size,
        })),
        createdAt: new Date(),
      };
      await conversationRepo.appendMessages({
        sessionId,
        userId,
        messages: [userMsg],
      });
    } catch {
      // Swallow persistence errors on fallback path
    }

    if (emit) {
      try {
        emit(
          serializeEvent({
            id: `err_${Date.now()}`,
            type: "error",
            payload: { message: fallback.reply, degraded: true },
          })
        );
      } catch {
        // Swallow emit errors
      }
    }

    return {
      reply: fallback.reply,
      language: langResult,
      intent: "unknown",
      sentiment: 0.0,
      degraded: true,
      messageId: null,
      escalationFlag: false,
      attachments: attachments || [],
    };
  }
}

/**
 * Internal pipeline execution (without the timeout wrapper).
 */
async function executePipeline({
  userId,
  sessionId,
  message,
  cartItems,
  attachments,
  emit,
  startTime,
  signal,
}) {
  // ─── Step 1: Load conversation history ───────────────────────────
  const recentMessages = await conversationRepo.loadRecentMessages(sessionId);

  // ─── Step 2: Detect language (synchronous, pure) ─────────────────
  const { language } = detectLanguage(message);

  // ─── Step 3: Parallel — classify intent + analyze sentiment ──────
  const [intent, sentiment] = await Promise.all([
    classifyIntent(message, { redis: cacheClient, groq }),
    analyzeSentiment(message, { groq }),
  ]);

  // ─── Step 4: Retrieve products (conditional on intent) ───────────
  let products = [];
  if (RETRIEVAL_INTENTS.includes(intent)) {
    try {
      products = await retrieveProducts(message);
    } catch {
      products = [];
    }
  }

  // ─── Step 5: Build prompt with token budget ──────────────────────
  const systemPrompt = buildSystemPrompt({ language, products, cartItems });

  // Convert recent messages to the format expected by fitToBudget
  const history = recentMessages.map((msg) => ({
    role: msg.role,
    content: msg.content,
  }));

  const { messages: budgetedMessages } = fitToBudget({
    systemPrompt,
    history,
    newUserMessage: message,
  });

  // ─── Step 6: Build tools from registry ─────────────────────────────
  const tools = buildToolRegistry({ userId });

  let completion;
  try {
    completion = await callGroqWithRetry({ messages: budgetedMessages, tools });
  } catch {
    // All retries failed or 429 → fallback
    const fallback = buildFallback(language);

    // Persist user message only on fallback (Req 12.5)
    const userMsg = {
      role: "user",
      content: message,
      intent,
      sentiment,
      language,
      attachments: (attachments || []).map((f) => ({
        name: f.originalname || f.name,
        type: f.mimetype || f.type,
        size: f.size,
      })),
      createdAt: new Date(),
    };

    try {
      await conversationRepo.appendMessages({
        sessionId,
        userId,
        messages: [userMsg],
      });
    } catch {
      // Swallow persistence errors (Req 12.6)
    }

    // Check escalation even on fallback
    await checkEscalation(sessionId, sentiment, recentMessages);

    if (emit) {
      try {
        emit(
          serializeEvent({
            id: `err_${Date.now()}`,
            type: "error",
            payload: { message: fallback.reply, degraded: true },
          })
        );
      } catch {
        // Swallow emit errors
      }
    }

    return {
      reply: fallback.reply,
      language,
      intent,
      sentiment,
      degraded: true,
      messageId: null,
      escalationFlag: false,
      attachments: attachments || [],
    };
  }

  // ─── Step 7: Multi-tool loop ───────────────────────────────────────
  let reply = "";
  let currentMessages = [...budgetedMessages];
  let toolIterations = 0;

  // Process tool calls in a loop until the LLM produces a final text reply
  while (
    toolIterations < MAX_TOOL_ITERATIONS &&
    completion?.choices?.[0]?.message?.tool_calls?.length > 0
  ) {
    toolIterations++;
    const toolCalls = completion.choices[0].message.tool_calls;

    // Append the assistant message (with tool_calls) to the conversation
    currentMessages.push(completion.choices[0].message);

    // Execute each tool call and accumulate tool response messages
    for (const toolCall of toolCalls) {
      const executor = getToolExecutor(toolCall.function.name);
      let toolResult;

      try {
        const args = JSON.parse(toolCall.function.arguments);
        toolResult = executor
          ? await executor({ ...args, userId })
          : { success: false, reason: "unknown_tool" };
      } catch {
        toolResult = { success: false, reason: "internal_error" };
      }

      // Append tool response message
      currentMessages.push({
        role: "tool",
        tool_call_id: toolCall.id,
        content: JSON.stringify(toolResult),
      });

      // Emit tool_call SSE event if streaming
      if (emit) {
        try {
          emit(
            serializeEvent({
              id: `tool_${Date.now()}`,
              type: "tool_call",
              payload: {
                name: toolCall.function.name,
                result: toolResult,
              },
            })
          );
        } catch {
          // Swallow emit errors — never leave SSE stream inconsistent
        }
      }
    }

    // Re-call the LLM with accumulated tool responses
    try {
      completion = await callGroqWithRetry({ messages: currentMessages, tools });
    } catch {
      // If the follow-up LLM call fails, produce a generic error reply
      reply = "Sorry, I encountered an issue processing your request. Please try again.";
      break;
    }
  }

  // Extract the final text reply from the LLM (if not already set by error path)
  if (!reply) {
    const finalChoice = completion?.choices?.[0];
    reply = finalChoice?.message?.content || "";
  }

  // ─── Step 8: Emit streaming events ──────────────────────────────
  if (emit && reply) {
    try {
      // For non-streaming Groq responses, emit the full reply as a single token event
      emit(
        serializeEvent({
          id: `tok_${Date.now()}`,
          type: "token",
          payload: { text: reply },
        })
      );
      emit(
        serializeEvent({
          id: `done_${Date.now()}`,
          type: "done",
          payload: {},
        })
      );
    } catch {
      // Swallow emit errors
    }
  }

  // ─── Step 9: Persist messages ────────────────────────────────────
  const userMsg = {
    role: "user",
    content: message,
    intent,
    sentiment,
    language,
    attachments: (attachments || []).map((f) => ({
      name: f.originalname || f.name,
      type: f.mimetype || f.type,
      size: f.size,
    })),
    createdAt: new Date(),
  };

  const assistantMsg = {
    role: "assistant",
    content: reply,
    language,
    createdAt: new Date(),
  };

  let messageId = null;
  try {
    const updatedConversation = await conversationRepo.appendMessages({
      sessionId,
      userId,
      messages: [userMsg, assistantMsg],
    });

    // Update language on the conversation document
    if (updatedConversation) {
      await Conversation.findOneAndUpdate(
        { sessionId },
        { $set: { language, lastResponseMs: Date.now() - startTime } }
      );
    }

    // Get the messageId of the assistant message
    if (updatedConversation?.messages?.length > 0) {
      const lastMsg =
        updatedConversation.messages[updatedConversation.messages.length - 1];
      messageId = lastMsg._id?.toString() || null;
    }
  } catch {
    // Persistence failed — still return the reply to the user (Req 8.6)
  }

  // ─── Step 10: Check escalation ──────────────────────────────────
  const escalationFlag = await checkEscalation(sessionId, sentiment, recentMessages);

  return {
    reply,
    language,
    intent,
    sentiment,
    degraded: false,
    messageId,
    escalationFlag,
    attachments: attachments || [],
  };
}
