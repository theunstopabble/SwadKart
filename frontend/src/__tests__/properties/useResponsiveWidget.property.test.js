import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { arbViewport } from "../generators/chat.js";
import { resolveLayout, isLandscapeConstrained } from "../../components/chatbot/hooks/useResponsiveWidget.js";

/**
 * Property tests for useResponsiveWidget pure functions.
 *
 * Task 8.2:
 *   Property 30: Responsive layout maps every viewport to its documented band
 *
 * Breakpoints:
 *   - width < 640 → "mobile"
 *   - 640 ≤ width < 1024 → "tablet"
 *   - width ≥ 1024 → "desktop"
 *
 * Landscape constraint:
 *   - height < 500 → true (constrained)
 *   - height ≥ 500 → false
 */

describe("useResponsiveWidget — Property 30: Responsive layout maps every viewport to its documented band", () => {
  it("resolveLayout returns 'mobile' for all widths < 640", () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 639 }), (width) => {
        expect(resolveLayout(width)).toBe("mobile");
      }),
      { numRuns: 200 },
    );
  });

  it("resolveLayout returns 'tablet' for all widths in [640, 1023]", () => {
    fc.assert(
      fc.property(fc.integer({ min: 640, max: 1023 }), (width) => {
        expect(resolveLayout(width)).toBe("tablet");
      }),
      { numRuns: 200 },
    );
  });

  it("resolveLayout returns 'desktop' for all widths >= 1024", () => {
    fc.assert(
      fc.property(fc.integer({ min: 1024, max: 5000 }), (width) => {
        expect(resolveLayout(width)).toBe("desktop");
      }),
      { numRuns: 200 },
    );
  });

  it("resolveLayout always returns one of the three documented bands for any viewport width", () => {
    fc.assert(
      fc.property(arbViewport, ({ width }) => {
        const layout = resolveLayout(width);
        expect(["mobile", "tablet", "desktop"]).toContain(layout);
      }),
      { numRuns: 500 },
    );
  });

  it("resolveLayout is consistent with breakpoint boundaries", () => {
    fc.assert(
      fc.property(arbViewport, ({ width }) => {
        const layout = resolveLayout(width);
        if (width < 640) {
          expect(layout).toBe("mobile");
        } else if (width < 1024) {
          expect(layout).toBe("tablet");
        } else {
          expect(layout).toBe("desktop");
        }
      }),
      { numRuns: 500 },
    );
  });

  it("isLandscapeConstrained returns true for height < 500", () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 499 }), (height) => {
        expect(isLandscapeConstrained(height)).toBe(true);
      }),
      { numRuns: 200 },
    );
  });

  it("isLandscapeConstrained returns false for height >= 500", () => {
    fc.assert(
      fc.property(fc.integer({ min: 500, max: 3000 }), (height) => {
        expect(isLandscapeConstrained(height)).toBe(false);
      }),
      { numRuns: 200 },
    );
  });

  it("isLandscapeConstrained is a boolean for any viewport height", () => {
    fc.assert(
      fc.property(arbViewport, ({ height }) => {
        const result = isLandscapeConstrained(height);
        expect(typeof result).toBe("boolean");
        if (height < 500) {
          expect(result).toBe(true);
        } else {
          expect(result).toBe(false);
        }
      }),
      { numRuns: 500 },
    );
  });
});
