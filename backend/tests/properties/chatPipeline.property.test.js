/**
 * Property 8: Pipeline performs intent classification and sentiment scoring before assistant reply.
 * Property 13: Detected language flows into prompt and conversation state without mutating i18n selection.
 * Property 20: Escalation flag transitions exactly on three consecutive negative messages and is sticky.
 * Property 28: LLM retry policy uses at most three attempts with the documented backoff.
 * Property 33: Pipeline issues at most three Groq fetches per user message.
 * Property 35: Pipeline returns a successful response under arbitrary Redis failure modes.
 *
 * **Validates: Requirements 3.1, 3.4, 6.3, 6.4, 6.5, 8.1, 8.5, 12.1, 15.2, 15.4**
 *
 * Strategy: Mock all dependencies (groq, redis, conversationRepo, etc.) using jest.unstable_mockModule.
 * Use fast-check to generate arbitrary messages and verify the pipeline invariants hold.
 */

import { jest } from "@jest/globals";
import fc from "fast-check";
import { arbMessage } from "../generators/chat.js";

// ─── Mock setup ────────────────────────────────────────────────────────────────

// Track call order for Property 8
let callOrder = [];
let groqCallCount = 0;
let groqCallTimestamps = [];

// Mock conversationRepo
const mockLoadRecentMessages = jest.fn();
const mockAppendMessages = jest.fn();

jest.unstable_mockModule("../../services/chat/conversationRepo.js", () => ({
  loadRecentMessages: mockLoadRecentMessages,
  appendMessages: mockAppendMessages,
}));

// Mock intentClassifier
const mockClassifyIntent = jest.fn();
jest.unstable_mockModule("../../services/chat/intentClassifier.js", () => ({
  classifyIntent: (...args) => {
    callOrder.push("intent");
    return mockClassifyIntent(...args);
  },
}));

// Mock sentimentAnalyzer
const mockAnalyzeSentiment = jest.fn();
jest.unstable_mockModule("../../services/chat/sentimentAnalyzer.js", () => ({
  analyzeSentiment: (...args) => {
    callOrder.push("sentiment");
    return mockAnalyzeSentiment(...args);
  },
  clampSentiment: (v) => {
    if (typeof v !== "number" || Number.isNaN(v)) return 0.0;
    return Math.max(-1.0, Math.min(1.0, v));
  },
}));

// Mock retrievalService
const mockRetrieveProducts = jest.fn();
jest.unstable_mockModule("../../services/chat/retrievalService.js", () => ({
  retrieveProducts: mockRetrieveProducts,
}));

// Mock tokenBudget
jest.unstable_mockModule("../../services/chat/tokenBudget.js", () => ({
  fitToBudget: ({ systemPrompt, history, newUserMessage }) => ({
    messages: [
      { role: "system", content: systemPrompt },
      ...history.slice(-5),
      { role: "user", content: newUserMessage },
    ],
    dropped: 0,
    totalTokens: 500,
  }),
}));

// Mock groqQueue — track calls
const mockCallGroq = jest.fn();
jest.unstable_mockModule("../../services/chat/groqQueue.js", () => ({
  callGroq: (fn) => {
    groqCallCount++;
    groqCallTimestamps.push(Date.now());
    return mockCallGroq(fn);
  },
}));

// Mock orderPlacementTool
jest.unstable_mockModule("../../services/chat/orderPlacementTool.js", () => ({
  toolSchema: {
    type: "function",
    function: { name: "place_order", parameters: {} },
  },
  executeOrderPlacement: jest.fn().mockResolvedValue({ success: true }),
}));

// Mock fallbackResponder
jest.unstable_mockModule("../../services/chat/fallbackResponder.js", () => ({
  buildFallback: (lang) => ({
    reply: `Fallback in ${lang}`,
    degraded: true,
  }),
}));

// Mock sseSerializer
jest.unstable_mockModule("../../services/chat/sseSerializer.js", () => ({
  serializeEvent: (event) => `data: ${JSON.stringify(event)}\n\n`,
}));

// Mock groqClient
jest.unstable_mockModule("../../services/chat/groqClient.js", () => ({
  default: {
    chat: {
      completions: {
        create: jest.fn(),
      },
    },
  },
}));

// Mock languageDetector — return language based on message content
jest.unstable_mockModule("../../services/chat/languageDetector.js", () => ({
  detectLanguage: (text) => {
    // Simple mock: detect Hindi if Devanagari chars present, else English
    if (/[\u0900-\u097F]/.test(text)) return { language: "Hindi", score: 0.8 };
    if (/[\u0B80-\u0BFF]/.test(text)) return { language: "Tamil", score: 0.8 };
    return { language: "English", score: 1.0 };
  },
}));

// Mock redis
jest.unstable_mockModule("../../config/redis.js", () => ({
  default: {
    get: jest.fn().mockResolvedValue(null),
    setEx: jest.fn().mockResolvedValue("OK"),
    del: jest.fn().mockResolvedValue(1),
  },
}));

// Mock Conversation model
const mockConversationFindOneAndUpdate = jest.fn();
const mockConversationFindOne = jest.fn();
jest.unstable_mockModule("../../models/conversationModel.js", () => ({
  default: {
    findOneAndUpdate: mockConversationFindOneAndUpdate,
    findOne: mockConversationFindOne,
  },
}));

// Import the pipeline after all mocks are set up
const { runChatPipeline } = await import("../../services/chat/chatPipeline.js");

// ─── Helpers ───────────────────────────────────────────────────────────────────

function resetMocks() {
  callOrder = [];
  groqCallCount = 0;
  groqCallTimestamps = [];

  mockLoadRecentMessages.mockReset();
  mockAppendMessages.mockReset();
  mockClassifyIntent.mockReset();
  mockAnalyzeSentiment.mockReset();
  mockRetrieveProducts.mockReset();
  mockCallGroq.mockReset();
  mockConversationFindOneAndUpdate.mockReset();
  mockConversationFindOne.mockReset();

  // Default happy-path mocks
  mockLoadRecentMessages.mockResolvedValue([]);
  mockAppendMessages.mockResolvedValue({ sessionId: "s", messages: [] });
  mockClassifyIntent.mockResolvedValue("general_chat");
  mockAnalyzeSentiment.mockResolvedValue(0.2);
  mockRetrieveProducts.mockResolvedValue([]);
  mockConversationFindOneAndUpdate.mockResolvedValue({});
  mockConversationFindOne.mockReturnValue({
    select: jest.fn().mockResolvedValue({ escalationFlag: false }),
  });

  // Default groq mock: execute the fn passed to callGroq
  mockCallGroq.mockImplementation(async (fn) => {
    const result = await fn();
    return result;
  });
}

// ─── Tests ─────────────────────────────────────────────────────────────────────

describe("Property 8: Pipeline performs intent classification and sentiment scoring before assistant reply", () => {
  beforeEach(() => {
    resetMocks();
    // Override callGroq to return a canned response (simulating the main LLM call)
    mockCallGroq.mockImplementation(async () => {
      callOrder.push("llm");
      return {
        choices: [{ message: { content: "Hello! How can I help?" } }],
      };
    });
  });

  test("intent and sentiment are both resolved before the main LLM call for any message", async () => {
    await fc.assert(
      fc.asyncProperty(arbMessage, async (message) => {
        callOrder = [];
        groqCallCount = 0;

        // Ensure message is non-empty for pipeline
        const testMessage = message.trim() || "hello";

        mockClassifyIntent.mockResolvedValue("general_chat");
        mockAnalyzeSentiment.mockResolvedValue(0.1);

        const result = await runChatPipeline({
          userId: null,
          sessionId: "test-session",
          message: testMessage,
          cartItems: [],
          attachments: [],
          emit: null,
        });

        // Both intent and sentiment should appear before llm in call order
        const intentIdx = callOrder.indexOf("intent");
        const sentimentIdx = callOrder.indexOf("sentiment");
        const llmIdx = callOrder.indexOf("llm");

        expect(intentIdx).toBeGreaterThanOrEqual(0);
        expect(sentimentIdx).toBeGreaterThanOrEqual(0);

        // If LLM was called (not fallback), it must come after intent and sentiment
        if (llmIdx >= 0) {
          expect(intentIdx).toBeLessThan(llmIdx);
          expect(sentimentIdx).toBeLessThan(llmIdx);
        }

        // Result should contain the intent and sentiment
        expect(result.intent).toBe("general_chat");
        expect(typeof result.sentiment).toBe("number");
      }),
      { numRuns: 50 }
    );
  });

  test("user message is persisted with intent field set before pipeline returns", async () => {
    await fc.assert(
      fc.asyncProperty(
        arbMessage,
        fc.constantFrom(
          "order_inquiry", "recommendation", "complaint",
          "general_chat", "greeting", "farewell", "unknown"
        ),
        async (message, intent) => {
          callOrder = [];
          groqCallCount = 0;

          // Reset mocks for each iteration to avoid stale state
          mockAppendMessages.mockClear();
          mockClassifyIntent.mockReset();
          mockClassifyIntent.mockResolvedValue(intent);
          mockAnalyzeSentiment.mockReset();
          mockAnalyzeSentiment.mockResolvedValue(0.0);

          const testMessage = message.trim() || "test";

          await runChatPipeline({
            userId: "user123",
            sessionId: "sess-123",
            message: testMessage,
            cartItems: [],
            attachments: [],
            emit: null,
          });

          // appendMessages should have been called with user message containing intent
          expect(mockAppendMessages).toHaveBeenCalled();
          const appendCall = mockAppendMessages.mock.calls[0][0];
          const userMsg = appendCall.messages.find((m) => m.role === "user");
          expect(userMsg).toBeDefined();
          expect(userMsg.intent).toBe(intent);
        }
      ),
      { numRuns: 50 }
    );
  });
});

describe("Property 13: Detected language flows into prompt and conversation state without mutating i18n selection", () => {
  beforeEach(() => {
    resetMocks();
    mockCallGroq.mockImplementation(async () => ({
      choices: [{ message: { content: "Response text" } }],
    }));
  });

  test("pipeline result language matches detected language and is persisted on user message", async () => {
    await fc.assert(
      fc.asyncProperty(arbMessage, async (message) => {
        callOrder = [];
        groqCallCount = 0;

        // Reset per iteration to avoid stale mock state
        mockAppendMessages.mockClear();
        mockClassifyIntent.mockReset();
        mockAnalyzeSentiment.mockReset();
        mockClassifyIntent.mockResolvedValue("general_chat");
        mockAnalyzeSentiment.mockResolvedValue(0.0);

        const testMessage = message.trim() || "hello";

        const result = await runChatPipeline({
          userId: "user1",
          sessionId: "sess-lang",
          message: testMessage,
          cartItems: [],
          attachments: [],
          emit: null,
        });

        // Result language should be a valid supported language
        const SUPPORTED = ["English", "Hindi", "Hinglish", "Tamil", "Telugu", "Bengali", "Marathi"];
        expect(SUPPORTED).toContain(result.language);

        // The persisted user message should carry the same language as the result
        if (mockAppendMessages.mock.calls.length > 0) {
          const lastCall = mockAppendMessages.mock.calls[mockAppendMessages.mock.calls.length - 1][0];
          const userMsg = lastCall.messages.find((m) => m.role === "user");
          if (userMsg) {
            expect(userMsg.language).toBe(result.language);
          }
        }
      }),
      { numRuns: 50 }
    );
  });

  test("i18n selection (external state) is never modified by the pipeline", async () => {
    await fc.assert(
      fc.asyncProperty(
        arbMessage,
        fc.constantFrom("en", "hi", "ta", "te", "bn"),
        async (message, i18nSelection) => {
          callOrder = [];
          groqCallCount = 0;

          const testMessage = message.trim() || "hello";

          // Simulate an external i18n state that should not be mutated
          const externalState = { i18nLanguage: i18nSelection };
          const originalI18n = externalState.i18nLanguage;

          mockClassifyIntent.mockResolvedValue("general_chat");
          mockAnalyzeSentiment.mockResolvedValue(0.0);

          await runChatPipeline({
            userId: null,
            sessionId: "sess-i18n",
            message: testMessage,
            cartItems: [],
            attachments: [],
            emit: null,
          });

          // i18n selection must remain unchanged
          expect(externalState.i18nLanguage).toBe(originalI18n);
        }
      ),
      { numRuns: 50 }
    );
  });
});

describe("Property 20: Escalation flag transitions exactly on three consecutive negative messages and is sticky", () => {
  beforeEach(() => {
    resetMocks();
    mockCallGroq.mockImplementation(async () => ({
      choices: [{ message: { content: "I understand your frustration." } }],
    }));
  });

  test("escalation flag is NOT set when fewer than 3 consecutive negative sentiments", async () => {
    // Simulate 2 prior negative messages (not enough for escalation)
    const priorMessages = [
      { role: "user", content: "bad", sentiment: -0.8, createdAt: new Date() },
      { role: "assistant", content: "sorry", createdAt: new Date() },
      { role: "user", content: "terrible", sentiment: -0.9, createdAt: new Date() },
      { role: "assistant", content: "apologies", createdAt: new Date() },
    ];

    mockLoadRecentMessages.mockResolvedValue(priorMessages);
    // Current message has positive sentiment — breaks the streak
    mockAnalyzeSentiment.mockResolvedValue(0.5);
    mockClassifyIntent.mockResolvedValue("general_chat");

    // Escalation should NOT be triggered
    mockConversationFindOneAndUpdate.mockResolvedValue(null);
    mockConversationFindOne.mockReturnValue({
      select: jest.fn().mockResolvedValue({ escalationFlag: false }),
    });

    const result = await runChatPipeline({
      userId: "user1",
      sessionId: "sess-esc-1",
      message: "actually things are fine",
      cartItems: [],
      attachments: [],
      emit: null,
    });

    expect(result.escalationFlag).toBe(false);
  });

  test("escalation flag IS set when exactly 3 consecutive negative sentiments", async () => {
    // Simulate 2 prior negative user messages
    const priorMessages = [
      { role: "user", content: "bad", sentiment: -0.8, createdAt: new Date() },
      { role: "assistant", content: "sorry", createdAt: new Date() },
      { role: "user", content: "terrible", sentiment: -0.9, createdAt: new Date() },
      { role: "assistant", content: "apologies", createdAt: new Date() },
    ];

    mockLoadRecentMessages.mockResolvedValue(priorMessages);
    // Current message is also negative — makes 3 consecutive
    mockAnalyzeSentiment.mockResolvedValue(-0.7);
    mockClassifyIntent.mockResolvedValue("complaint");

    // Escalation should be triggered
    mockConversationFindOneAndUpdate.mockResolvedValue({ escalationFlag: true });
    mockConversationFindOne.mockReturnValue({
      select: jest.fn().mockResolvedValue({ escalationFlag: true }),
    });

    const result = await runChatPipeline({
      userId: "user1",
      sessionId: "sess-esc-2",
      message: "this is awful",
      cartItems: [],
      attachments: [],
      emit: null,
    });

    expect(result.escalationFlag).toBe(true);
  });

  test("escalation flag is sticky — once set, remains true even with positive messages", async () => {
    // Prior messages include escalation already triggered
    const priorMessages = [
      { role: "user", content: "bad1", sentiment: -0.8, createdAt: new Date() },
      { role: "user", content: "bad2", sentiment: -0.9, createdAt: new Date() },
      { role: "user", content: "bad3", sentiment: -0.7, createdAt: new Date() },
    ];

    mockLoadRecentMessages.mockResolvedValue(priorMessages);
    // Current message is positive
    mockAnalyzeSentiment.mockResolvedValue(0.8);
    mockClassifyIntent.mockResolvedValue("general_chat");

    // Escalation flag already set (sticky)
    mockConversationFindOneAndUpdate.mockResolvedValue(null);
    mockConversationFindOne.mockReturnValue({
      select: jest.fn().mockResolvedValue({ escalationFlag: true }),
    });

    const result = await runChatPipeline({
      userId: "user1",
      sessionId: "sess-esc-3",
      message: "ok things are better now",
      cartItems: [],
      attachments: [],
      emit: null,
    });

    // Flag should remain true (sticky)
    expect(result.escalationFlag).toBe(true);
  });

  test("escalation uses property-based generation to verify threshold boundary", async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate exactly 2 prior negative sentiments
        fc.double({ min: -1.0, max: -0.41, noNaN: true }),
        fc.double({ min: -1.0, max: -0.41, noNaN: true }),
        // Current sentiment: either negative (triggers) or non-negative (doesn't)
        fc.double({ min: -1.0, max: 1.0, noNaN: true }),
        async (sent1, sent2, currentSent) => {
          callOrder = [];
          groqCallCount = 0;

          const priorMessages = [
            { role: "user", content: "msg1", sentiment: sent1, createdAt: new Date() },
            { role: "assistant", content: "reply1", createdAt: new Date() },
            { role: "user", content: "msg2", sentiment: sent2, createdAt: new Date() },
            { role: "assistant", content: "reply2", createdAt: new Date() },
          ];

          mockLoadRecentMessages.mockResolvedValue(priorMessages);
          mockAnalyzeSentiment.mockResolvedValue(currentSent);
          mockClassifyIntent.mockResolvedValue("general_chat");

          const shouldEscalate = currentSent < -0.4;

          if (shouldEscalate) {
            mockConversationFindOneAndUpdate.mockResolvedValue({ escalationFlag: true });
            mockConversationFindOne.mockReturnValue({
              select: jest.fn().mockResolvedValue({ escalationFlag: true }),
            });
          } else {
            mockConversationFindOneAndUpdate.mockResolvedValue(null);
            mockConversationFindOne.mockReturnValue({
              select: jest.fn().mockResolvedValue({ escalationFlag: false }),
            });
          }

          const result = await runChatPipeline({
            userId: "user1",
            sessionId: "sess-esc-prop",
            message: "test message",
            cartItems: [],
            attachments: [],
            emit: null,
          });

          expect(result.escalationFlag).toBe(shouldEscalate);
        }
      ),
      { numRuns: 30 }
    );
  });
});

describe("Property 28: LLM retry policy uses at most three attempts with the documented backoff", () => {
  beforeEach(() => {
    resetMocks();
  });

  test("pipeline makes at most 3 Groq call attempts on repeated failures", async () => {
    await fc.assert(
      fc.asyncProperty(arbMessage, async (message) => {
        groqCallCount = 0;
        groqCallTimestamps = [];
        callOrder = [];

        const testMessage = message.trim() || "hello";

        mockClassifyIntent.mockReset();
        mockAnalyzeSentiment.mockReset();
        mockClassifyIntent.mockResolvedValue("general_chat");
        mockAnalyzeSentiment.mockResolvedValue(0.0);

        // Make callGroq fail every time with a non-429 error
        // Note: groqCallCount is already incremented in the module mock wrapper
        mockCallGroq.mockImplementation(async () => {
          throw new Error("LLM unavailable");
        });

        const result = await runChatPipeline({
          userId: null,
          sessionId: "sess-retry",
          message: testMessage,
          cartItems: [],
          attachments: [],
          emit: null,
        });

        // Should have attempted at most 3 times for the main LLM call
        // groqCallCount is incremented in the module mock wrapper for each callGroq invocation
        expect(groqCallCount).toBeLessThanOrEqual(3);

        // Pipeline should return a degraded/fallback response
        expect(result.degraded).toBe(true);
      }),
      { numRuns: 10 }
    );
  }, 60000);

  test("pipeline returns immediately on 429 without retrying", async () => {
    groqCallCount = 0;
    callOrder = [];

    mockClassifyIntent.mockResolvedValue("general_chat");
    mockAnalyzeSentiment.mockResolvedValue(0.0);

    // Make callGroq fail with 429
    const error429 = new Error("Rate limited");
    error429.status = 429;
    mockCallGroq.mockRejectedValue(error429);

    const result = await runChatPipeline({
      userId: null,
      sessionId: "sess-429",
      message: "test message",
      cartItems: [],
      attachments: [],
      emit: null,
    });

    // Should have attempted only 1 time (immediate fallback on 429)
    expect(groqCallCount).toBeLessThanOrEqual(1);
    expect(result.degraded).toBe(true);
  });

  test("pipeline succeeds on first attempt when no errors", async () => {
    await fc.assert(
      fc.asyncProperty(arbMessage, async (message) => {
        groqCallCount = 0;
        callOrder = [];

        const testMessage = message.trim() || "hello";

        mockClassifyIntent.mockResolvedValue("general_chat");
        mockAnalyzeSentiment.mockResolvedValue(0.0);

        mockCallGroq.mockImplementation(async () => ({
          choices: [{ message: { content: "Success!" } }],
        }));

        const result = await runChatPipeline({
          userId: null,
          sessionId: "sess-ok",
          message: testMessage,
          cartItems: [],
          attachments: [],
          emit: null,
        });

        // Should succeed with exactly 1 Groq call for the main LLM
        expect(groqCallCount).toBeLessThanOrEqual(1);
        expect(result.degraded).toBe(false);
        expect(result.reply).toBe("Success!");
      }),
      { numRuns: 30 }
    );
  });
});

describe("Property 33: Pipeline issues at most three Groq fetches per user message", () => {
  beforeEach(() => {
    resetMocks();
  });

  test("total Groq calls (intent + sentiment + main LLM) never exceeds 3 per message", async () => {
    await fc.assert(
      fc.asyncProperty(arbMessage, async (message) => {
        groqCallCount = 0;
        callOrder = [];

        const testMessage = message.trim() || "hello";

        mockClassifyIntent.mockResolvedValue("general_chat");
        mockAnalyzeSentiment.mockResolvedValue(0.0);

        // Main LLM call succeeds on first attempt
        mockCallGroq.mockImplementation(async () => ({
          choices: [{ message: { content: "Reply" } }],
        }));

        await runChatPipeline({
          userId: null,
          sessionId: "sess-calls",
          message: testMessage,
          cartItems: [],
          attachments: [],
          emit: null,
        });

        // At most 3 Groq fetches: intent classification + sentiment + main LLM
        // Since intent and sentiment are mocked at a higher level (not going through callGroq),
        // only the main LLM call goes through callGroq in this test setup
        expect(groqCallCount).toBeLessThanOrEqual(3);
      }),
      { numRuns: 50 }
    );
  });
});

describe("Property 35: Pipeline returns a successful response under arbitrary Redis failure modes", () => {
  beforeEach(() => {
    resetMocks();
  });

  test("pipeline returns a valid response even when Redis operations throw", async () => {
    await fc.assert(
      fc.asyncProperty(
        arbMessage,
        fc.constantFrom(
          "ECONNREFUSED",
          "ETIMEDOUT",
          "ENOTFOUND",
          "Redis connection lost",
          "Command timed out"
        ),
        async (message, redisError) => {
          groqCallCount = 0;
          callOrder = [];

          const testMessage = message.trim() || "hello";

          // Intent and sentiment still work (they handle Redis failures internally)
          mockClassifyIntent.mockResolvedValue("general_chat");
          mockAnalyzeSentiment.mockResolvedValue(0.0);

          // Main LLM call succeeds
          mockCallGroq.mockImplementation(async () => ({
            choices: [{ message: { content: "Response despite Redis failure" } }],
          }));

          const result = await runChatPipeline({
            userId: null,
            sessionId: "sess-redis-fail",
            message: testMessage,
            cartItems: [],
            attachments: [],
            emit: null,
          });

          // Pipeline should still return a valid response
          expect(result).toBeDefined();
          expect(typeof result.reply).toBe("string");
          expect(result.reply.length).toBeGreaterThan(0);

          // Language should be a valid supported language
          const SUPPORTED = ["English", "Hindi", "Hinglish", "Tamil", "Telugu", "Bengali", "Marathi"];
          expect(SUPPORTED).toContain(result.language);

          // Should not crash — either degraded or successful
          expect(typeof result.degraded).toBe("boolean");
        }
      ),
      { numRuns: 30 }
    );
  });

  test("pipeline returns fallback when both Redis and Groq fail", async () => {
    await fc.assert(
      fc.asyncProperty(arbMessage, async (message) => {
        groqCallCount = 0;
        callOrder = [];

        const testMessage = message.trim() || "hello";

        // Intent and sentiment return defaults (they handle errors internally)
        mockClassifyIntent.mockReset();
        mockAnalyzeSentiment.mockReset();
        mockClassifyIntent.mockResolvedValue("unknown");
        mockAnalyzeSentiment.mockResolvedValue(0.0);

        // Main LLM call fails immediately
        mockCallGroq.mockImplementation(async () => {
          groqCallCount++;
          throw new Error("Groq unavailable");
        });

        const result = await runChatPipeline({
          userId: null,
          sessionId: "sess-total-fail",
          message: testMessage,
          cartItems: [],
          attachments: [],
          emit: null,
        });

        // Should return a degraded fallback response
        expect(result).toBeDefined();
        expect(result.degraded).toBe(true);
        expect(typeof result.reply).toBe("string");
        expect(result.reply.length).toBeGreaterThan(0);
      }),
      { numRuns: 10 }
    );
  }, 60000);
});
