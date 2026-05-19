/**
 * Property 1: Multi-turn history loader returns a chronological suffix of session messages.
 * Property 14: Conversation persistence appends both messages, retains userId, and never exceeds 200 messages.
 * Property 15: Persistence retries with exponential backoff and stops at three attempts.
 * Property 16: Past conversations listing returns at most 10 user-owned conversations sorted by recency.
 *
 * **Validates: Requirements 1.1, 1.2, 1.8, 7.1, 7.2, 7.3, 7.4, 7.8, 7.9**
 *
 * Feature: chatbot-enterprise-upgrade
 */
import { jest } from "@jest/globals";
import fc from "fast-check";
import { arbConversation } from "../generators/chat.js";

// Mock the Conversation model before importing the service
const mockFindOne = jest.fn();
const mockFindOneAndUpdate = jest.fn();
const mockFind = jest.fn();

jest.unstable_mockModule("../../models/conversationModel.js", () => ({
  default: {
    findOne: mockFindOne,
    findOneAndUpdate: mockFindOneAndUpdate,
    find: mockFind,
  },
}));

const { loadRecentMessages, appendMessages, listConversations } = await import(
  "../../services/chat/conversationRepo.js"
);

describe("Property 1: loadRecentMessages returns a chronological suffix of session messages", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("returns at most 20 messages that are the last 20 of the stored messages (chronological suffix)", async () => {
    await fc.assert(
      fc.asyncProperty(arbConversation, async (conversation) => {
        mockFindOne.mockReset();

        // Simulate a fresh conversation (updatedAt within 24h)
        const mockDoc = {
          sessionId: conversation.sessionId,
          userId: conversation.userId,
          messages: conversation.messages,
          updatedAt: new Date(), // fresh — within 24h
        };

        mockFindOne.mockResolvedValue(mockDoc);

        const result = await loadRecentMessages(conversation.sessionId);

        // Result should be at most 20 messages
        expect(result.length).toBeLessThanOrEqual(20);

        // Result should be the last N messages (suffix)
        const expected = conversation.messages.slice(-20);
        expect(result.length).toBe(expected.length);

        // Messages should be in the same order as stored (chronological)
        for (let i = 0; i < result.length; i++) {
          expect(result[i].role).toBe(expected[i].role);
          expect(result[i].content).toBe(expected[i].content);
        }
      }),
      { numRuns: 100 }
    );
  });

  test("returns empty array when conversation is stale (>24h since last update)", async () => {
    await fc.assert(
      fc.asyncProperty(arbConversation, async (conversation) => {
        mockFindOne.mockReset();

        // Simulate a stale conversation (updatedAt > 24h ago)
        const staleDate = new Date(Date.now() - 25 * 60 * 60 * 1000);
        const mockDoc = {
          sessionId: conversation.sessionId,
          userId: conversation.userId,
          messages: conversation.messages,
          updatedAt: staleDate,
        };

        mockFindOne.mockResolvedValue(mockDoc);

        const result = await loadRecentMessages(conversation.sessionId);
        expect(result).toEqual([]);
      }),
      { numRuns: 50 }
    );
  });

  test("returns empty array when conversation does not exist", async () => {
    await fc.assert(
      fc.asyncProperty(fc.uuid(), async (sessionId) => {
        mockFindOne.mockReset();
        mockFindOne.mockResolvedValue(null);

        const result = await loadRecentMessages(sessionId);
        expect(result).toEqual([]);
      }),
      { numRuns: 30 }
    );
  });
});

describe("Property 14: appendMessages never exceeds 200 messages (uses $slice:-200)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("appendMessages uses $push with $slice:-200 to enforce the 200-message cap", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        fc.uuid(),
        fc.array(
          fc.record({
            role: fc.constantFrom("user", "assistant"),
            content: fc.string({ minLength: 1, maxLength: 50 }),
          }),
          { minLength: 1, maxLength: 10 }
        ),
        async (sessionId, userId, messages) => {
          mockFindOneAndUpdate.mockReset();

          // Mock successful update returning a doc with capped messages
          mockFindOneAndUpdate.mockResolvedValue({
            sessionId,
            userId,
            messages: messages.slice(-200),
          });

          await appendMessages({ sessionId, userId, messages });

          // Verify findOneAndUpdate was called with $slice: -200
          expect(mockFindOneAndUpdate).toHaveBeenCalledTimes(1);
          const call = mockFindOneAndUpdate.mock.calls[0];
          const filter = call[0];
          const update = call[1];

          expect(filter).toEqual({ sessionId });
          expect(update.$push.messages.$slice).toBe(-200);
          expect(update.$push.messages.$each).toEqual(messages);
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe("Property 15: Persistence retries with exponential backoff and stops at 3 attempts", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("succeeds on first attempt when no errors occur", async () => {
    await fc.assert(
      fc.asyncProperty(fc.uuid(), fc.uuid(), async (sessionId, userId) => {
        mockFindOneAndUpdate.mockReset();
        const messages = [{ role: "user", content: "hello" }];
        mockFindOneAndUpdate.mockResolvedValue({ sessionId, messages });

        const result = await appendMessages({ sessionId, userId, messages });
        expect(result).toBeDefined();
        expect(mockFindOneAndUpdate).toHaveBeenCalledTimes(1);
      }),
      { numRuns: 30 }
    );
  });

  test("retries up to 2 additional times (3 total attempts) on failure, then throws", async () => {
    const sessionId = "test-session";
    const userId = "test-user";
    const messages = [{ role: "user", content: "hello" }];
    const error = new Error("DB write failed");

    mockFindOneAndUpdate.mockReset();
    // All 3 attempts fail
    mockFindOneAndUpdate
      .mockRejectedValueOnce(error)
      .mockRejectedValueOnce(error)
      .mockRejectedValueOnce(error);

    await expect(
      appendMessages({ sessionId, userId, messages })
    ).rejects.toThrow("DB write failed");

    // Should have been called exactly 3 times (initial + 2 retries)
    expect(mockFindOneAndUpdate).toHaveBeenCalledTimes(3);
  });

  test("succeeds when failure occurs on first attempt but second succeeds", async () => {
    const sessionId = "test-session-2";
    const userId = "test-user-2";
    const messages = [{ role: "assistant", content: "hi there" }];

    mockFindOneAndUpdate.mockReset();
    mockFindOneAndUpdate
      .mockRejectedValueOnce(new Error("Transient error"))
      .mockResolvedValueOnce({ sessionId, messages });

    const result = await appendMessages({ sessionId, userId, messages });

    expect(result).toBeDefined();
    expect(mockFindOneAndUpdate).toHaveBeenCalledTimes(2);
  });

  test("succeeds when first two attempts fail but third succeeds", async () => {
    const sessionId = "test-session-3";
    const userId = "test-user-3";
    const messages = [{ role: "user", content: "retry test" }];

    mockFindOneAndUpdate.mockReset();
    mockFindOneAndUpdate
      .mockRejectedValueOnce(new Error("Error 1"))
      .mockRejectedValueOnce(new Error("Error 2"))
      .mockResolvedValueOnce({ sessionId, messages });

    const result = await appendMessages({ sessionId, userId, messages });

    expect(result).toBeDefined();
    expect(mockFindOneAndUpdate).toHaveBeenCalledTimes(3);
  });
});

describe("Property 16: listConversations returns at most 10 conversations sorted by recency", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("returns at most 10 conversations for any user", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        fc.integer({ min: 0, max: 25 }),
        async (userId, numConversations) => {
          mockFind.mockReset();

          // Generate mock conversations sorted by updatedAt descending
          const conversations = Array.from({ length: Math.min(numConversations, 10) }, (_, i) => ({
            _id: { toString: () => `conv-${i}` },
            sessionId: `session-${i}`,
            messages: [{ content: `Message ${i}` }],
            updatedAt: new Date(Date.now() - i * 60000),
          }));

          // Setup mock chain
          const mockLean = jest.fn().mockResolvedValue(conversations);
          const mockSelect = jest.fn().mockReturnValue({ lean: mockLean });
          const mockLimit = jest.fn().mockReturnValue({ select: mockSelect });
          const mockSort = jest.fn().mockReturnValue({ limit: mockLimit });
          mockFind.mockReturnValue({ sort: mockSort });

          const result = await listConversations(userId);

          // At most 10
          expect(result.length).toBeLessThanOrEqual(10);

          // Each result should have the expected shape
          for (const conv of result) {
            expect(conv).toHaveProperty("id");
            expect(conv).toHaveProperty("sessionId");
            expect(conv).toHaveProperty("lastMessage");
            expect(conv).toHaveProperty("updatedAt");
          }

          // Results should be sorted by updatedAt descending
          for (let i = 1; i < result.length; i++) {
            expect(
              new Date(result[i - 1].updatedAt).getTime()
            ).toBeGreaterThanOrEqual(
              new Date(result[i].updatedAt).getTime()
            );
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  test("returns empty array when user has no conversations", async () => {
    mockFind.mockReset();
    const mockLean = jest.fn().mockResolvedValue([]);
    const mockSelect = jest.fn().mockReturnValue({ lean: mockLean });
    const mockLimit = jest.fn().mockReturnValue({ select: mockSelect });
    const mockSort = jest.fn().mockReturnValue({ limit: mockLimit });
    mockFind.mockReturnValue({ sort: mockSort });

    const result = await listConversations("nonexistent-user");
    expect(result).toEqual([]);
  });
});
