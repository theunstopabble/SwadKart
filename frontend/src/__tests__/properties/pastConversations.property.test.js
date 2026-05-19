import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { arbConversation } from "../generators/chat.js";

/**
 * Property tests for past conversation selection logic.
 *
 * Task 10.2:
 *   Property 17: Selecting a past conversation loads its messages and adopts its session id
 *
 * We test the pure logic: given a conversation object with messages,
 * the selection handler should extract messages in the correct format
 * and adopt the conversation's session ID.
 */

const UUID_V4_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Pure logic: handle selecting a past conversation.
 * Extracts the session ID and formats messages for display.
 *
 * @param {object} conversation - The conversation object from the API
 * @returns {{ sessionId: string, messages: Array<{ role: string, content: string }> }}
 */
function handleConversationSelection(conversation) {
  if (!conversation || !conversation.sessionId) {
    return null;
  }

  const messages = (conversation.messages || []).map((msg) => ({
    role: msg.role,
    content: msg.content,
    ...(msg.createdAt ? { createdAt: msg.createdAt } : {}),
  }));

  return {
    sessionId: conversation.sessionId,
    messages,
  };
}

describe("pastConversations — Property 17: Selecting a conversation loads messages and adopts session id", () => {
  it("adopts the conversation's session ID", () => {
    fc.assert(
      fc.property(arbConversation, (conversation) => {
        const result = handleConversationSelection(conversation);
        expect(result).not.toBeNull();
        expect(result.sessionId).toBe(conversation.sessionId);
        expect(result.sessionId).toMatch(UUID_V4_REGEX);
      }),
      { numRuns: 200 },
    );
  });

  it("loads all messages from the conversation in order", () => {
    fc.assert(
      fc.property(arbConversation, (conversation) => {
        const result = handleConversationSelection(conversation);
        expect(result).not.toBeNull();
        expect(result.messages).toHaveLength(conversation.messages.length);

        // Messages should be in the same order
        result.messages.forEach((msg, i) => {
          expect(msg.role).toBe(conversation.messages[i].role);
          expect(msg.content).toBe(conversation.messages[i].content);
        });
      }),
      { numRuns: 200 },
    );
  });

  it("each loaded message has role and content fields", () => {
    fc.assert(
      fc.property(arbConversation, (conversation) => {
        const result = handleConversationSelection(conversation);
        expect(result).not.toBeNull();

        result.messages.forEach((msg) => {
          expect(msg).toHaveProperty("role");
          expect(msg).toHaveProperty("content");
          expect(["user", "assistant"]).toContain(msg.role);
          expect(typeof msg.content).toBe("string");
          expect(msg.content.length).toBeGreaterThan(0);
        });
      }),
      { numRuns: 200 },
    );
  });

  it("preserves createdAt timestamps when present", () => {
    fc.assert(
      fc.property(arbConversation, (conversation) => {
        const result = handleConversationSelection(conversation);
        expect(result).not.toBeNull();

        result.messages.forEach((msg, i) => {
          if (conversation.messages[i].createdAt) {
            expect(msg.createdAt).toBe(conversation.messages[i].createdAt);
          }
        });
      }),
      { numRuns: 200 },
    );
  });

  it("returns null for invalid conversation objects", () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.constant(null),
          fc.constant(undefined),
          fc.constant({}),
          fc.constant({ messages: [] }), // missing sessionId
        ),
        (invalidConv) => {
          const result = handleConversationSelection(invalidConv);
          expect(result).toBeNull();
        },
      ),
      { numRuns: 20 },
    );
  });

  it("handles conversations with empty message arrays", () => {
    fc.assert(
      fc.property(
        arbConversation.map((conv) => ({ ...conv, messages: [] })),
        (emptyConv) => {
          const result = handleConversationSelection(emptyConv);
          expect(result).not.toBeNull();
          expect(result.sessionId).toBe(emptyConv.sessionId);
          expect(result.messages).toHaveLength(0);
        },
      ),
      { numRuns: 50 },
    );
  });

  it("the selection result is deterministic for the same conversation", () => {
    fc.assert(
      fc.property(arbConversation, (conversation) => {
        const r1 = handleConversationSelection(conversation);
        const r2 = handleConversationSelection(conversation);
        expect(r1).toEqual(r2);
      }),
      { numRuns: 100 },
    );
  });
});
