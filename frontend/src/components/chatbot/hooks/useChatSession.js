import { useState, useCallback } from "react";

const STORAGE_KEY = "swadkart_chat_session_id";

/**
 * UUID v4 regex for validation.
 */
const UUID_V4_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Read the session ID from localStorage.
 * Returns the stored value if it's a valid UUID v4, otherwise null.
 */
function readStoredSessionId() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && UUID_V4_REGEX.test(stored)) {
      return stored;
    }
  } catch {
    // localStorage may be unavailable (private browsing, etc.)
  }
  return null;
}

/**
 * Generate a new UUID v4 and persist it to localStorage.
 * @returns {string} The new session ID
 */
function generateAndPersist() {
  const newId = crypto.randomUUID();
  try {
    localStorage.setItem(STORAGE_KEY, newId);
  } catch {
    // Swallow storage errors — session still works in-memory
  }
  return newId;
}

/**
 * Resolve the initial session ID: reuse from localStorage if valid,
 * otherwise generate a new one.
 * @returns {string}
 */
function resolveSessionId() {
  const existing = readStoredSessionId();
  if (existing) {
    return existing;
  }
  return generateAndPersist();
}

/**
 * Hook for managing the chat session ID.
 *
 * - On mount: reads sessionId from localStorage key `swadkart_chat_session_id`
 * - If not found or invalid: generates via crypto.randomUUID(), stores in localStorage
 * - Exports: { sessionId, startNewChat }
 *   - startNewChat: generates a new UUID, persists it, and signals message clearing
 *
 * Requirements: 1.5, 1.6, 1.7
 */
export function useChatSession() {
  const [sessionId, setSessionId] = useState(resolveSessionId);

  /**
   * Start a new chat session:
   * - Generate a fresh UUID v4
   * - Persist to localStorage (replacing any prior value)
   * - Update state
   *
   * The caller is responsible for clearing the displayed message list.
   */
  const startNewChat = useCallback(() => {
    const newId = generateAndPersist();
    setSessionId(newId);
    return newId;
  }, []);

  return { sessionId, startNewChat };
}
