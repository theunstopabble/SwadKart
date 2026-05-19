/**
 * SSE Event Parser — Pure Function (Frontend)
 *
 * Mirrors the backend sseSerializer.js parseEventLine logic.
 *
 * Wire schema (Requirement 16):
 *   id:      string, 1..64 chars, unique within stream
 *   type:    "token" | "tool_call" | "done" | "error"
 *   payload: object (always non-null, possibly empty)
 */

const VALID_TYPES = new Set(["token", "tool_call", "done", "error"]);

/**
 * Validate a parsed event object against the wire schema.
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
 * Parse an SSE data line back into an event object.
 *
 * Strips leading "data:" prefix and surrounding whitespace, then validates
 * the parsed JSON against the wire schema.
 *
 * @param {string} line - Raw SSE line (e.g. 'data: {"id":"1","type":"token","payload":{"text":"hi"}}')
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
  } catch (_e) {
    console.warn(`[SSE] Non-JSON event data, id: "unknown"`);
    return { ok: false, reason: "Event data is not valid JSON" };
  }

  const validation = validateEvent(parsed);
  if (!validation.valid) {
    const eventId =
      parsed && typeof parsed.id === "string" ? parsed.id : "unknown";
    console.warn(
      `[SSE] Invalid event schema, id: "${eventId}": ${validation.reason}`,
    );
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
