/**
 * Property 37: SSE serializer and parser round-trip every valid event.
 *
 * **Validates: Requirements 16.1, 16.2, 16.3, 16.4, 16.5**
 *
 * Properties tested:
 * - For any valid event, parseEventLine(serializeEvent(event)) round-trips
 *   to the original event
 * - For any invalid input, parseEventLine(input) returns { ok: false, reason: string }
 * - serializeEvent throws on invalid events (bad id, bad type, null payload)
 */
import fc from "fast-check";
import { serializeEvent, parseEventLine } from "../../services/chat/sseSerializer.js";
import { arbSseEvent, arbInvalidSseInput } from "../generators/chat.js";

describe("Property 37: SSE serializer and parser round-trip every valid event", () => {
  test("parseEventLine(serializeEvent(event)) round-trips to the original event", () => {
    fc.assert(
      fc.property(arbSseEvent, (event) => {
        const serialized = serializeEvent(event);
        const parsed = parseEventLine(serialized);

        expect(parsed.ok).toBe(true);
        expect(parsed.event.id).toBe(event.id);
        expect(parsed.event.type).toBe(event.type);
        expect(parsed.event.payload).toEqual(event.payload);
      }),
      { numRuns: 200 }
    );
  });

  test("serializeEvent produces a string starting with 'data: ' and ending with double newline", () => {
    fc.assert(
      fc.property(arbSseEvent, (event) => {
        const serialized = serializeEvent(event);

        expect(typeof serialized).toBe("string");
        expect(serialized.startsWith("data: ")).toBe(true);
        expect(serialized.endsWith("\n\n")).toBe(true);
      }),
      { numRuns: 100 }
    );
  });

  test("parseEventLine returns { ok: false, reason: string } for invalid inputs", () => {
    fc.assert(
      fc.property(arbInvalidSseInput, (input) => {
        const result = parseEventLine(input);

        expect(result.ok).toBe(false);
        expect(typeof result.reason).toBe("string");
        expect(result.reason.length).toBeGreaterThan(0);
      }),
      { numRuns: 100 }
    );
  });

  test("serializeEvent throws on invalid events", () => {
    fc.assert(
      fc.property(
        fc.oneof(
          // bad id: empty string
          fc.record({
            id: fc.constant(""),
            type: fc.constantFrom("token", "tool_call", "done", "error"),
            payload: fc.constant({}),
          }),
          // bad id: too long (>64 chars)
          fc.record({
            id: fc.string({ minLength: 65, maxLength: 100 }),
            type: fc.constantFrom("token", "tool_call", "done", "error"),
            payload: fc.constant({}),
          }),
          // bad type
          fc.record({
            id: fc.string({ minLength: 1, maxLength: 10 }),
            type: fc.constantFrom("invalid", "bad_type", "stream", "message", ""),
            payload: fc.constant({}),
          }),
          // null payload
          fc.record({
            id: fc.string({ minLength: 1, maxLength: 10 }),
            type: fc.constantFrom("token", "tool_call", "done", "error"),
            payload: fc.constant(null),
          }),
          // array payload
          fc.record({
            id: fc.string({ minLength: 1, maxLength: 10 }),
            type: fc.constantFrom("token", "tool_call", "done", "error"),
            payload: fc.constant([1, 2, 3]),
          }),
          // non-object event
          fc.constant(null),
          fc.constant(42),
          fc.constant("string"),
          fc.constant(undefined)
        ),
        (invalidEvent) => {
          expect(() => serializeEvent(invalidEvent)).toThrow();
        }
      ),
      { numRuns: 100 }
    );
  });

  test("serialized event JSON contains exactly id, type, and payload fields", () => {
    fc.assert(
      fc.property(arbSseEvent, (event) => {
        const serialized = serializeEvent(event);
        const jsonStr = serialized.replace(/^data: /, "").trim();
        const parsed = JSON.parse(jsonStr);

        const keys = Object.keys(parsed).sort();
        expect(keys).toEqual(["id", "payload", "type"]);
      }),
      { numRuns: 100 }
    );
  });
});
