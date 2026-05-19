import { useState, useCallback, useRef } from "react";
import { BASEURL } from "../../../config";
import { parseEventLine } from "../utils/sseEventParser";

/**
 * Hook for streaming chat responses via fetch-based SSE over POST.
 *
 * Uses ReadableStream to read SSE chunks from the POST response body,
 * parses each line using parseEventLine, and handles token/tool_call/done/error events.
 *
 * Requirements: 11.5, 16.2, 16.3, 16.5
 *
 * @returns {{ sendMessage, isStreaming, streamedText, toolCallResult, error, resetStream }}
 */
export function useChatStream() {
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamedText, setStreamedText] = useState("");
  const [toolCallResult, setToolCallResult] = useState(null);
  const [error, setError] = useState(null);

  // AbortController ref for cancelling in-flight requests
  const abortRef = useRef(null);

  /**
   * Reset stream state for a new message cycle.
   */
  const resetStream = useCallback(() => {
    setStreamedText("");
    setToolCallResult(null);
    setError(null);
  }, []);

  /**
   * Send a message and stream the response.
   *
   * @param {string} message - The user's message text
   * @param {string} sessionId - Current chat session ID
   * @param {Array} cartItems - Current cart items for context
   * @returns {Promise<{ text: string, toolCall: object|null, error: string|null }>}
   */
  const sendMessage = useCallback(async (message, sessionId, cartItems = []) => {
    // Abort any in-flight stream
    if (abortRef.current) {
      abortRef.current.abort();
    }

    const controller = new AbortController();
    abortRef.current = controller;

    // Reset state for new stream
    setStreamedText("");
    setToolCallResult(null);
    setError(null);
    setIsStreaming(true);

    let accumulatedText = "";
    let lastToolCall = null;
    let streamError = null;

    try {
      const response = await fetch(`${BASEURL}/api/v1/chat/stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        signal: controller.signal,
        body: JSON.stringify({ message, sessionId, cartItems }),
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => "Stream request failed");
        throw new Error(errorText);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // SSE lines are separated by double newlines
        const lines = buffer.split("\n");
        // Keep the last incomplete line in the buffer
        buffer = lines.pop() || "";

        for (const rawLine of lines) {
          const line = rawLine.trim();
          if (!line) continue; // Skip empty lines (SSE separators)

          const result = parseEventLine(line);
          if (!result.ok) {
            // Discard invalid lines per Requirement 16.3
            continue;
          }

          const { event } = result;

          switch (event.type) {
            case "token":
              if (event.payload && typeof event.payload.text === "string") {
                accumulatedText += event.payload.text;
                setStreamedText(accumulatedText);
              }
              break;

            case "tool_call":
              lastToolCall = event.payload;
              setToolCallResult(event.payload);
              break;

            case "done":
              // Stream completed successfully
              setIsStreaming(false);
              abortRef.current = null;
              return { text: accumulatedText, toolCall: lastToolCall, error: null };

            case "error":
              // Server signaled an error
              streamError =
                (event.payload && event.payload.message) ||
                "An error occurred during streaming";
              setError(streamError);
              setIsStreaming(false);
              abortRef.current = null;
              return { text: accumulatedText, toolCall: lastToolCall, error: streamError };

            default:
              break;
          }
        }
      }

      // If we exit the loop without a "done" event, treat as complete
      setIsStreaming(false);
      abortRef.current = null;
      return { text: accumulatedText, toolCall: lastToolCall, error: null };
    } catch (err) {
      if (err.name === "AbortError") {
        // Request was intentionally aborted
        setIsStreaming(false);
        abortRef.current = null;
        return { text: accumulatedText, toolCall: lastToolCall, error: null };
      }

      streamError = err.message || "Failed to connect to chat stream";
      setError(streamError);
      setIsStreaming(false);
      abortRef.current = null;
      return { text: accumulatedText, toolCall: lastToolCall, error: streamError };
    }
  }, []);

  return {
    sendMessage,
    isStreaming,
    streamedText,
    toolCallResult,
    error,
    resetStream,
  };
}
