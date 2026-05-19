import fc from "fast-check";

/**
 * Arbitrary viewport dimensions.
 * Width: 320–2560, Height: 300–1440
 */
export const arbViewport = fc.record({
  width: fc.integer({ min: 320, max: 2560 }),
  height: fc.integer({ min: 300, max: 1440 }),
});

/**
 * Arbitrary valid UUID v4 string.
 */
export const arbSessionId = fc.uuid().filter((id) => {
  // Ensure it matches UUID v4 format (version nibble = 4, variant = 8/9/a/b)
  return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
});

/**
 * Arbitrary transcript strings (0–200 chars) including empty and whitespace-only.
 */
export const arbTranscript = fc.oneof(
  fc.constant(""),
  fc.integer({ min: 1, max: 20 }).map((n) => " ".repeat(n)),
  fc.integer({ min: 1, max: 10 }).map((n) => "\t".repeat(n)),
  fc.integer({ min: 1, max: 5 }).map((n) => "\n".repeat(n)),
  fc.string({ minLength: 1, maxLength: 200 }),
);

/**
 * Arbitrary SSE event object conforming to the wire schema.
 */
export const arbSseEvent = fc.record({
  id: fc.string({ minLength: 1, maxLength: 64 }).filter((s) => s.trim().length > 0),
  type: fc.constantFrom("token", "tool_call", "done", "error"),
  payload: fc.dictionary(
    fc.string({ minLength: 1, maxLength: 20 }).filter((s) => /^[a-zA-Z_]\w*$/.test(s)),
    fc.oneof(fc.string({ maxLength: 50 }), fc.integer(), fc.boolean()),
    { minKeys: 0, maxKeys: 5 },
  ),
});

/**
 * Arbitrary conversation object with messages for past-conversation selection tests.
 */
export const arbConversation = fc.record({
  _id: fc.stringMatching(/^[0-9a-f]{24}$/),
  sessionId: arbSessionId,
  messages: fc.array(
    fc.record({
      role: fc.constantFrom("user", "assistant"),
      content: fc.string({ minLength: 1, maxLength: 200 }),
      createdAt: fc.integer({ min: 1704067200000, max: 1798761600000 }).map((ts) => new Date(ts).toISOString()),
    }),
    { minLength: 0, maxLength: 20 },
  ),
  updatedAt: fc.integer({ min: 1704067200000, max: 1798761600000 }).map((ts) => new Date(ts).toISOString()),
});

/**
 * Arbitrary quick-action chip arrays — both valid and invalid.
 */
export const arbValidChips = fc
  .array(fc.string({ minLength: 1, maxLength: 40 }).filter((s) => s.trim().length >= 1), {
    minLength: 3,
    maxLength: 3,
  })
  .filter((arr) => new Set(arr.map((s) => s.trim())).size === 3);

export const arbInvalidChips = fc.oneof(
  fc.constant(null),
  fc.constant(undefined),
  fc.constant([]),
  fc.array(fc.string({ minLength: 1, maxLength: 40 }), { minLength: 1, maxLength: 2 }),
  fc.array(fc.string({ minLength: 1, maxLength: 40 }), { minLength: 4, maxLength: 6 }),
  // Array of 3 but with duplicates
  fc.string({ minLength: 1, maxLength: 40 }).map((s) => [s, s, s + "x"]),
  // Array of 3 but with empty strings
  fc.tuple(
    fc.string({ minLength: 1, maxLength: 40 }),
    fc.string({ minLength: 1, maxLength: 40 }),
  ).map(([a, b]) => [a, b, ""]),
);
