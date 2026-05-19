import { useState, useEffect } from "react";
import { Sparkles } from "lucide-react";
import { BASEURL } from "../../config";

/**
 * Default starter chips shown when conversation has zero messages.
 */
const DEFAULT_STARTERS = [
  "Show me today's specials",
  "Track my last order",
  "Help me find vegetarian options",
];

/**
 * Quick action suggestion chips rendered below the latest assistant message.
 *
 * - Fetches 3 suggestions from POST /api/v1/chat/suggestions
 * - On click, submits chip text as user message
 * - Disables chips until next assistant reply
 * - Shows default starters when conversation is empty
 *
 * Requirements: 14.1, 14.3, 14.4, 14.5, 14.6
 *
 * @param {{
 *   lastAssistantMessage: string | null,
 *   sessionId: string,
 *   onChipClick: (text: string) => void,
 *   disabled: boolean,
 *   messageCount: number,
 * }} props
 */
const QuickActionChips = ({ lastAssistantMessage, sessionId, onChipClick, disabled, messageCount }) => {
  const [chips, setChips] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Show default starters when no messages yet (only the welcome message)
    if (messageCount <= 1) {
      queueMicrotask(() => setChips(DEFAULT_STARTERS));
      return;
    }

    if (!lastAssistantMessage) {
      setChips([]);
      return;
    }

    // Fetch suggestions for the latest assistant message
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    setLoading(true);
    fetch(`${BASEURL}/api/v1/chat/suggestions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      signal: controller.signal,
      body: JSON.stringify({ message: lastAssistantMessage, sessionId }),
    })
      .then((res) => {
        if (!res.ok) throw new Error("suggestions failed");
        return res.json();
      })
      .then((data) => {
        // Validate: must be exactly 3 non-empty unique strings, each 1-40 chars
        if (
          Array.isArray(data.suggestions) &&
          data.suggestions.length === 3 &&
          data.suggestions.every(
            (s) => typeof s === "string" && s.trim().length >= 1 && s.trim().length <= 40
          ) &&
          new Set(data.suggestions.map((s) => s.trim())).size === 3
        ) {
          setChips(data.suggestions.map((s) => s.trim()));
        } else {
          // Invalid payload — render no chips per Requirement 14.6
          setChips([]);
        }
      })
      .catch(() => {
        // On failure or timeout — render no chips per Requirement 14.6
        setChips([]);
      })
      .finally(() => {
        clearTimeout(timeoutId);
        setLoading(false);
      });

    return () => {
      controller.abort();
      clearTimeout(timeoutId);
    };
  }, [lastAssistantMessage, sessionId, messageCount]);

  if (chips.length === 0 || loading) return null;

  return (
    <div className="flex flex-nowrap sm:flex-wrap gap-2 px-4 pb-2 overflow-x-auto scrollbar-hide" role="group" aria-label="Quick action suggestions">
      {chips.map((chip, index) => (
        <button
          key={`${chip}-${index}`}
          onClick={() => onChipClick(chip)}
          disabled={disabled}
          className="inline-flex items-center gap-1.5 bg-gray-900 hover:bg-gray-800 text-gray-300 hover:text-white border border-gray-700 hover:border-primary/50 px-3 py-2 sm:py-1.5 rounded-full text-xs font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap shrink-0 sm:shrink"
          aria-label={`Suggest: ${chip}`}
        >
          <Sparkles size={10} className="text-primary" aria-hidden="true" />
          {chip}
        </button>
      ))}
    </div>
  );
};

export default QuickActionChips;
