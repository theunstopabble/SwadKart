/**
 * SSE Serializer — Pure Functions
 *
 * Wire schema (Requirement 16):
 *   id:      string, 1..64 chars, unique within stream
 *   type:    "token" | "tool_call" | "done" | "error"
 *   payload: object (always non-null, possibly empty)
 *
 * serializeEvent(event) → SSE-formatted string
 * parseEventLine(line)  → { ok: true, event } | { ok: false, reason }
 */

const VALID_TYPES = new Set(["token", "tool_call", "done", "error"]);
const MAX_BYTE_LENGTH = 65536;

/**
 * Validate an event object against the wire schema.
 * @param {object} event
 * @returns {{ valid: boolean, reason?: string }}
 */
function validateEvent(event) {
  if (!event || typeof event !== "object" || Array.isArray(event)) {
    return { valid: false, reason: "Event must be a non-null object" };
  }

  const { id, type, payload } = event;

  if (typeof id !== "string" || id.length < 1 || id.length > 64) {
    return {
      valid: false,
      reason: "Event id must be a string of length 1-64",
    };
  }

  if (!VALID_TYPES.has(type)) {
    return {
      valid: false,
      reason: `Event type must be one of: ${[...VALID_TYPES].join(", ")}`,
    };
  }

  if (
    payload === null ||
    payload === undefined ||
    typeof payload !== "object" ||
    Array.isArray(payload)
  ) {
    return {
      valid: false,
      reason: "Event payload must be a non-null, non-array object",
    };
  }

  return { valid: true };
}

/**
 * Serialize an event object into an SSE-formatted string.
 *
 * @param {{ id: string, type: string, payload: object }} event
 * @returns {string} SSE-formatted string: `data: ${JSON.stringify(event)}\n\n`
 * @throws {Error} If the event does not satisfy the wire schema or exceeds 65536 bytes
 */
export function serializeEvent(event) {
  const validation = validateEvent(event);
  if (!validation.valid) {
    throw new Error(`Invalid SSE event: ${validation.reason}`);
  }

  const json = JSON.stringify({
    id: event.id,
    type: event.type,
    payload: event.payload,
  });

  const line = `data: ${json}\n\n`;

  // Check byte length (UTF-8)
  const byteLength = Buffer.byteLength(line, "utf8");
  if (byteLength > MAX_BYTE_LENGTH) {
    throw new Error(
      `Serialized event exceeds ${MAX_BYTE_LENGTH} bytes (got ${byteLength})`,
    );
  }

  return line;
}

/**
 * Parse an SSE data line back into an event object.
 *
 * Strips leading "data:" prefix and surrounding whitespace, then validates
 * the parsed JSON against the wire schema.
 *
 * @param {string} line - Raw SSE line
 * @returns {{ ok: true, event: { id: string, type: string, payload: object } } | { ok: false, reason: string }}
 */
export function parseEventLine(line) {
  if (typeof line !== "string") {
    console.warn(`[SSE] Malformed event line (not a string), id: "unknown"`);
    return { ok: false, reason: "Input must be a string" };
  }

  // Strip "data:" prefix
  let content = line;
  if (content.startsWith("data:")) {
    content = content.slice(5);
  } else if (content.startsWith("data :")) {
    content = content.slice(6);
  }

  content = content.trim();

  if (!content) {
    console.warn(`[SSE] Empty event data, id: "unknown"`);
    return { ok: false, reason: "Empty event data" };
  }

  let parsed;
  try {
    parsed = JSON.parse(content);
  } catch (e) {
    console.warn(`[SSE] Non-JSON event data, id: "unknown"`);
    return { ok: false, reason: "Event data is not valid JSON" };
  }

  const validation = validateEvent(parsed);
  if (!validation.valid) {
    const eventId =
      parsed && typeof parsed.id === "string" ? parsed.id : "unknown";
    console.warn(`[SSE] Invalid event schema, id: "${eventId}": ${validation.reason}`);
    return { ok: false, reason: validation.reason };
  }

  return {
    ok: true,
    event: {
      id: parsed.id,
      type: parsed.type,
      payload: parsed.payload,
    },
  };
}
