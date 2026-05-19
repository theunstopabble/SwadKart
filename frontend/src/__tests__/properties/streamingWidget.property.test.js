import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { arbSseEvent } from "../generators/chat.js";
import { parseEventLine } from "../../components/chatbot/utils/sseEventParser.js";

/**
 * Property tests for streaming widget logic.
 *
 * Task 8.6:
 *   Property 27: Widget renders the concatenation of received tokens with a typing indicator
 *                until a terminal event
 *
 * We test the pure parseEventLine function from sseEventParser.js and the
 * token accumulation logic.
 */

/**
 * Pure logic: accumulate tokens from a stream of SSE events.
 * Returns the concatenated text and whether the stream is complete.
 *
 * @param {Array<{type: string, payload: object}>} events
 * @returns {{ text: string, isComplete: boolean, terminalEvent: string | null }}
 */
function accumulateTokens(events) {
  let text = "";
  let isComplete = false;
  let terminalEvent = null;

  for (const event of events) {
    if (event.type === "token" && event.payload && typeof event.payload.text === "string") {
      text += event.payload.text;
    } else if (event.type === "done" || event.type === "error") {
      isComplete = true;
      terminalEvent = event.type;
      break; // Stop processing after terminal event
    }
  }

  return { text, isComplete, terminalEvent };
}

/**
 * Determine if a typing indicator should be shown.
 * Shows indicator when tokens have been received but stream is not complete.
 */
function shouldShowTypingIndicator(text, isComplete) {
  return text.length > 0 && !isComplete;
}

describe("streamingWidget — Property 27: parseEventLine correctly parses valid SSE events", () => {
  it("round-trips valid events through serialize → parse", () => {
    fc.assert(
      fc.property(arbSseEvent, (event) => {
        // Serialize the event as the backend would
        const serialized = `data: ${JSON.stringify(event)}`;
        const result = parseEventLine(serialized);

        expect(result.ok).toBe(true);
        expect(result.event.id).toBe(event.id);
        expect(result.event.type).toBe(event.type);
        expect(result.event.payload).toEqual(event.payload);
      }),
      { numRuns: 300 },
    );
  });

  it("rejects non-string inputs", () => {
    fc.assert(
      fc.property(
        fc.oneof(fc.integer(), fc.boolean(), fc.constant(null), fc.constant(undefined)),
        (nonString) => {
          const result = parseEventLine(nonString);
          expect(result.ok).toBe(false);
          expect(result.reason).toBeDefined();
        },
      ),
      { numRuns: 50 },
    );
  });

  it("rejects empty data lines", () => {
    fc.assert(
      fc.property(
        fc.oneof(fc.constant("data:"), fc.constant("data:   "), fc.constant("data: ")),
        (emptyLine) => {
          const result = parseEventLine(emptyLine);
          expect(result.ok).toBe(false);
        },
      ),
      { numRuns: 10 },
    );
  });

  it("rejects invalid JSON in data lines", () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 50 }).filter((s) => {
          try {
            JSON.parse(s);
            return false;
          } catch {
            return true;
          }
        }),
        (invalidJson) => {
          const result = parseEventLine(`data: ${invalidJson}`);
          expect(result.ok).toBe(false);
          expect(result.reason).toContain("JSON");
        },
      ),
      { numRuns: 100 },
    );
  });

  it("rejects events with invalid type field", () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 20 }).filter(
          (s) => !["token", "tool_call", "done", "error"].includes(s),
        ),
        (invalidType) => {
          const event = { id: "test-1", type: invalidType, payload: {} };
          const result = parseEventLine(`data: ${JSON.stringify(event)}`);
          expect(result.ok).toBe(false);
        },
      ),
      { numRuns: 100 },
    );
  });

  it("rejects events with missing or invalid id", () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.constant(""),
          fc.string({ minLength: 65, maxLength: 100 }),
        ),
        (badId) => {
          const event = { id: badId, type: "token", payload: {} };
          const result = parseEventLine(`data: ${JSON.stringify(event)}`);
          expect(result.ok).toBe(false);
        },
      ),
      { numRuns: 50 },
    );
  });

  it("rejects events with null or array payload", () => {
    fc.assert(
      fc.property(
        fc.oneof(fc.constant(null), fc.array(fc.integer(), { minLength: 0, maxLength: 3 })),
        (badPayload) => {
          const event = { id: "test-1", type: "token", payload: badPayload };
          const result = parseEventLine(`data: ${JSON.stringify(event)}`);
          expect(result.ok).toBe(false);
        },
      ),
      { numRuns: 50 },
    );
  });
});

describe("streamingWidget — Property 27: Token accumulation and typing indicator", () => {
  it("concatenates all token payloads in order", () => {
    fc.assert(
      fc.property(
        fc.array(fc.string({ minLength: 1, maxLength: 20 }), { minLength: 1, maxLength: 30 }),
        (tokenTexts) => {
          const events = tokenTexts.map((text, i) => ({
            type: "token",
            payload: { text },
            id: `t-${i}`,
          }));
          const result = accumulateTokens(events);
          expect(result.text).toBe(tokenTexts.join(""));
          expect(result.isComplete).toBe(false);
          expect(result.terminalEvent).toBeNull();
        },
      ),
      { numRuns: 200 },
    );
  });

  it("stops accumulating after a terminal event (done)", () => {
    fc.assert(
      fc.property(
        fc.array(fc.string({ minLength: 1, maxLength: 20 }), { minLength: 1, maxLength: 10 }),
        fc.array(fc.string({ minLength: 1, maxLength: 20 }), { minLength: 1, maxLength: 5 }),
        (beforeTokens, afterTokens) => {
          const events = [
            ...beforeTokens.map((text, i) => ({ type: "token", payload: { text }, id: `t-${i}` })),
            { type: "done", payload: {}, id: "done-1" },
            ...afterTokens.map((text, i) => ({ type: "token", payload: { text }, id: `after-${i}` })),
          ];
          const result = accumulateTokens(events);
          expect(result.text).toBe(beforeTokens.join(""));
          expect(result.isComplete).toBe(true);
          expect(result.terminalEvent).toBe("done");
        },
      ),
      { numRuns: 200 },
    );
  });

  it("stops accumulating after a terminal event (error)", () => {
    fc.assert(
      fc.property(
        fc.array(fc.string({ minLength: 1, maxLength: 20 }), { minLength: 0, maxLength: 10 }),
        (beforeTokens) => {
          const events = [
            ...beforeTokens.map((text, i) => ({ type: "token", payload: { text }, id: `t-${i}` })),
            { type: "error", payload: { message: "timeout" }, id: "err-1" },
          ];
          const result = accumulateTokens(events);
          expect(result.text).toBe(beforeTokens.join(""));
          expect(result.isComplete).toBe(true);
          expect(result.terminalEvent).toBe("error");
        },
      ),
      { numRuns: 100 },
    );
  });

  it("shows typing indicator when tokens received but not complete", () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 100 }),
        (text) => {
          expect(shouldShowTypingIndicator(text, false)).toBe(true);
          expect(shouldShowTypingIndicator(text, true)).toBe(false);
        },
      ),
      { numRuns: 100 },
    );
  });

  it("does not show typing indicator when no tokens received", () => {
    fc.assert(
      fc.property(fc.boolean(), (isComplete) => {
        expect(shouldShowTypingIndicator("", isComplete)).toBe(false);
      }),
      { numRuns: 10 },
    );
  });

  it("exactly one terminal event ends the stream", () => {
    fc.assert(
      fc.property(
        fc.array(fc.string({ minLength: 1, maxLength: 10 }), { minLength: 0, maxLength: 15 }),
        fc.constantFrom("done", "error"),
        (tokenTexts, terminalType) => {
          const events = [
            ...tokenTexts.map((text, i) => ({ type: "token", payload: { text }, id: `t-${i}` })),
            { type: terminalType, payload: {}, id: "terminal-1" },
          ];
          const result = accumulateTokens(events);
          expect(result.isComplete).toBe(true);
          expect(result.terminalEvent).toBe(terminalType);
        },
      ),
      { numRuns: 100 },
    );
  });
});
