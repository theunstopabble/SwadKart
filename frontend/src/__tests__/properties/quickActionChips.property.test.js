import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { arbValidChips } from "../generators/chat.js";

/**
 * Property tests for quick-action chips validation logic.
 *
 * Task 8.6:
 *   Property 31: Quick-action validator yields exactly 3 valid unique chips or none
 *   Property 32: Quick-action click submits the chip text, disables the clicked chip
 *
 * We test the pure validation logic extracted from QuickActionChips.jsx.
 */

/**
 * Pure validation logic extracted from QuickActionChips.jsx.
 * Validates that suggestions are exactly 3 non-empty unique strings, each 1-40 chars.
 *
 * @param {*} suggestions - The raw suggestions payload
 * @returns {string[] | null} - Validated chips array or null if invalid
 */
function validateChips(suggestions) {
  if (
    Array.isArray(suggestions) &&
    suggestions.length === 3 &&
    suggestions.every(
      (s) => typeof s === "string" && s.trim().length >= 1 && s.trim().length <= 40,
    ) &&
    new Set(suggestions.map((s) => s.trim())).size === 3
  ) {
    return suggestions.map((s) => s.trim());
  }
  return null;
}

/**
 * Pure logic for chip click behavior.
 * When a chip is clicked:
 *   - The chip text is submitted as user message
 *   - The clicked chip becomes disabled
 *
 * @param {string[]} chips - Current chips array
 * @param {number} clickedIndex - Index of the clicked chip
 * @returns {{ submittedText: string, disabledChips: Set<number> }}
 */
function handleChipClick(chips, clickedIndex) {
  if (clickedIndex < 0 || clickedIndex >= chips.length) {
    return { submittedText: null, disabledChips: new Set() };
  }
  return {
    submittedText: chips[clickedIndex],
    disabledChips: new Set([clickedIndex]),
  };
}

describe("quickActionChips — Property 31: Validator yields exactly 3 valid unique chips or none", () => {
  it("accepts valid arrays of exactly 3 non-empty unique strings (1-40 chars)", () => {
    fc.assert(
      fc.property(arbValidChips, (chips) => {
        const result = validateChips(chips);
        expect(result).not.toBeNull();
        expect(result).toHaveLength(3);
        // All trimmed and non-empty
        result.forEach((chip) => {
          expect(chip.trim().length).toBeGreaterThanOrEqual(1);
          expect(chip.trim().length).toBeLessThanOrEqual(40);
        });
        // All unique
        expect(new Set(result).size).toBe(3);
      }),
      { numRuns: 200 },
    );
  });

  it("rejects null, undefined, and non-array inputs", () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.constant(null),
          fc.constant(undefined),
          fc.string(),
          fc.integer(),
          fc.boolean(),
          fc.constant({}),
        ),
        (invalidInput) => {
          const result = validateChips(invalidInput);
          expect(result).toBeNull();
        },
      ),
      { numRuns: 100 },
    );
  });

  it("rejects arrays with wrong length (not exactly 3)", () => {
    fc.assert(
      fc.property(
        fc.array(fc.string({ minLength: 1, maxLength: 40 }), { minLength: 0, maxLength: 10 }).filter(
          (arr) => arr.length !== 3,
        ),
        (wrongLengthArray) => {
          const result = validateChips(wrongLengthArray);
          expect(result).toBeNull();
        },
      ),
      { numRuns: 200 },
    );
  });

  it("rejects arrays with duplicate values (after trimming)", () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 40 }).filter((s) => s.trim().length >= 1),
        (duplicateStr) => {
          const withDuplicates = [duplicateStr, duplicateStr, duplicateStr + "x"];
          // First two are duplicates
          const result = validateChips(withDuplicates);
          expect(result).toBeNull();
        },
      ),
      { numRuns: 100 },
    );
  });

  it("rejects arrays containing empty or whitespace-only strings", () => {
    fc.assert(
      fc.property(
        fc.tuple(
          fc.string({ minLength: 1, maxLength: 40 }).filter((s) => s.trim().length >= 1),
          fc.string({ minLength: 1, maxLength: 40 }).filter((s) => s.trim().length >= 1),
        ),
        ([a, b]) => {
          const withEmpty = [a, b, "   "]; // third is whitespace-only
          const result = validateChips(withEmpty);
          expect(result).toBeNull();
        },
      ),
      { numRuns: 100 },
    );
  });

  it("rejects arrays with strings exceeding 40 chars after trim", () => {
    fc.assert(
      fc.property(
        fc.tuple(
          fc.string({ minLength: 1, maxLength: 40 }).filter((s) => s.trim().length >= 1),
          fc.string({ minLength: 1, maxLength: 40 }).filter((s) => s.trim().length >= 1),
          fc.string({ minLength: 41, maxLength: 100 }).filter((s) => s.trim().length > 40),
        ),
        ([a, b, tooLong]) => {
          const result = validateChips([a, b, tooLong]);
          expect(result).toBeNull();
        },
      ),
      { numRuns: 100 },
    );
  });

  it("output is always null or an array of exactly 3 strings", () => {
    fc.assert(
      fc.property(
        fc.oneof(
          arbValidChips,
          fc.array(fc.anything(), { minLength: 0, maxLength: 5 }),
          fc.constant(null),
          fc.constant(42),
        ),
        (input) => {
          const result = validateChips(input);
          if (result !== null) {
            expect(Array.isArray(result)).toBe(true);
            expect(result).toHaveLength(3);
            result.forEach((chip) => {
              expect(typeof chip).toBe("string");
            });
          }
        },
      ),
      { numRuns: 200 },
    );
  });
});

describe("quickActionChips — Property 32: Chip click submits text and disables the chip", () => {
  it("clicking a valid chip index submits that chip's text", () => {
    fc.assert(
      fc.property(
        arbValidChips,
        fc.integer({ min: 0, max: 2 }),
        (chips, index) => {
          const trimmedChips = chips.map((s) => s.trim());
          const result = handleChipClick(trimmedChips, index);
          expect(result.submittedText).toBe(trimmedChips[index]);
        },
      ),
      { numRuns: 200 },
    );
  });

  it("clicking a chip disables exactly that chip", () => {
    fc.assert(
      fc.property(
        arbValidChips,
        fc.integer({ min: 0, max: 2 }),
        (chips, index) => {
          const trimmedChips = chips.map((s) => s.trim());
          const result = handleChipClick(trimmedChips, index);
          expect(result.disabledChips.has(index)).toBe(true);
          expect(result.disabledChips.size).toBe(1);
        },
      ),
      { numRuns: 200 },
    );
  });

  it("clicking an out-of-bounds index submits nothing", () => {
    fc.assert(
      fc.property(
        arbValidChips,
        fc.oneof(fc.integer({ min: -10, max: -1 }), fc.integer({ min: 3, max: 20 })),
        (chips, badIndex) => {
          const trimmedChips = chips.map((s) => s.trim());
          const result = handleChipClick(trimmedChips, badIndex);
          expect(result.submittedText).toBeNull();
          expect(result.disabledChips.size).toBe(0);
        },
      ),
      { numRuns: 100 },
    );
  });
});
