/**
 * Shared fast-check generators for chatbot property tests.
 */
import fc from "fast-check";

// --- arbMessage ---
// Arbitrary string messages mixing Latin, Devanagari, Tamil, Telugu, Bengali chars + Hinglish keywords
const HINGLISH_WORDS = [
  "yaar", "bhai", "kya", "bindaas", "boss", "arre", "accha", "theek",
  "nahi", "haan", "kaise", "kaisa", "kahan", "abhi", "bahut",
];

const DEVANAGARI_CHARS = "अआइईउऊएऐओऔकखगघचछजझटठडढणतथदधनपफबभमयरलवशषसह";
const TAMIL_CHARS = "அஆஇஈஉஊஎஏஐஒஓஔகஙசஞடணதநபமயரலவழளறன";
const TELUGU_CHARS = "అఆఇఈఉఊఎఏఐఒఓఔకఖగఘచఛజఝటఠడఢణతథదధనపఫబభమయరలవశషసహ";
const BENGALI_CHARS = "অআইঈউঊএঐওঔকখগঘচছজঝটঠডঢণতথদধনপফবভমযরলশষসহ";

const arbLatinWord = fc
  .array(fc.constantFrom(..."abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ".split("")), { minLength: 1, maxLength: 10 })
  .map((chars) => chars.join(""));
const arbHinglishWord = fc.constantFrom(...HINGLISH_WORDS);

const arbDevanagariSegment = fc
  .array(fc.constantFrom(...DEVANAGARI_CHARS.split("")), { minLength: 1, maxLength: 8 })
  .map((chars) => chars.join(""));
const arbTamilSegment = fc
  .array(fc.constantFrom(...TAMIL_CHARS.split("")), { minLength: 1, maxLength: 8 })
  .map((chars) => chars.join(""));
const arbTeluguSegment = fc
  .array(fc.constantFrom(...TELUGU_CHARS.split("")), { minLength: 1, maxLength: 8 })
  .map((chars) => chars.join(""));
const arbBengaliSegment = fc
  .array(fc.constantFrom(...BENGALI_CHARS.split("")), { minLength: 1, maxLength: 8 })
  .map((chars) => chars.join(""));

const arbScriptSegment = fc.oneof(
  arbLatinWord,
  arbHinglishWord,
  arbDevanagariSegment,
  arbTamilSegment,
  arbTeluguSegment,
  arbBengaliSegment
);

/**
 * Arbitrary message string: mix of Latin, Devanagari, Tamil, Telugu, Bengali chars + Hinglish keywords.
 * Produces strings of 0 to ~100 characters.
 */
export const arbMessage = fc
  .array(arbScriptSegment, { minLength: 0, maxLength: 12 })
  .map((segments) => segments.join(" "));

// --- arbSseEvent ---
// Arbitrary valid SSE events { id: string(1-64), type: one of token|tool_call|done|error, payload: object }
const VALID_SSE_TYPES = ["token", "tool_call", "done", "error"];

const arbSseId = fc.string({ minLength: 1, maxLength: 64 }).filter((s) => s.length >= 1);
const arbSseType = fc.constantFrom(...VALID_SSE_TYPES);
const arbSsePayload = fc.dictionary(
  fc.string({ minLength: 1, maxLength: 10 }).filter((s) => /^[a-zA-Z_]/.test(s)),
  fc.oneof(fc.string(), fc.integer(), fc.boolean(), fc.constant(null)),
  { minKeys: 0, maxKeys: 5 }
);

/**
 * Arbitrary valid SSE event matching the wire schema.
 */
export const arbSseEvent = fc.record({
  id: arbSseId,
  type: arbSseType,
  payload: arbSsePayload,
});

// --- arbInvalidSseInput ---
// Arbitrary invalid SSE inputs (non-strings, empty, bad JSON, missing fields)
export const arbInvalidSseInput = fc.oneof(
  fc.constant(null),
  fc.constant(undefined),
  fc.constant(42),
  fc.constant({}),
  fc.constant([]),
  fc.constant(true),
  fc.constant(""),
  fc.constant("   "),
  fc.constant("data: not-json-at-all"),
  fc.constant("data: {broken json"),
  fc.constant('data: {"id":"x"}'),                    // missing type and payload
  fc.constant('data: {"type":"token"}'),              // missing id and payload
  fc.constant('data: {"id":"x","type":"bad","payload":{}}'), // invalid type
  fc.constant('data: {"id":"","type":"token","payload":{}}'), // empty id
  fc.string({ minLength: 1, maxLength: 50 }).filter(
    (s) => {
      try { const p = JSON.parse(s.replace(/^data:\s*/, "")); return !p || typeof p !== "object"; }
      catch { return true; }
    }
  )
);

// --- arbSentimentRaw ---
// Arbitrary values of any type (numbers, strings, null, undefined, NaN, Infinity, objects)
export const arbSentimentRaw = fc.oneof(
  fc.double({ min: -1e10, max: 1e10, noNaN: false }),
  fc.constant(NaN),
  fc.constant(Infinity),
  fc.constant(-Infinity),
  fc.constant(null),
  fc.constant(undefined),
  fc.string(),
  fc.constant({}),
  fc.constant([]),
  fc.boolean(),
  fc.integer({ min: -100, max: 100 }),
  fc.double({ min: -1.0, max: 1.0 })
);

// --- arbHistory ---
// Arbitrary arrays of { role: "user"|"assistant", content: string }
const arbRole = fc.constantFrom("user", "assistant");
const arbContent = fc.string({ minLength: 0, maxLength: 200 });

export const arbHistory = fc.array(
  fc.record({ role: arbRole, content: arbContent }),
  { minLength: 0, maxLength: 30 }
);

// --- arbProduct ---
// Arbitrary Product documents with varying fields for retrieval service testing
const HEX_CHARS = "0123456789abcdef".split("");
const arbHexId = fc
  .array(fc.constantFrom(...HEX_CHARS), { minLength: 24, maxLength: 24 })
  .map((chars) => chars.join(""));

export const arbProduct = fc.record({
  _id: arbHexId,
  name: fc.string({ minLength: 1, maxLength: 50 }).filter((s) => s.trim().length > 0),
  price: fc.double({ min: 0.01, max: 10000, noNaN: true }).filter(Number.isFinite),
  description: fc.string({ minLength: 0, maxLength: 300 }),
  countInStock: fc.integer({ min: 0, max: 100 }),
  isAvailable: fc.boolean(),
  numReviews: fc.integer({ min: 0, max: 1000 }),
});

// --- arbConversation ---
// Arbitrary Conversation documents with messages for conversation repo testing
const arbMessageRole = fc.constantFrom("user", "assistant");
const arbMessageContent = fc.string({ minLength: 1, maxLength: 100 }).filter((s) => s.trim().length > 0);
const arbCreatedAt = fc.date({ min: new Date("2024-01-01"), max: new Date("2025-12-31") });

const arbConversationMessage = fc.record({
  role: arbMessageRole,
  content: arbMessageContent,
  createdAt: arbCreatedAt,
});

export const arbConversation = fc.record({
  sessionId: fc.uuid(),
  userId: fc.uuid(),
  messages: fc.array(arbConversationMessage, { minLength: 0, maxLength: 50 }),
});
