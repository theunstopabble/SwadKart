/**
 * Property 2: Token budget always fits within 6000 tokens while preserving
 * system prompt and new user message.
 *
 * **Validates: Requirements 1.3, 1.4**
 *
 * Properties tested:
 * - For any arbitrary systemPrompt, history array, and newUserMessage,
 *   fitToBudget() always:
 *   - Returns messages array starting with system prompt and ending with user message
 *   - Total tokens ≤ 6000
 *   - dropped + kept.length === history.length
 *   - Messages are in chronological order
 */
import fc from "fast-check";
import { fitToBudget, countTokens } from "../../services/chat/tokenBudget.js";
import { arbHistory } from "../generators/chat.js";

const MAX_TOKENS = 6000;

// Generator for system prompts (short to medium length)
const arbSystemPrompt = fc.string({ minLength: 0, maxLength: 500 });

// Generator for user messages (short to medium length)
const arbUserMessage = fc.string({ minLength: 0, maxLength: 500 });

describe("Property 2: Token budget always fits within 6000 tokens while preserving system prompt and new user message", () => {
  test("messages array always starts with system prompt and ends with user message", () => {
    fc.assert(
      fc.property(arbSystemPrompt, arbHistory, arbUserMessage, (systemPrompt, history, newUserMessage) => {
        const result = fitToBudget({ systemPrompt, history, newUserMessage });

        // Must have at least 2 messages (system + user)
        expect(result.messages.length).toBeGreaterThanOrEqual(2);

        // First message is always the system prompt
        expect(result.messages[0].role).toBe("system");
        expect(result.messages[0].content).toBe(systemPrompt || "");

        // Last message is always the new user message
        const lastMsg = result.messages[result.messages.length - 1];
        expect(lastMsg.role).toBe("user");
        expect(lastMsg.content).toBe(newUserMessage || "");
      }),
      { numRuns: 150 }
    );
  });

  test("total tokens never exceed 6000 (unless system+user alone exceed it)", () => {
    fc.assert(
      fc.property(arbSystemPrompt, arbHistory, arbUserMessage, (systemPrompt, history, newUserMessage) => {
        const result = fitToBudget({ systemPrompt, history, newUserMessage });

        const systemTokens = countTokens(systemPrompt || "");
        const userTokens = countTokens(newUserMessage || "");
        const baseTokens = systemTokens + userTokens;

        if (baseTokens > MAX_TOKENS) {
          // When system + user alone exceed budget, only those two are returned
          expect(result.messages.length).toBe(2);
          expect(result.dropped).toBe(history.length);
        } else {
          // Otherwise total tokens must be ≤ 6000
          expect(result.totalTokens).toBeLessThanOrEqual(MAX_TOKENS);
        }
      }),
      { numRuns: 150 }
    );
  });

  test("dropped + kept history length === original history length", () => {
    fc.assert(
      fc.property(arbSystemPrompt, arbHistory, arbUserMessage, (systemPrompt, history, newUserMessage) => {
        const result = fitToBudget({ systemPrompt, history, newUserMessage });

        // Messages between system (first) and user (last) are the kept history
        const keptHistory = result.messages.slice(1, -1);
        const keptCount = keptHistory.length;

        expect(result.dropped + keptCount).toBe(history.length);
      }),
      { numRuns: 150 }
    );
  });

  test("kept history messages are in chronological order (suffix of original)", () => {
    fc.assert(
      fc.property(arbSystemPrompt, arbHistory, arbUserMessage, (systemPrompt, history, newUserMessage) => {
        const result = fitToBudget({ systemPrompt, history, newUserMessage });

        // Messages between system (first) and user (last) are the kept history
        const keptHistory = result.messages.slice(1, -1);

        if (keptHistory.length > 0 && history.length > 0) {
          // The kept messages should be a contiguous suffix of the original history
          const expectedSuffix = history.slice(history.length - keptHistory.length);
          for (let i = 0; i < keptHistory.length; i++) {
            expect(keptHistory[i].role).toBe(expectedSuffix[i].role);
            expect(keptHistory[i].content).toBe(expectedSuffix[i].content);
          }
        }
      }),
      { numRuns: 150 }
    );
  });

  test("empty history returns only system + user messages with dropped = 0", () => {
    fc.assert(
      fc.property(arbSystemPrompt, arbUserMessage, (systemPrompt, newUserMessage) => {
        const result = fitToBudget({ systemPrompt, history: [], newUserMessage });

        expect(result.messages.length).toBe(2);
        expect(result.dropped).toBe(0);
      }),
      { numRuns: 50 }
    );
  });
});
