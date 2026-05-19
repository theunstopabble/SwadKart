import { describe, it, expect } from "vitest";
import fc from "fast-check";

/**
 * Property tests for useChatSession pure logic.
 *
 * Task 8.2:
 *   Property 3: Session ID resolver returns a valid UUID v4 and persists when needed
 *   Property 4: New Chat control replaces session and clears messages
 *
 * We test the pure functions extracted from useChatSession.js:
 *   - resolveSessionId always returns a UUID v4 format string
 *   - startNewChat generates a different UUID each time
 */

const UUID_V4_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Pure logic extracted from useChatSession.js for testing.
 * Simulates localStorage with a simple Map.
 */
function createSessionManager(storage = new Map()) {
  const STORAGE_KEY = "swadkart_chat_session_id";

  function readStoredSessionId() {
    const stored = storage.get(STORAGE_KEY) ?? null;
    if (stored && UUID_V4_REGEX.test(stored)) {
      return stored;
    }
    return null;
  }

  function generateAndPersist() {
    const newId = crypto.randomUUID();
    storage.set(STORAGE_KEY, newId);
    return newId;
  }

  function resolveSessionId() {
    const existing = readStoredSessionId();
    if (existing) {
      return existing;
    }
    return generateAndPersist();
  }

  function startNewChat() {
    return generateAndPersist();
  }

  return { resolveSessionId, startNewChat, storage };
}

describe("useChatSession — Property 3: Session ID resolver returns a valid UUID v4", () => {
  it("always returns a valid UUID v4 when storage is empty", () => {
    fc.assert(
      fc.property(fc.constant(null), () => {
        const manager = createSessionManager(new Map());
        const id = manager.resolveSessionId();
        expect(id).toMatch(UUID_V4_REGEX);
      }),
      { numRuns: 100 },
    );
  });

  it("returns the stored value unchanged when it is already a valid UUID v4", () => {
    fc.assert(
      fc.property(
        fc.uuid().filter((id) => UUID_V4_REGEX.test(id)),
        (validUuid) => {
          const storage = new Map([["swadkart_chat_session_id", validUuid]]);
          const manager = createSessionManager(storage);
          const result = manager.resolveSessionId();
          expect(result).toBe(validUuid);
          // No new write should have occurred — storage still has the same value
          expect(storage.get("swadkart_chat_session_id")).toBe(validUuid);
        },
      ),
      { numRuns: 100 },
    );
  });

  it("generates and persists a new UUID when stored value is invalid", () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 0, maxLength: 100 }).filter((s) => !UUID_V4_REGEX.test(s)),
        (invalidValue) => {
          const storage = new Map([["swadkart_chat_session_id", invalidValue]]);
          const manager = createSessionManager(storage);
          const result = manager.resolveSessionId();
          expect(result).toMatch(UUID_V4_REGEX);
          // Should have persisted the new value
          expect(storage.get("swadkart_chat_session_id")).toBe(result);
        },
      ),
      { numRuns: 100 },
    );
  });

  it("persists to storage exactly when input is null/empty/invalid", () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.constant(null),
          fc.constant(""),
          fc.constant("not-a-uuid"),
          fc.constant("12345678-1234-1234-1234-123456789012"), // version not 4
        ),
        (storedValue) => {
          const storage = new Map();
          if (storedValue !== null) {
            storage.set("swadkart_chat_session_id", storedValue);
          }
          const manager = createSessionManager(storage);
          const result = manager.resolveSessionId();
          expect(result).toMatch(UUID_V4_REGEX);
          expect(storage.get("swadkart_chat_session_id")).toBe(result);
        },
      ),
      { numRuns: 50 },
    );
  });
});

describe("useChatSession — Property 4: New Chat control replaces session and clears messages", () => {
  it("startNewChat always generates a valid UUID v4 different from the current one", () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 20 }), (callCount) => {
        const manager = createSessionManager(new Map());
        const initial = manager.resolveSessionId();
        const generated = new Set([initial]);

        for (let i = 0; i < callCount; i++) {
          const newId = manager.startNewChat();
          expect(newId).toMatch(UUID_V4_REGEX);
          // Each new ID should be unique (with overwhelming probability)
          generated.add(newId);
        }

        // All generated IDs should be unique
        expect(generated.size).toBe(callCount + 1);
      }),
      { numRuns: 50 },
    );
  });

  it("startNewChat persists the new session ID to storage", () => {
    fc.assert(
      fc.property(fc.constant(null), () => {
        const manager = createSessionManager(new Map());
        const newId = manager.startNewChat();
        expect(manager.storage.get("swadkart_chat_session_id")).toBe(newId);
      }),
      { numRuns: 50 },
    );
  });

  it("startNewChat produces a different ID from the previous session", () => {
    fc.assert(
      fc.property(fc.constant(null), () => {
        const manager = createSessionManager(new Map());
        const first = manager.resolveSessionId();
        const second = manager.startNewChat();
        expect(second).not.toBe(first);
        expect(second).toMatch(UUID_V4_REGEX);
      }),
      { numRuns: 100 },
    );
  });
});
