import { useState, useRef, useCallback, useEffect } from "react";

/**
 * Language mapping from detected language names to BCP-47 synthesis locales.
 * Matches the Supported_Language_Set from requirements.
 */
const LANGUAGE_MAP = {
  English: "en-IN",
  Hindi: "hi-IN",
  Tamil: "ta-IN",
  Telugu: "te-IN",
  Bengali: "bn-IN",
  Marathi: "mr-IN",
  Hinglish: "hi-IN",
};

const STORAGE_KEY = "swadkart_read_aloud";

/**
 * Hook for browser-native speech synthesis via the Web Speech API.
 *
 * Exports: { speak, cancel, isSpeaking, isSupported, readAloudEnabled, toggleReadAloud }
 *
 * Requirements: 5.6, 5.7
 */
export function useSpeechSynthesis() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [readAloudEnabled, setReadAloudEnabled] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === "true";
    } catch {
      return false;
    }
  });

  const utteranceRef = useRef(null);

  // Check browser support
  const isSupported =
    typeof window !== "undefined" && !!window.speechSynthesis;

  /**
   * Toggle the read-aloud preference and persist to localStorage.
   */
  const toggleReadAloud = useCallback(() => {
    setReadAloudEnabled((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_KEY, String(next));
      } catch {
        // localStorage unavailable — state still updates in memory
      }
      return next;
    });
  }, []);

  /**
   * Speak the given text using the Web Speech API.
   * Requirement 5.6: speak assistant messages with language matching.
   *
   * @param {string} text - The text to speak.
   * @param {string} [language="English"] - The detected language name from Supported_Language_Set.
   */
  const speak = useCallback(
    (text, language = "English") => {
      if (!isSupported || !text) return;

      // Cancel any ongoing speech before starting new
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = LANGUAGE_MAP[language] || "en-IN";

      let chromeBugTimeout;

      utterance.onstart = () => {
        setIsSpeaking(true);
        // Chrome speech bug workaround: restart if speech stops prematurely
        chromeBugTimeout = setTimeout(() => {
          if (window.speechSynthesis.speaking) {
            window.speechSynthesis.pause();
            window.speechSynthesis.resume();
          }
        }, 10000);
      };

      utterance.onend = () => {
        clearTimeout(chromeBugTimeout);
        setIsSpeaking(false);
        utteranceRef.current = null;
      };

      utterance.onerror = () => {
        clearTimeout(chromeBugTimeout);
        setIsSpeaking(false);
        utteranceRef.current = null;
      };

      utteranceRef.current = utterance;
      window.speechSynthesis.speak(utterance);
    },
    [isSupported]
  );

  /**
   * Cancel any active speech utterance.
   * Requirement 5.7: cancel on widget close within 1 second.
   */
  const cancel = useCallback(() => {
    if (!isSupported) return;
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
    utteranceRef.current = null;
  }, [isSupported]);

  // Cleanup on unmount — cancel speech when widget closes
  useEffect(() => {
    return () => {
      if (isSupported) {
        window.speechSynthesis.cancel();
      }
    };
  }, [isSupported]);

  return {
    speak,
    cancel,
    isSpeaking,
    isSupported,
    readAloudEnabled,
    toggleReadAloud,
  };
}

export default useSpeechSynthesis;
