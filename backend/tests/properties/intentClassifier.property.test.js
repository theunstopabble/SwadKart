/**
 * Property 7: Intent classifier output is always a member of the Intent Set.
 *
 * Property 34: Intent cache key equals SHA-256 of the normalized message.
 *
 * **Validates: Requirements 3.3, 3.5, 15.3**
 *
 * Strategy:
 * - Mock redis: get returns null (cache miss), setEx is a no-op.
 * - Mock groq: returns a random INTENT_SET member to simulate LLM responses.
 * - Verify that classifyIntent always returns a valid INTENT_SET member
 *   regardless of what the LLM returns.
 * - Verify computeCacheKey matches SHA-256 of message.trim().toLowerCase().
 */

import fc from "fast-check";
import crypto from "crypto";
import {
  INTENT_SET,
  computeCacheKey,
  classifyIntent,
} from "../../services/chat/intentClassifier.js";
import { arbMessage } from "../generators/chat.js";

// --- Mock dependencies ---

/**
 * Create a mock redis that always returns null on get (cache miss)
 * and is a no-op on setEx.
 */
function createMockRedis() {
  return {
    get: () => Promise.resolve(null),
    setEx: () => Promise.resolve("OK"),
  };
}

/**
 * Create a mock groq that returns a specified label.
 */
function createMockGroq(responseLabel) {
  return {
    chat: {
      completions: {
        create: () =>
          Promise.resolve({
            choices: [
              {
                message: {
                  content: responseLabel,
                },
              },
            ],
          }),
      },
    },
  };
}

/**
 * Create a mock groq that always fails (simulates timeout/error).
 */
function createFailingGroq() {
  return {
    chat: {
      completions: {
        create: () => Promise.reject(new Error("Groq timeout")),
      },
    },
  };
}

describe("Property 7: Intent classifier output is always a member of the Intent Set", () => {
  test("for any arbitrary message, classifyIntent always returns a string in INTENT_SET when groq returns a valid label", async () => {
    await fc.assert(
      fc.asyncProperty(
        arbMessage,
        fc.constantFrom(...INTENT_SET),
        async (message, groqResponse) => {
          const redis = createMockRedis();
          const groq = createMockGroq(groqResponse);

          const result = await classifyIntent(message, { redis, groq });

          expect(typeof result).toBe("string");
          expect(INTENT_SET).toContain(result);
        }
      ),
      { numRuns: 100 }
    );
  });

  test("for any arbitrary message, classifyIntent returns 'unknown' when groq returns garbage", async () => {
    await fc.assert(
      fc.asyncProperty(
        arbMessage,
        fc.string({ minLength: 1, maxLength: 50 }).filter(
          (s) => !INTENT_SET.includes(s.trim().toLowerCase())
        ),
        async (message, garbageResponse) => {
          const redis = createMockRedis();
          const groq = createMockGroq(garbageResponse);

          const result = await classifyIntent(message, { redis, groq });

          expect(result).toBe("unknown");
        }
      ),
      { numRuns: 100 }
    );
  });

  test("for any arbitrary message, classifyIntent returns 'unknown' when groq fails", async () => {
    await fc.assert(
      fc.asyncProperty(arbMessage, async (message) => {
        const redis = createMockRedis();
        const groq = createFailingGroq();

        const result = await classifyIntent(message, { redis, groq });

        expect(result).toBe("unknown");
      }),
      { numRuns: 50 }
    );
  });

  test("classifyIntent normalizes case: uppercase INTENT_SET labels are recognized", async () => {
    await fc.assert(
      fc.asyncProperty(
        arbMessage,
        fc.constantFrom(...INTENT_SET),
        async (message, intent) => {
          const redis = createMockRedis();
          // Return the intent in uppercase with extra whitespace
          const groq = createMockGroq(`  ${intent.toUpperCase()}  `);

          const result = await classifyIntent(message, { redis, groq });

          expect(INTENT_SET).toContain(result);
          expect(result).toBe(intent);
        }
      ),
      { numRuns: 50 }
    );
  });

  test("classifyIntent returns cached value when redis has a valid cached intent", async () => {
    await fc.assert(
      fc.asyncProperty(
        arbMessage,
        fc.constantFrom(...INTENT_SET),
        async (message, cachedIntent) => {
          const redis = {
            get: () => Promise.resolve(cachedIntent),
            setEx: () => Promise.resolve("OK"),
          };
          // Groq should NOT be called when cache hits
          const groq = createMockGroq("this_should_not_be_used");

          const result = await classifyIntent(message, { redis, groq });

          expect(INTENT_SET).toContain(result);
          expect(result).toBe(cachedIntent);
        }
      ),
      { numRuns: 50 }
    );
  });
});

describe("Property 34: Intent cache key equals SHA-256 of the normalized message", () => {
  test("computeCacheKey(message) always equals SHA-256 of message.trim().toLowerCase()", () => {
    fc.assert(
      fc.property(fc.string({ minLength: 0, maxLength: 500 }), (message) => {
        const result = computeCacheKey(message);
        const expected = crypto
          .createHash("sha256")
          .update(message.trim().toLowerCase())
          .digest("hex");

        expect(result).toBe(expected);
      }),
      { numRuns: 200 }
    );
  });

  test("computeCacheKey is deterministic: same input always produces same output", () => {
    fc.assert(
      fc.property(arbMessage, (message) => {
        const result1 = computeCacheKey(message);
        const result2 = computeCacheKey(message);

        expect(result1).toBe(result2);
      }),
      { numRuns: 100 }
    );
  });

  test("computeCacheKey normalizes whitespace and case: padded inputs produce expected hash", () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 100 }),
        fc.constantFrom("", " ", "  ", "\t", "\n"),
        fc.constantFrom("", " ", "  ", "\t", "\n"),
        (core, prefix, suffix) => {
          const padded = prefix + core + suffix;
          const resultPadded = computeCacheKey(padded);

          // Both should produce the same hash since normalization is trim+lowercase
          const expectedHash = crypto
            .createHash("sha256")
            .update(padded.trim().toLowerCase())
            .digest("hex");

          expect(resultPadded).toBe(expectedHash);
        }
      ),
      { numRuns: 100 }
    );
  });

  test("computeCacheKey returns a valid 64-character hex string", () => {
    fc.assert(
      fc.property(arbMessage, (message) => {
        const result = computeCacheKey(message);

        expect(typeof result).toBe("string");
        expect(result).toHaveLength(64);
        expect(result).toMatch(/^[0-9a-f]{64}$/);
      }),
      { numRuns: 100 }
    );
  });
});
