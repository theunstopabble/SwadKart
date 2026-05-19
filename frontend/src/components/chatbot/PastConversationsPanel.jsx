import { useState, useEffect } from "react";
import { History, RefreshCw, MessageSquare, AlertCircle } from "lucide-react";
import { BASEURL } from "../../config";

/**
 * Panel showing past conversations for authenticated users.
 *
 * - Fetches from GET /api/v1/chat/history (auth required)
 * - Shows list of conversations, click to load
 * - Handles error and empty states
 *
 * Requirements: 7.4, 7.5, 7.6
 *
 * @param {{
 *   isAuthenticated: boolean,
 *   onSelectConversation: (conversation: { sessionId: string, messages: Array }) => void,
 *   isVisible: boolean,
 * }} props
 */
const PastConversationsPanel = ({ isAuthenticated, onSelectConversation, isVisible }) => {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchConversations = () => {
    if (!isAuthenticated) return;

    setLoading(true);
    setError(null);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    fetch(`${BASEURL}/api/v1/chat/history`, {
      method: "GET",
      credentials: "include",
      signal: controller.signal,
    })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load conversations");
        return res.json();
      })
      .then((data) => {
        setConversations(data.conversations || []);
      })
      .catch((err) => {
        if (err.name !== "AbortError") {
          setError("Could not load past conversations");
        }
      })
      .finally(() => {
        clearTimeout(timeoutId);
        setLoading(false);
      });

    return () => {
      controller.abort();
      clearTimeout(timeoutId);
    };
  };

  useEffect(() => {
    if (isVisible && isAuthenticated) {
      queueMicrotask(() => fetchConversations());
    }
  }, [isVisible, isAuthenticated]);

  if (!isAuthenticated || !isVisible) return null;

  return (
    <div
      className="border-b border-gray-800 bg-gray-950/80 max-h-[200px] overflow-y-auto"
      role="region"
      aria-label="Past conversations"
    >
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-800/50">
        <div className="flex items-center gap-2 text-gray-400 text-xs font-bold uppercase tracking-wider">
          <History size={12} aria-hidden="true" />
          Past Chats
        </div>
        {error && (
          <button
            onClick={fetchConversations}
            className="text-primary hover:text-red-400 transition-colors"
            aria-label="Retry loading conversations"
          >
            <RefreshCw size={12} />
          </button>
        )}
      </div>

      {/* Loading state */}
      {loading && (
        <div className="flex items-center justify-center py-4">
          <RefreshCw size={14} className="animate-spin text-gray-500" aria-hidden="true" />
          <span className="ml-2 text-xs text-gray-500">Loading...</span>
        </div>
      )}

      {/* Error state */}
      {error && !loading && (
        <div className="flex items-center gap-2 px-4 py-3 text-xs text-red-400">
          <AlertCircle size={12} aria-hidden="true" />
          <span>{error}</span>
          <button
            onClick={fetchConversations}
            className="ml-auto text-primary hover:text-red-400 text-[10px] font-bold uppercase"
            aria-label="Retry"
          >
            Retry
          </button>
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && conversations.length === 0 && (
        <div className="flex items-center justify-center py-4 text-xs text-gray-600">
          No past conversations
        </div>
      )}

      {/* Conversation list */}
      {!loading && !error && conversations.length > 0 && (
        <ul className="divide-y divide-gray-800/50">
          {conversations.map((conv) => (
            <li key={conv._id || conv.sessionId}>
              <button
                onClick={() => onSelectConversation(conv)}
                className="w-full text-left px-4 py-2.5 hover:bg-gray-900/50 transition-colors group"
                aria-label={`Load conversation from ${conv.updatedAt ? new Date(conv.updatedAt).toLocaleDateString() : "unknown date"}`}
              >
                <div className="flex items-center gap-2">
                  <MessageSquare size={12} className="text-gray-600 group-hover:text-primary shrink-0" aria-hidden="true" />
                  <span className="text-xs text-gray-400 group-hover:text-gray-200 truncate">
                    {conv.messages && conv.messages.length > 0
                      ? conv.messages[0].content?.slice(0, 50) || "Conversation"
                      : "Conversation"}
                  </span>
                  <span className="ml-auto text-[10px] text-gray-600 shrink-0">
                    {conv.updatedAt
                      ? new Date(conv.updatedAt).toLocaleDateString()
                      : ""}
                  </span>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default PastConversationsPanel;
