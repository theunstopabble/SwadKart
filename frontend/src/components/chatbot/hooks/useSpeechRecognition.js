import { useState, useRef, useCallback, useEffect } from "react";
import i18n from "../../../i18n";

/**
 * Language mapping from i18next language codes to BCP-47 recognition locales.
 */
const LANGUAGE_MAP = {
  en: "en-IN",
  hi: "hi-IN",
  ta: "ta-IN",
  te: "te-IN",
  bn: "bn-IN",
  mr: "mr-IN",
};

const AUTO_STOP_MS = 30000; // 30 seconds

/**
 * Hook for browser-native speech recognition via the Web Speech API.
 *
 * Exports: { isListening, transcript, error, startListening, stopListening, isSupported }
 *
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5
 */
export function useSpeechRecognition() {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState(null);

  const recognitionRef = useRef(null);
  const autoStopTimerRef = useRef(null);

  // Check browser support
  const isSupported =
    typeof window !== "undefined" &&
    !!(window.SpeechRecognition || window.webkitSpeechRecognition);

  /**
   * Clean up recognition instance and timer.
   */
  const cleanup = useCallback(() => {
    if (autoStopTimerRef.current) {
      clearTimeout(autoStopTimerRef.current);
      autoStopTimerRef.current = null;
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch {
        // Ignore errors during cleanup
      }
      recognitionRef.current = null;
    }
  }, []);

  /**
   * Stop the active recognition session.
   * Requirement 5.3: stop within 1 second when user clicks mic while active.
   */
  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // Already stopped
      }
    }
    if (autoStopTimerRef.current) {
      clearTimeout(autoStopTimerRef.current);
      autoStopTimerRef.current = null;
    }
    setIsListening(false);
  }, []);

  /**
   * Start a speech recognition session.
   * Requirement 5.2: uses i18next language, auto-stops after 30s.
   */
  const startListening = useCallback(() => {
    if (!isSupported) return;

    // Clean up any previous session
    cleanup();
    setError(null);
    setTranscript("");

    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();

    // Set language based on current i18next detected language
    const currentLang = i18n.language || "en";
    const baseLang = currentLang.split("-")[0]; // handle "en-US" → "en"
    recognition.lang = LANGUAGE_MAP[baseLang] || "en-IN";

    recognition.continuous = false;
    recognition.interimResults = true;

    recognition.onresult = (event) => {
      let finalTranscript = "";
      let interimTranscript = "";

      for (let i = 0; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTranscript += result[0].transcript;
        } else {
          interimTranscript += result[0].transcript;
        }
      }

      // Requirement 5.4: replace input with transcript, don't auto-submit
      const currentTranscript = finalTranscript || interimTranscript;
      setTranscript(currentTranscript);
    };

    recognition.onerror = (event) => {
      // Requirement 5.5: on error, stop and set error state
      setError(event.error);
      setIsListening(false);
      cleanup();
    };

    recognition.onend = () => {
      // Clean up when recognition ends naturally
      setIsListening(false);
      if (autoStopTimerRef.current) {
        clearTimeout(autoStopTimerRef.current);
        autoStopTimerRef.current = null;
      }
      recognitionRef.current = null;
    };

    recognitionRef.current = recognition;

    try {
      recognition.start();
      setIsListening(true);

      // Requirement 5.2: auto-stop after 30 seconds
      autoStopTimerRef.current = setTimeout(() => {
        stopListening();
      }, AUTO_STOP_MS);
    } catch (err) {
      setError(err.message || "recognition_start_failed");
      setIsListening(false);
      cleanup();
    }
  }, [isSupported, cleanup, stopListening]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  return {
    isListening,
    transcript,
    error,
    startListening,
    stopListening,
    isSupported,
  };
}

export default useSpeechRecognition;
