/**
 * Integration Tests for Chatbot Critical Paths
 *
 * Tests the full pipeline orchestration, SSE streaming, rate limiting,
 * and order placement with mocked external I/O (Groq, Redis, MongoDB).
 *
 * Task 11.3 — Validates: Requirements 1.1, 4.2, 10.1, 11.1, 12.3
 */

import { jest } from "@jest/globals";

// ═══════════════════════════════════════════════════════════════════════════════
// Mock Setup — All external I/O is mocked
// ═══════════════════════════════════════════════════════════════════════════════

// --- Conversation Repository ---
const mockLoadRecentMessages = jest.fn();
const mockAppendMessages = jest.fn();
jest.unstable_mockModule("../../services/chat/conversationRepo.js", () => ({
  loadRecentMessages: mockLoadRecentMessages,
  appendMessages: mockAppendMessages,
}));

// --- Language Detector (pure, but mock for control) ---
const mockDetectLanguage = jest.fn();
jest.unstable_mockModule("../../services/chat/languageDetector.js", () => ({
  detectLanguage: mockDetectLanguage,
}));

// --- Intent Classifier ---
const mockClassifyIntent = jest.fn();
jest.unstable_mockModule("../../services/chat/intentClassifier.js", () => ({
  classifyIntent: mockClassifyIntent,
}));

// --- Sentiment Analyzer ---
const mockAnalyzeSentiment = jest.fn();
jest.unstable_mockModule("../../services/chat/sentimentAnalyzer.js", () => ({
  analyzeSentiment: mockAnalyzeSentiment,
}));

// --- Retrieval Service ---
const mockRetrieveProducts = jest.fn();
jest.unstable_mockModule("../../services/chat/retrievalService.js", () => ({
  retrieveProducts: mockRetrieveProducts,
}));

// --- Token Budget ---
const mockFitToBudget = jest.fn();
jest.unstable_mockModule("../../services/chat/tokenBudget.js", () => ({
  fitToBudget: mockFitToBudget,
}));

// --- Groq Queue ---
const mockCallGroq = jest.fn();
jest.unstable_mockModule("../../services/chat/groqQueue.js", () => ({
  callGroq: mockCallGroq,
}));

// --- Tool Registry ---
const mockExecuteOrderPlacement = jest.fn();
jest.unstable_mockModule("../../services/chat/tools/toolRegistry.js", () => ({
  buildToolRegistry: jest.fn().mockReturnValue([
    {
      type: "function",
      function: {
        name: "place_order",
        parameters: {
          type: "object",
          properties: {
            productId: { type: "string" },
            quantity: { type: "integer", minimum: 1, maximum: 10 },
          },
          required: ["productId", "quantity"],
        },
      },
    },
  ]),
  getToolExecutor: jest.fn().mockImplementation((name) => {
    if (name === "place_order") return mockExecuteOrderPlacement;
    return null;
  }),
}));

// --- Fallback Responder ---
jest.unstable_mockModule("../../services/chat/fallbackResponder.js", () => ({
  buildFallback: (lang) => ({
    reply: `Sorry, our assistant is temporarily unavailable. Language: ${lang}`,
    degraded: true,
  }),
}));

// --- SSE Serializer ---
jest.unstable_mockModule("../../services/chat/sseSerializer.js", () => ({
  serializeEvent: (event) => `data: ${JSON.stringify(event)}\n\n`,
}));

// --- Groq Client ---
const mockGroqCreate = jest.fn();
jest.unstable_mockModule("../../services/chat/groqClient.js", () => ({
  default: {
    chat: { completions: { create: mockGroqCreate } },
  },
}));

// --- Redis ---
jest.unstable_mockModule("../../config/redis.js", () => ({
  default: {
    get: jest.fn().mockResolvedValue(null),
    setEx: jest.fn().mockResolvedValue("OK"),
    del: jest.fn().mockResolvedValue(1),
    ping: jest.fn().mockResolvedValue("PONG"),
  },
}));

// --- Conversation Model ---
const mockFindOneAndUpdate = jest.fn();
const mockFindOne = jest.fn();
jest.unstable_mockModule("../../models/conversationModel.js", () => ({
  default: {
    findOneAndUpdate: mockFindOneAndUpdate,
    findOne: mockFindOne,
  },
}));

// --- Product Model ---
jest.unstable_mockModule("../../models/productModel.js", () => ({
  default: { findById: jest.fn() },
}));

// ═══════════════════════════════════════════════════════════════════════════════
// Import modules under test AFTER mocks are registered
// ═══════════════════════════════════════════════════════════════════════════════

const { runChatPipeline } = await import(
  "../../services/chat/chatPipeline.js"
);

// For rate limiter, we import separately since it has its own internal state
const { checkRateLimits, _internals: rateLimiterInternals } = await import(
  "../../services/chat/rateLimiter.js"
);

// ═══════════════════════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════════════════════

function setupHappyPathMocks() {
  mockLoadRecentMessages.mockResolvedValue([]);
  mockDetectLanguage.mockReturnValue({ language: "English", score: 5 });
  mockClassifyIntent.mockResolvedValue("general_chat");
  mockAnalyzeSentiment.mockResolvedValue(0.3);
  mockRetrieveProducts.mockResolvedValue([]);
  mockFitToBudget.mockReturnValue({
    messages: [
      { role: "system", content: "You are SwadKart Genie..." },
      { role: "user", content: "hello" },
    ],
    dropped: 0,
    totalTokens: 150,
  });
  mockCallGroq.mockImplementation((fn) => fn());
  mockGroqCreate.mockResolvedValue({
    choices: [
      {
        message: {
          content: "Hello! Welcome to SwadKart. How can I help you today?",
          tool_calls: null,
        },
      },
    ],
  });
  mockAppendMessages.mockResolvedValue({
    messages: [
      { _id: "msg_001", role: "user", content: "hello" },
      {
        _id: "msg_002",
        role: "assistant",
        content: "Hello! Welcome to SwadKart. How can I help you today?",
      },
    ],
  });
  mockFindOneAndUpdate.mockResolvedValue({});
  mockFindOne.mockReturnValue({
    select: jest.fn().mockResolvedValue({ escalationFlag: false }),
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// Test Suites
// ═══════════════════════════════════════════════════════════════════════════════

describe("Integration: Full pipeline with mocked Groq (happy path)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupHappyPathMocks();
  });

  it("returns { reply, language, intent, sentiment, degraded: false } for a valid message", async () => {
    const result = await runChatPipeline({
      userId: "user_abc",
      sessionId: "session-integration-1",
      message: "hello there",
      cartItems: [],
      attachments: [],
      emit: null,
    });

    // Verify all expected fields are present and correct
    expect(result).toHaveProperty("reply");
    expect(result).toHaveProperty("language");
    expect(result).toHaveProperty("intent");
    expect(result).toHaveProperty("sentiment");
    expect(result).toHaveProperty("degraded");

    expect(result.reply).toBe(
      "Hello! Welcome to SwadKart. How can I help you today?"
    );
    expect(result.language).toBe("English");
    expect(result.intent).toBe("general_chat");
    expect(result.sentiment).toBe(0.3);
    expect(result.degraded).toBe(false);
  });

  it("calls all pipeline stages in the correct order", async () => {
    const callOrder = [];

    mockLoadRecentMessages.mockImplementation(() => {
      callOrder.push("loadHistory");
      return Promise.resolve([]);
    });
    mockDetectLanguage.mockImplementation(() => {
      callOrder.push("detectLanguage");
      return { language: "English", score: 5 };
    });
    mockClassifyIntent.mockImplementation(() => {
      callOrder.push("classifyIntent");
      return Promise.resolve("general_chat");
    });
    mockAnalyzeSentiment.mockImplementation(() => {
      callOrder.push("analyzeSentiment");
      return Promise.resolve(0.1);
    });
    mockFitToBudget.mockImplementation(() => {
      callOrder.push("fitToBudget");
      return {
        messages: [
          { role: "system", content: "sys" },
          { role: "user", content: "hi" },
        ],
        dropped: 0,
        totalTokens: 50,
      };
    });
    mockGroqCreate.mockImplementation(() => {
      callOrder.push("groqCall");
      return Promise.resolve({
        choices: [{ message: { content: "Hi!", tool_calls: null } }],
      });
    });
    mockAppendMessages.mockImplementation(() => {
      callOrder.push("persist");
      return Promise.resolve({
        messages: [{ _id: "m1", role: "assistant", content: "Hi!" }],
      });
    });

    await runChatPipeline({
      userId: "user1",
      sessionId: "sess-order-test",
      message: "hi",
      cartItems: [],
      attachments: [],
      emit: null,
    });

    // Verify ordering: history → language → (intent + sentiment) → budget → groq → persist
    expect(callOrder.indexOf("loadHistory")).toBeLessThan(
      callOrder.indexOf("detectLanguage")
    );
    expect(callOrder.indexOf("detectLanguage")).toBeLessThan(
      callOrder.indexOf("fitToBudget")
    );
    expect(callOrder.indexOf("fitToBudget")).toBeLessThan(
      callOrder.indexOf("groqCall")
    );
    expect(callOrder.indexOf("groqCall")).toBeLessThan(
      callOrder.indexOf("persist")
    );
  });

  it("persists both user and assistant messages on success", async () => {
    await runChatPipeline({
      userId: "user_persist",
      sessionId: "session-persist-check",
      message: "what do you have?",
      cartItems: [],
      attachments: [],
      emit: null,
    });

    expect(mockAppendMessages).toHaveBeenCalledTimes(1);
    const persistCall = mockAppendMessages.mock.calls[0][0];
    expect(persistCall.sessionId).toBe("session-persist-check");
    expect(persistCall.userId).toBe("user_persist");
    expect(persistCall.messages).toHaveLength(2);
    expect(persistCall.messages[0].role).toBe("user");
    expect(persistCall.messages[1].role).toBe("assistant");
  });
});

describe("Integration: Full pipeline fallback path", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupHappyPathMocks();
  });

  it("returns { degraded: true } with a fallback message when Groq fails on all attempts", async () => {
    // Make Groq fail on every attempt
    mockGroqCreate.mockRejectedValue(new Error("Service unavailable"));

    const result = await runChatPipeline({
      userId: null,
      sessionId: "session-fallback-1",
      message: "hello",
      cartItems: [],
      attachments: [],
      emit: null,
    });

    expect(result.degraded).toBe(true);
    expect(result.reply).toBeDefined();
    expect(result.reply.length).toBeGreaterThan(0);
    // Fallback message should contain language reference
    expect(result.reply).toContain("English");
    expect(result.language).toBe("English");
    expect(result.intent).toBe("general_chat");
  });

  it("returns fallback immediately on HTTP 429 without retrying", async () => {
    const error429 = new Error("Rate limited");
    error429.status = 429;
    mockGroqCreate.mockRejectedValue(error429);

    const result = await runChatPipeline({
      userId: null,
      sessionId: "session-429",
      message: "hello",
      cartItems: [],
      attachments: [],
      emit: null,
    });

    expect(result.degraded).toBe(true);
    // Should only be called once (no retries on 429)
    expect(mockGroqCreate).toHaveBeenCalledTimes(1);
  });

  it("persists only the user message on fallback path", async () => {
    mockGroqCreate.mockRejectedValue(new Error("Groq down"));

    await runChatPipeline({
      userId: "user_fallback",
      sessionId: "session-fallback-persist",
      message: "test fallback",
      cartItems: [],
      attachments: [],
      emit: null,
    });

    expect(mockAppendMessages).toHaveBeenCalled();
    const persistCall = mockAppendMessages.mock.calls[0][0];
    // Only user message should be persisted on fallback
    const hasAssistant = persistCall.messages.some(
      (m) => m.role === "assistant"
    );
    expect(hasAssistant).toBe(false);
    expect(persistCall.messages[0].role).toBe("user");
  });
});

describe("Integration: SSE streaming with mocked Groq token stream", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupHappyPathMocks();
  });

  it("emit receives token events followed by exactly one done event", async () => {
    const emittedEvents = [];
    const emitFn = jest.fn((data) => {
      emittedEvents.push(data);
    });

    // Groq returns a normal response (pipeline emits token + done)
    mockGroqCreate.mockResolvedValue({
      choices: [
        {
          message: {
            content: "Here are some great options for you!",
            tool_calls: null,
          },
        },
      ],
    });

    await runChatPipeline({
      userId: "user_stream",
      sessionId: "session-stream-1",
      message: "recommend something",
      cartItems: [],
      attachments: [],
      emit: emitFn,
    });

    // emit should have been called at least twice (token + done)
    expect(emitFn).toHaveBeenCalledTimes(2);

    // Parse emitted events
    const parsedEvents = emittedEvents.map((raw) => {
      const jsonStr = raw.replace(/^data: /, "").replace(/\n\n$/, "");
      return JSON.parse(jsonStr);
    });

    // All events before the last should be token events
    const tokenEvents = parsedEvents.filter((e) => e.type === "token");
    const doneEvents = parsedEvents.filter((e) => e.type === "done");

    expect(tokenEvents.length).toBeGreaterThanOrEqual(1);
    expect(doneEvents.length).toBe(1);

    // Token event should contain text
    expect(tokenEvents[0].payload.text).toBe(
      "Here are some great options for you!"
    );

    // Done event should be the last event
    const lastEvent = parsedEvents[parsedEvents.length - 1];
    expect(lastEvent.type).toBe("done");
  });

  it("emit receives error event when Groq fails in streaming mode", async () => {
    const emittedEvents = [];
    const emitFn = jest.fn((data) => {
      emittedEvents.push(data);
    });

    mockGroqCreate.mockRejectedValue(new Error("Stream failed"));

    await runChatPipeline({
      userId: null,
      sessionId: "session-stream-err",
      message: "hello",
      cartItems: [],
      attachments: [],
      emit: emitFn,
    });

    expect(emitFn).toHaveBeenCalled();

    // Parse the emitted event
    const parsedEvents = emittedEvents.map((raw) => {
      const jsonStr = raw.replace(/^data: /, "").replace(/\n\n$/, "");
      return JSON.parse(jsonStr);
    });

    // Should contain an error event
    const errorEvents = parsedEvents.filter((e) => e.type === "error");
    expect(errorEvents.length).toBeGreaterThanOrEqual(1);
    expect(errorEvents[0].payload.degraded).toBe(true);
  });

  it("token events are emitted before the done event", async () => {
    const emitOrder = [];
    const emitFn = jest.fn((data) => {
      const jsonStr = data.replace(/^data: /, "").replace(/\n\n$/, "");
      const event = JSON.parse(jsonStr);
      emitOrder.push(event.type);
    });

    mockGroqCreate.mockResolvedValue({
      choices: [
        {
          message: {
            content: "Namaste! How can I help?",
            tool_calls: null,
          },
        },
      ],
    });

    await runChatPipeline({
      userId: null,
      sessionId: "session-stream-order",
      message: "namaste",
      cartItems: [],
      attachments: [],
      emit: emitFn,
    });

    // Verify token comes before done
    const tokenIdx = emitOrder.indexOf("token");
    const doneIdx = emitOrder.indexOf("done");
    expect(tokenIdx).toBeGreaterThanOrEqual(0);
    expect(doneIdx).toBeGreaterThan(tokenIdx);
  });
});

describe("Integration: Rate limiter rejects at threshold", () => {
  beforeEach(() => {
    // Clear the in-memory store before each test
    rateLimiterInternals.inMemoryStore.clear();
  });

  it("admits the first 10 requests from the same IP", async () => {
    const results = [];

    for (let i = 0; i < 10; i++) {
      const result = await checkRateLimits({
        ip: "192.168.1.100",
        userId: null,
      });
      results.push(result);
    }

    // All 10 should be admitted
    expect(results.every((r) => r.ok === true)).toBe(true);
  });

  it("rejects the 11th request from the same IP with retryAfterSeconds", async () => {
    // Send 10 requests (all should pass)
    for (let i = 0; i < 10; i++) {
      const result = await checkRateLimits({
        ip: "192.168.1.200",
        userId: null,
      });
      expect(result.ok).toBe(true);
    }

    // 11th request should be rejected
    const rejected = await checkRateLimits({
      ip: "192.168.1.200",
      userId: null,
    });

    expect(rejected.ok).toBe(false);
    expect(rejected).toHaveProperty("retryAfterSeconds");
    expect(rejected.retryAfterSeconds).toBeGreaterThanOrEqual(1);
    expect(rejected.retryAfterSeconds).toBeLessThanOrEqual(60);
  });

  it("different IPs have independent rate limit counters", async () => {
    // Exhaust IP A's limit
    for (let i = 0; i < 10; i++) {
      await checkRateLimits({ ip: "10.0.0.1", userId: null });
    }

    // IP A should be rejected
    const rejectedA = await checkRateLimits({ ip: "10.0.0.1", userId: null });
    expect(rejectedA.ok).toBe(false);

    // IP B should still be admitted
    const admittedB = await checkRateLimits({ ip: "10.0.0.2", userId: null });
    expect(admittedB.ok).toBe(true);
  });

  it("retryAfterSeconds is a positive number within the window", async () => {
    // Exhaust the limit
    for (let i = 0; i < 11; i++) {
      await checkRateLimits({ ip: "172.16.0.1", userId: null });
    }

    const result = await checkRateLimits({ ip: "172.16.0.1", userId: null });
    expect(result.ok).toBe(false);
    expect(typeof result.retryAfterSeconds).toBe("number");
    expect(result.retryAfterSeconds).toBeGreaterThanOrEqual(1);
    expect(result.retryAfterSeconds).toBeLessThanOrEqual(
      rateLimiterInternals.IP_WINDOW_SECONDS
    );
  });
});

describe("Integration: Order placement tool with mocked Product model", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupHappyPathMocks();
    // Set intent to order_placement so the pipeline includes the tool
    mockClassifyIntent.mockResolvedValue("order_placement");
    mockRetrieveProducts.mockResolvedValue([
      { _id: "p1", name: "Butter Chicken", price: 350, description: "Creamy", stockStatus: "in_stock" },
    ]);
  });

  it("returns success when executeOrderPlacement succeeds via tool_call", async () => {
    // Groq returns a tool_call response
    mockGroqCreate
      .mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: null,
              tool_calls: [
                {
                  id: "call_001",
                  function: {
                    name: "place_order",
                    arguments: JSON.stringify({
                      productId: "prod_123",
                      quantity: 2,
                    }),
                  },
                },
              ],
            },
          },
        ],
      })
      // Follow-up call after tool result
      .mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: "Done! Added 2x Butter Chicken to your cart.",
              tool_calls: null,
            },
          },
        ],
      });

    // Mock executeOrderPlacement to return success
    mockExecuteOrderPlacement.mockResolvedValue({
      success: true,
      product: { name: "Butter Chicken", price: 350, quantity: 2 },
    });

    const result = await runChatPipeline({
      userId: "user_order_1",
      sessionId: "session-order-success",
      message: "add 2 butter chicken to cart",
      cartItems: [],
      attachments: [],
      emit: null,
    });

    // Verify executeOrderPlacement was called with correct args
    expect(mockExecuteOrderPlacement).toHaveBeenCalledWith({
      productId: "prod_123",
      quantity: 2,
      userId: "user_order_1",
    });

    // Pipeline should return a non-degraded response
    expect(result.degraded).toBe(false);
    expect(result.reply).toContain("Butter Chicken");
  });

  it("handles order placement rejection (invalid quantity) gracefully", async () => {
    // Groq returns a tool_call with invalid quantity
    mockGroqCreate
      .mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: null,
              tool_calls: [
                {
                  id: "call_002",
                  function: {
                    name: "place_order",
                    arguments: JSON.stringify({
                      productId: "prod_456",
                      quantity: 0,
                    }),
                  },
                },
              ],
            },
          },
        ],
      })
      // Follow-up call after tool result
      .mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: "Sorry, I couldn't complete that: invalid_quantity",
              tool_calls: null,
            },
          },
        ],
      });

    // Mock executeOrderPlacement to return rejection
    mockExecuteOrderPlacement.mockResolvedValue({
      success: false,
      reason: "invalid_quantity",
    });

    const result = await runChatPipeline({
      userId: "user_order_2",
      sessionId: "session-order-invalid",
      message: "add 0 items to cart",
      cartItems: [],
      attachments: [],
      emit: null,
    });

    // Verify executeOrderPlacement was called
    expect(mockExecuteOrderPlacement).toHaveBeenCalledWith({
      productId: "prod_456",
      quantity: 0,
      userId: "user_order_2",
    });

    // Pipeline should still return non-degraded (tool rejection is not a system failure)
    expect(result.degraded).toBe(false);
    expect(result.reply).toContain("invalid_quantity");
  });

  it("does not invoke order tool when user is not authenticated", async () => {
    // When userId is null, the pipeline should NOT include tools
    mockGroqCreate.mockResolvedValue({
      choices: [
        {
          message: {
            content: "You need to log in to place orders.",
            tool_calls: null,
          },
        },
      ],
    });

    const result = await runChatPipeline({
      userId: null, // Not authenticated
      sessionId: "session-order-noauth",
      message: "add butter chicken to cart",
      cartItems: [],
      attachments: [],
      emit: null,
    });

    // executeOrderPlacement should NOT be called for unauthenticated users
    expect(mockExecuteOrderPlacement).not.toHaveBeenCalled();
    expect(result.degraded).toBe(false);
    expect(result.reply).toBeDefined();
  });

  it("handles executeOrderPlacement throwing an error gracefully", async () => {
    mockGroqCreate
      .mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: null,
              tool_calls: [
                {
                  id: "call_003",
                  function: {
                    name: "place_order",
                    arguments: JSON.stringify({
                      productId: "prod_789",
                      quantity: 1,
                    }),
                  },
                },
              ],
            },
          },
        ],
      })
      .mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: "Sorry, something went wrong with your order.",
              tool_calls: null,
            },
          },
        ],
      });

    // Mock executeOrderPlacement to throw
    mockExecuteOrderPlacement.mockRejectedValue(new Error("DB connection lost"));

    const result = await runChatPipeline({
      userId: "user_order_err",
      sessionId: "session-order-error",
      message: "order 1 biryani",
      cartItems: [],
      attachments: [],
      emit: null,
    });

    // Pipeline should handle the error gracefully (not crash)
    expect(result.degraded).toBe(false);
    expect(result.reply).toBeDefined();
  });

  it("emits tool_call event via SSE when streaming and order succeeds", async () => {
    const emittedEvents = [];
    const emitFn = jest.fn((data) => {
      emittedEvents.push(data);
    });

    mockGroqCreate
      .mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: null,
              tool_calls: [
                {
                  id: "call_004",
                  function: {
                    name: "place_order",
                    arguments: JSON.stringify({
                      productId: "prod_stream",
                      quantity: 3,
                    }),
                  },
                },
              ],
            },
          },
        ],
      })
      .mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: "Added 3x Paneer Tikka to your cart!",
              tool_calls: null,
            },
          },
        ],
      });

    mockExecuteOrderPlacement.mockResolvedValue({
      success: true,
      product: { name: "Paneer Tikka", price: 280, quantity: 3 },
    });

    await runChatPipeline({
      userId: "user_stream_order",
      sessionId: "session-stream-order",
      message: "add 3 paneer tikka",
      cartItems: [],
      attachments: [],
      emit: emitFn,
    });

    // Parse emitted events
    const parsedEvents = emittedEvents.map((raw) => {
      const jsonStr = raw.replace(/^data: /, "").replace(/\n\n$/, "");
      return JSON.parse(jsonStr);
    });

    // Should have tool_call, token, and done events
    const toolCallEvents = parsedEvents.filter((e) => e.type === "tool_call");
    const tokenEvents = parsedEvents.filter((e) => e.type === "token");
    const doneEvents = parsedEvents.filter((e) => e.type === "done");

    expect(toolCallEvents.length).toBe(1);
    expect(toolCallEvents[0].payload.name).toBe("place_order");
    expect(toolCallEvents[0].payload.result.success).toBe(true);
    expect(tokenEvents.length).toBeGreaterThanOrEqual(1);
    expect(doneEvents.length).toBe(1);
  });
});
