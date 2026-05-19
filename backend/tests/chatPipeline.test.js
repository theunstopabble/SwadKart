/**
 * Unit tests for chatPipeline.js
 *
 * Tests the pipeline orchestration logic with mocked dependencies.
 * Verifies: ordering of operations, retry policy, escalation logic,
 * fallback behavior, and SSE emit callbacks.
 */

import { jest } from "@jest/globals";

// ─── Mock all dependencies ─────────────────────────────────────────

const mockLoadRecentMessages = jest.fn();
const mockAppendMessages = jest.fn();
jest.unstable_mockModule("../services/chat/conversationRepo.js", () => ({
  loadRecentMessages: mockLoadRecentMessages,
  appendMessages: mockAppendMessages,
}));

const mockDetectLanguage = jest.fn();
jest.unstable_mockModule("../services/chat/languageDetector.js", () => ({
  detectLanguage: mockDetectLanguage,
}));

const mockClassifyIntent = jest.fn();
jest.unstable_mockModule("../services/chat/intentClassifier.js", () => ({
  classifyIntent: mockClassifyIntent,
}));

const mockAnalyzeSentiment = jest.fn();
jest.unstable_mockModule("../services/chat/sentimentAnalyzer.js", () => ({
  analyzeSentiment: mockAnalyzeSentiment,
}));

const mockRetrieveProducts = jest.fn();
jest.unstable_mockModule("../services/chat/retrievalService.js", () => ({
  retrieveProducts: mockRetrieveProducts,
}));

const mockFitToBudget = jest.fn();
jest.unstable_mockModule("../services/chat/tokenBudget.js", () => ({
  fitToBudget: mockFitToBudget,
}));

const mockCallGroq = jest.fn();
jest.unstable_mockModule("../services/chat/groqQueue.js", () => ({
  callGroq: mockCallGroq,
}));

const mockExecuteOrderPlacement = jest.fn();
jest.unstable_mockModule("../services/chat/orderPlacementTool.js", () => ({
  toolSchema: { type: "function", function: { name: "place_order" } },
  executeOrderPlacement: mockExecuteOrderPlacement,
}));

jest.unstable_mockModule("../services/chat/fallbackResponder.js", () => ({
  buildFallback: (lang) => ({
    reply: `Fallback in ${lang}`,
    degraded: true,
  }),
}));

jest.unstable_mockModule("../services/chat/sseSerializer.js", () => ({
  serializeEvent: (event) => `data: ${JSON.stringify(event)}\n\n`,
}));

jest.unstable_mockModule("../services/chat/groqClient.js", () => ({
  default: { chat: { completions: { create: jest.fn() } } },
}));

jest.unstable_mockModule("../config/redis.js", () => ({
  default: {
    get: jest.fn().mockResolvedValue(null),
    setEx: jest.fn().mockResolvedValue("OK"),
  },
}));

const mockFindOneAndUpdate = jest.fn();
const mockFindOne = jest.fn();
jest.unstable_mockModule("../models/conversationModel.js", () => ({
  default: {
    findOneAndUpdate: mockFindOneAndUpdate,
    findOne: mockFindOne,
  },
}));

// ─── Import the module under test ──────────────────────────────────

const { runChatPipeline } = await import(
  "../services/chat/chatPipeline.js"
);

// ─── Test Suite ────────────────────────────────────────────────────

describe("chatPipeline", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Default happy-path mocks
    mockLoadRecentMessages.mockResolvedValue([]);
    mockDetectLanguage.mockReturnValue({ language: "English", score: 5 });
    mockClassifyIntent.mockResolvedValue("general_chat");
    mockAnalyzeSentiment.mockResolvedValue(0.2);
    mockRetrieveProducts.mockResolvedValue([]);
    mockFitToBudget.mockReturnValue({
      messages: [
        { role: "system", content: "system prompt" },
        { role: "user", content: "hello" },
      ],
      dropped: 0,
      totalTokens: 100,
    });
    mockCallGroq.mockImplementation((fn) => fn());
    mockAppendMessages.mockResolvedValue({
      messages: [{ _id: "msg123", role: "assistant", content: "Hi!" }],
    });
    mockFindOneAndUpdate.mockResolvedValue({});
    mockFindOne.mockReturnValue({
      select: jest.fn().mockResolvedValue({ escalationFlag: false }),
    });
  });

  describe("happy path", () => {
    it("should return a successful response with all fields", async () => {
      // Mock Groq returning a normal text response
      const mockGroqClient = (await import("../services/chat/groqClient.js"))
        .default;
      mockGroqClient.chat.completions.create = jest.fn().mockResolvedValue({
        choices: [
          {
            message: {
              content: "Hello! How can I help you?",
              tool_calls: null,
            },
          },
        ],
      });

      const result = await runChatPipeline({
        userId: "user123",
        sessionId: "session-abc",
        message: "hello",
        cartItems: [],
        attachments: [],
        emit: null,
      });

      expect(result.reply).toBe("Hello! How can I help you?");
      expect(result.language).toBe("English");
      expect(result.intent).toBe("general_chat");
      expect(result.sentiment).toBe(0.2);
      expect(result.degraded).toBe(false);
    });

    it("should call services in the correct order", async () => {
      const callOrder = [];

      mockLoadRecentMessages.mockImplementation(() => {
        callOrder.push("loadRecentMessages");
        return Promise.resolve([]);
      });
      mockDetectLanguage.mockImplementation(() => {
        callOrder.push("detectLanguage");
        return { language: "Hindi", score: 8 };
      });
      mockClassifyIntent.mockImplementation(() => {
        callOrder.push("classifyIntent");
        return Promise.resolve("greeting");
      });
      mockAnalyzeSentiment.mockImplementation(() => {
        callOrder.push("analyzeSentiment");
        return Promise.resolve(0.5);
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

      const mockGroqClient = (await import("../services/chat/groqClient.js"))
        .default;
      mockGroqClient.chat.completions.create = jest.fn().mockImplementation(() => {
        callOrder.push("groqCall");
        return Promise.resolve({
          choices: [{ message: { content: "Namaste!", tool_calls: null } }],
        });
      });

      mockAppendMessages.mockImplementation(() => {
        callOrder.push("appendMessages");
        return Promise.resolve({
          messages: [{ _id: "m1", role: "assistant", content: "Namaste!" }],
        });
      });

      await runChatPipeline({
        userId: null,
        sessionId: "sess-1",
        message: "hi",
        cartItems: [],
        attachments: [],
        emit: null,
      });

      // Verify ordering: load → detect → (parallel intent+sentiment) → budget → groq → persist
      expect(callOrder.indexOf("loadRecentMessages")).toBeLessThan(
        callOrder.indexOf("detectLanguage")
      );
      expect(callOrder.indexOf("detectLanguage")).toBeLessThan(
        callOrder.indexOf("classifyIntent")
      );
      expect(callOrder.indexOf("classifyIntent")).toBeLessThan(
        callOrder.indexOf("fitToBudget")
      );
      expect(callOrder.indexOf("fitToBudget")).toBeLessThan(
        callOrder.indexOf("groqCall")
      );
      expect(callOrder.indexOf("groqCall")).toBeLessThan(
        callOrder.indexOf("appendMessages")
      );
    });
  });

  describe("product retrieval", () => {
    it("should retrieve products for recommendation intent", async () => {
      mockClassifyIntent.mockResolvedValue("recommendation");
      mockRetrieveProducts.mockResolvedValue([
        { _id: "p1", name: "Burger", price: 150, description: "Tasty", stockStatus: "in_stock" },
      ]);

      const mockGroqClient = (await import("../services/chat/groqClient.js"))
        .default;
      mockGroqClient.chat.completions.create = jest.fn().mockResolvedValue({
        choices: [{ message: { content: "Try our Burger!", tool_calls: null } }],
      });

      await runChatPipeline({
        userId: null,
        sessionId: "sess-2",
        message: "recommend something",
        cartItems: [],
        attachments: [],
        emit: null,
      });

      expect(mockRetrieveProducts).toHaveBeenCalledWith("recommend something");
    });

    it("should NOT retrieve products for general_chat intent", async () => {
      mockClassifyIntent.mockResolvedValue("general_chat");

      const mockGroqClient = (await import("../services/chat/groqClient.js"))
        .default;
      mockGroqClient.chat.completions.create = jest.fn().mockResolvedValue({
        choices: [{ message: { content: "Hi!", tool_calls: null } }],
      });

      await runChatPipeline({
        userId: null,
        sessionId: "sess-3",
        message: "hello",
        cartItems: [],
        attachments: [],
        emit: null,
      });

      expect(mockRetrieveProducts).not.toHaveBeenCalled();
    });
  });

  describe("fallback on LLM failure", () => {
    it("should return fallback when Groq call fails after retries", async () => {
      const mockGroqClient = (await import("../services/chat/groqClient.js"))
        .default;
      mockGroqClient.chat.completions.create = jest
        .fn()
        .mockRejectedValue(new Error("Service unavailable"));

      const result = await runChatPipeline({
        userId: null,
        sessionId: "sess-4",
        message: "hello",
        cartItems: [],
        attachments: [],
        emit: null,
      });

      expect(result.degraded).toBe(true);
      expect(result.reply).toContain("Fallback");
    });

    it("should return fallback immediately on 429 without retrying", async () => {
      const error429 = new Error("Rate limited");
      error429.status = 429;

      const mockGroqClient = (await import("../services/chat/groqClient.js"))
        .default;
      mockGroqClient.chat.completions.create = jest
        .fn()
        .mockRejectedValue(error429);

      const result = await runChatPipeline({
        userId: null,
        sessionId: "sess-5",
        message: "hello",
        cartItems: [],
        attachments: [],
        emit: null,
      });

      expect(result.degraded).toBe(true);
      // Should only be called once (no retries on 429)
      expect(mockGroqClient.chat.completions.create).toHaveBeenCalledTimes(1);
    });
  });

  describe("escalation flag", () => {
    it("should set escalation flag when 3 consecutive sentiments are below -0.4", async () => {
      // Simulate 2 prior negative user messages in history
      mockLoadRecentMessages.mockResolvedValue([
        { role: "user", content: "bad", sentiment: -0.6 },
        { role: "assistant", content: "sorry" },
        { role: "user", content: "terrible", sentiment: -0.8 },
        { role: "assistant", content: "apologies" },
      ]);

      // Current message also negative
      mockAnalyzeSentiment.mockResolvedValue(-0.7);

      const mockGroqClient = (await import("../services/chat/groqClient.js"))
        .default;
      mockGroqClient.chat.completions.create = jest.fn().mockResolvedValue({
        choices: [{ message: { content: "I'm sorry", tool_calls: null } }],
      });

      mockFindOne.mockReturnValue({
        select: jest.fn().mockResolvedValue({ escalationFlag: true }),
      });

      const result = await runChatPipeline({
        userId: "user1",
        sessionId: "sess-esc",
        message: "this is awful",
        cartItems: [],
        attachments: [],
        emit: null,
      });

      // Verify escalation was attempted
      expect(mockFindOneAndUpdate).toHaveBeenCalled();
      expect(result.escalationFlag).toBe(true);
    });
  });

  describe("SSE emit callback", () => {
    it("should call emit with token and done events on success", async () => {
      const emitFn = jest.fn();

      const mockGroqClient = (await import("../services/chat/groqClient.js"))
        .default;
      mockGroqClient.chat.completions.create = jest.fn().mockResolvedValue({
        choices: [{ message: { content: "Hello!", tool_calls: null } }],
      });

      await runChatPipeline({
        userId: null,
        sessionId: "sess-sse",
        message: "hi",
        cartItems: [],
        attachments: [],
        emit: emitFn,
      });

      // Should have emitted at least 2 events (token + done)
      expect(emitFn).toHaveBeenCalledTimes(2);

      // First call should be a token event
      const firstCall = emitFn.mock.calls[0][0];
      expect(firstCall).toContain('"type":"token"');

      // Second call should be a done event
      const secondCall = emitFn.mock.calls[1][0];
      expect(secondCall).toContain('"type":"done"');
    });

    it("should emit error event on fallback", async () => {
      const emitFn = jest.fn();

      const mockGroqClient = (await import("../services/chat/groqClient.js"))
        .default;
      mockGroqClient.chat.completions.create = jest
        .fn()
        .mockRejectedValue(new Error("fail"));

      await runChatPipeline({
        userId: null,
        sessionId: "sess-sse-err",
        message: "hi",
        cartItems: [],
        attachments: [],
        emit: emitFn,
      });

      expect(emitFn).toHaveBeenCalled();
      const call = emitFn.mock.calls[0][0];
      expect(call).toContain('"type":"error"');
    });
  });

  describe("message persistence", () => {
    it("should persist both user and assistant messages", async () => {
      const mockGroqClient = (await import("../services/chat/groqClient.js"))
        .default;
      mockGroqClient.chat.completions.create = jest.fn().mockResolvedValue({
        choices: [{ message: { content: "Reply!", tool_calls: null } }],
      });

      await runChatPipeline({
        userId: "user1",
        sessionId: "sess-persist",
        message: "test message",
        cartItems: [],
        attachments: [],
        emit: null,
      });

      expect(mockAppendMessages).toHaveBeenCalledWith(
        expect.objectContaining({
          sessionId: "sess-persist",
          userId: "user1",
          messages: expect.arrayContaining([
            expect.objectContaining({ role: "user", content: "test message" }),
            expect.objectContaining({ role: "assistant", content: "Reply!" }),
          ]),
        })
      );
    });

    it("should persist only user message on fallback", async () => {
      const mockGroqClient = (await import("../services/chat/groqClient.js"))
        .default;
      mockGroqClient.chat.completions.create = jest
        .fn()
        .mockRejectedValue(new Error("fail"));

      await runChatPipeline({
        userId: "user1",
        sessionId: "sess-fallback-persist",
        message: "test",
        cartItems: [],
        attachments: [],
        emit: null,
      });

      // On fallback, only user message is persisted
      expect(mockAppendMessages).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({ role: "user" }),
          ]),
        })
      );

      // Should NOT contain an assistant message in the fallback persist call
      const persistCall = mockAppendMessages.mock.calls[0][0];
      const hasAssistant = persistCall.messages.some(
        (m) => m.role === "assistant"
      );
      expect(hasAssistant).toBe(false);
    });
  });
});
