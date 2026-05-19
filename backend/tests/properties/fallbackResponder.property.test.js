/**
 * Property 29: Fallback response satisfies its content and persistence contract.
 *
 * **Validates: Requirements 12.3, 12.4, 12.5**
 *
 * Feature: chatbot-enterprise-upgrade
 *
 * For any language in SUPPORTED + arbitrary strings, buildFallback(language)
 * always returns { reply: string(≤500 chars), degraded: true }.
 * - reply is never empty
 * - degraded is always exactly true
 * - unrecognized languages fall back to English
 */
import fc from "fast-check";
import { buildFallback, STATIC } from "../../services/chat/fallbackResponder.js";

const SUPPORTED_LANGUAGES = [
  "English",
  "Hindi",
  "Hinglish",
  "Tamil",
  "Telugu",
  "Bengali",
  "Marathi",
];

describe("Property 29: Fallback response satisfies its content and persistence contract", () => {
  test("for any supported language, buildFallback returns { reply: string(≤500), degraded: true }", () => {
    fc.assert(
      fc.property(fc.constantFrom(...SUPPORTED_LANGUAGES), (language) => {
        const result = buildFallback(language);

        // reply must be a non-empty string
        expect(typeof result.reply).toBe("string");
        expect(result.reply.length).toBeGreaterThan(0);

        // reply must be at most 500 characters
        expect(result.reply.length).toBeLessThanOrEqual(500);

        // degraded must be exactly true
        expect(result.degraded).toBe(true);

        // reply should match the STATIC entry for that language
        expect(result.reply).toBe(STATIC[language]);
      }),
      { numRuns: 100 }
    );
  });

  test("for any arbitrary string (unsupported language), buildFallback falls back to English", () => {
    // Filter out Object.prototype method names that would resolve via prototype chain
    const protoKeys = Object.getOwnPropertyNames(Object.prototype);

    fc.assert(
      fc.property(
        fc.string({ minLength: 0, maxLength: 100 }).filter(
          (s) => !SUPPORTED_LANGUAGES.includes(s) && !protoKeys.includes(s)
        ),
        (language) => {
          const result = buildFallback(language);

          // reply must be a non-empty string
          expect(typeof result.reply).toBe("string");
          expect(result.reply.length).toBeGreaterThan(0);

          // reply must be at most 500 characters
          expect(result.reply.length).toBeLessThanOrEqual(500);

          // degraded must be exactly true
          expect(result.degraded).toBe(true);

          // Unrecognized languages should fall back to English
          expect(result.reply).toBe(STATIC.English);
        }
      ),
      { numRuns: 200 }
    );
  });

  test("degraded is always exactly boolean true, never truthy-but-not-true", () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.constantFrom(...SUPPORTED_LANGUAGES),
          fc.string({ minLength: 0, maxLength: 50 }),
          fc.constant(null),
          fc.constant(undefined),
          fc.constant(123),
          fc.constant(""),
          fc.constant("Klingon"),
          fc.constant("français")
        ),
        (language) => {
          const result = buildFallback(language);
          expect(result.degraded).toStrictEqual(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  test("reply is never empty for any input", () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.constantFrom(...SUPPORTED_LANGUAGES),
          fc.string({ minLength: 0, maxLength: 100 }),
          fc.constant(null),
          fc.constant(undefined),
          fc.integer()
        ),
        (language) => {
          const result = buildFallback(language);
          expect(result.reply.length).toBeGreaterThan(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  test("all STATIC entries are ≤500 characters", () => {
    for (const [lang, text] of Object.entries(STATIC)) {
      expect(text.length).toBeLessThanOrEqual(500);
      expect(text.length).toBeGreaterThan(0);
    }
  });
});
