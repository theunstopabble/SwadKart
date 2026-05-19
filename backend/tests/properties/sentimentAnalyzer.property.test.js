/**
 * Property 19: Sentiment score is always clamped into [-1.0, 1.0].
 *
 * **Validates: Requirements 8.3, 8.4**
 *
 * Properties tested:
 * - For any arbitrary value, clampSentiment(value) always returns a number in [-1.0, 1.0]
 * - Non-numeric inputs always return 0.0
 * - Numbers within [-1, 1] are returned unchanged
 * - Numbers outside [-1, 1] are clamped to the boundary
 */
import fc from "fast-check";
import { clampSentiment } from "../../services/chat/sentimentAnalyzer.js";
import { arbSentimentRaw } from "../generators/chat.js";

describe("Property 19: Sentiment score is always clamped into [-1.0, 1.0]", () => {
  test("clampSentiment always returns a finite number in [-1.0, 1.0] for any input", () => {
    fc.assert(
      fc.property(arbSentimentRaw, (value) => {
        const result = clampSentiment(value);

        expect(typeof result).toBe("number");
        expect(Number.isFinite(result)).toBe(true);
        expect(result).toBeGreaterThanOrEqual(-1.0);
        expect(result).toBeLessThanOrEqual(1.0);
      }),
      { numRuns: 500 }
    );
  });

  test("non-numeric inputs always return 0.0", () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.string(),
          fc.constant(null),
          fc.constant(undefined),
          fc.constant({}),
          fc.constant([]),
          fc.boolean(),
          fc.constant(NaN)
        ),
        (value) => {
          const result = clampSentiment(value);
          expect(result).toBe(0.0);
        }
      ),
      { numRuns: 100 }
    );
  });

  test("numbers within [-1, 1] are returned unchanged", () => {
    fc.assert(
      fc.property(
        fc.double({ min: -1.0, max: 1.0, noNaN: true }),
        (value) => {
          // Skip ±Infinity (shouldn't be generated with these constraints, but guard)
          if (!Number.isFinite(value)) return;

          const result = clampSentiment(value);
          expect(result).toBe(value);
        }
      ),
      { numRuns: 200 }
    );
  });

  test("numbers greater than 1 are clamped to 1.0", () => {
    fc.assert(
      fc.property(
        fc.double({ min: 1.0000001, max: 1e10, noNaN: true }).filter(Number.isFinite),
        (value) => {
          const result = clampSentiment(value);
          expect(result).toBe(1.0);
        }
      ),
      { numRuns: 100 }
    );
  });

  test("numbers less than -1 are clamped to -1.0", () => {
    fc.assert(
      fc.property(
        fc.double({ min: -1e10, max: -1.0000001, noNaN: true }).filter(Number.isFinite),
        (value) => {
          const result = clampSentiment(value);
          expect(result).toBe(-1.0);
        }
      ),
      { numRuns: 100 }
    );
  });

  test("Infinity is clamped to 1.0", () => {
    expect(clampSentiment(Infinity)).toBe(1.0);
  });

  test("-Infinity is clamped to -1.0", () => {
    expect(clampSentiment(-Infinity)).toBe(-1.0);
  });

  test("NaN returns 0.0", () => {
    expect(clampSentiment(NaN)).toBe(0.0);
  });
});
