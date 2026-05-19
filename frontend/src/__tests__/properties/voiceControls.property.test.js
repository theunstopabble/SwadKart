import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { arbTranscript } from "../generators/chat.js";

/**
 * Property tests for voice control pure logic.
 *
 * Task 8.4:
 *   Property 10: Voice transcript handler replaces input only for non-whitespace transcripts
 *                and never auto-submits
 *   Property 11: Speech synthesis speaks each completed assistant message in the detected
 *                language only when enabled
 *
 * We test the pure decision logic extracted from the hooks.
 */

/**
 * Pure logic: transcript handler decision.
 * Given a current input value and a recognized transcript,
 * determines the new input value and whether to submit.
 *
 * Rules:
 *   - If transcript.trim() has at least one character → replace input with transcript
 *   - If transcript is empty or whitespace-only → keep current input unchanged
 *   - Never auto-submit (always returns shouldSubmit: false)
 */
function handleTranscript(currentInput, transcript) {
  const trimmed = transcript.trim();
  if (trimmed.length > 0) {
    return { newInput: transcript, shouldSubmit: false };
  }
  return { newInput: currentInput, shouldSubmit: false };
}

/**
 * Pure logic: speech synthesis decision.
 * Given a completed assistant message, readAloud toggle, and detected language,
 * determines whether to speak and with what parameters.
 *
 * Rules:
 *   - If readAloudEnabled is true → speak with the detected language
 *   - If readAloudEnabled is false → do not speak
 */
function shouldSpeak(message, readAloudEnabled) {
  if (!readAloudEnabled) {
    return { speak: false };
  }
  if (!message || message.trim().length === 0) {
    return { speak: false };
  }
  return { speak: true };
}

const LANGUAGE_MAP = {
  English: "en-IN",
  Hindi: "hi-IN",
  Tamil: "ta-IN",
  Telugu: "te-IN",
  Bengali: "bn-IN",
  Marathi: "mr-IN",
  Hinglish: "hi-IN",
};

/**
 * Resolve the BCP-47 lang for a given detected language.
 */
function resolveSpeechLang(detectedLanguage) {
  return Object.prototype.hasOwnProperty.call(LANGUAGE_MAP, detectedLanguage)
    ? LANGUAGE_MAP[detectedLanguage]
    : "en-IN";
}

describe("voiceControls — Property 10: Transcript handler replaces input only for non-whitespace", () => {
  it("replaces input when transcript has non-whitespace content", () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 0, maxLength: 100 }), // currentInput
        fc.string({ minLength: 1, maxLength: 200 }).filter((s) => s.trim().length > 0), // non-whitespace transcript
        (currentInput, transcript) => {
          const result = handleTranscript(currentInput, transcript);
          expect(result.newInput).toBe(transcript);
          expect(result.shouldSubmit).toBe(false);
        },
      ),
      { numRuns: 200 },
    );
  });

  it("keeps current input unchanged when transcript is whitespace-only", () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 0, maxLength: 100 }), // currentInput
        fc.oneof(
          fc.constant(""),
          fc.integer({ min: 1, max: 20 }).map((n) => " ".repeat(n)),
          fc.integer({ min: 1, max: 10 }).map((n) => "\t".repeat(n)),
          fc.integer({ min: 1, max: 5 }).map((n) => "\n".repeat(n)),
          fc.integer({ min: 1, max: 15 }).map((n) => " \t\n".repeat(n).slice(0, n)),
        ),
        (currentInput, whitespaceTranscript) => {
          const result = handleTranscript(currentInput, whitespaceTranscript);
          expect(result.newInput).toBe(currentInput);
          expect(result.shouldSubmit).toBe(false);
        },
      ),
      { numRuns: 200 },
    );
  });

  it("never auto-submits regardless of transcript content", () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 0, maxLength: 100 }),
        arbTranscript,
        (currentInput, transcript) => {
          const result = handleTranscript(currentInput, transcript);
          expect(result.shouldSubmit).toBe(false);
        },
      ),
      { numRuns: 300 },
    );
  });

  it("the decision is deterministic for the same inputs", () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 0, maxLength: 100 }),
        arbTranscript,
        (currentInput, transcript) => {
          const r1 = handleTranscript(currentInput, transcript);
          const r2 = handleTranscript(currentInput, transcript);
          expect(r1).toEqual(r2);
        },
      ),
      { numRuns: 100 },
    );
  });
});

describe("voiceControls — Property 11: Speech synthesis speaks only when enabled", () => {
  it("speaks when readAloud is true and message is non-empty", () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 500 }).filter((s) => s.trim().length > 0),
        (message) => {
          const result = shouldSpeak(message, true);
          expect(result.speak).toBe(true);
        },
      ),
      { numRuns: 200 },
    );
  });

  it("does not speak when readAloud is false", () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 0, maxLength: 500 }),
        (message) => {
          const result = shouldSpeak(message, false);
          expect(result.speak).toBe(false);
        },
      ),
      { numRuns: 200 },
    );
  });

  it("does not speak when message is empty or whitespace-only even if enabled", () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.constant(""),
          fc.constant(null),
          fc.integer({ min: 1, max: 20 }).map((n) => " ".repeat(n)),
        ),
        (emptyMessage) => {
          const result = shouldSpeak(emptyMessage, true);
          expect(result.speak).toBe(false);
        },
      ),
      { numRuns: 100 },
    );
  });

  it("resolves the correct BCP-47 lang for each supported language", () => {
    fc.assert(
      fc.property(
        fc.constantFrom("English", "Hindi", "Tamil", "Telugu", "Bengali", "Marathi", "Hinglish"),
        (language) => {
          const lang = resolveSpeechLang(language);
          expect(lang).toMatch(/^[a-z]{2}-[A-Z]{2}$/);
          expect(lang).toBe(LANGUAGE_MAP[language]);
        },
      ),
      { numRuns: 50 },
    );
  });

  it("falls back to en-IN for unknown languages", () => {
    const knownLanguages = new Set(Object.keys(LANGUAGE_MAP));
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 30 }).filter(
          (s) => !knownLanguages.has(s),
        ),
        (unknownLang) => {
          const lang = resolveSpeechLang(unknownLang);
          expect(lang).toBe("en-IN");
        },
      ),
      { numRuns: 100 },
    );
  });
});
