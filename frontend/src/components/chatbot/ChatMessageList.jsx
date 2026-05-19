import { useRef, useEffect } from "react";
import { RefreshCw } from "lucide-react";
import ChatMessageBubble from "./ChatMessageBubble";

/**
 * Scrollable message list with auto-scroll to bottom on new messages.
 *
 * Uses a ref + scrollIntoView for auto-scroll behavior.
 *
 * Requirements: 11.5, 13.4
 *
 * @param {{ messages: Array<{ text: string, sender: string, files?: Array, error?: boolean, isStreaming?: boolean }>, isLoading: boolean }} props
 */
const ChatMessageList = ({ messages, isLoading }) => {
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  return (
    <div
      className="flex-1 overflow-y-auto p-4 space-y-4 bg-black/95 custom-scrollbar"
      role="list"
      aria-label="Chat messages"
    >
      {messages.map((msg, index) => (
        <ChatMessageBubble key={index} message={msg} />
      ))}

      {/* Loading indicator */}
      {isLoading && (
        <div className="flex justify-start" role="listitem">
          <div className="bg-gray-900 text-primary p-4 rounded-[1.5rem] rounded-bl-none border border-gray-800 text-xs flex items-center gap-3 animate-pulse">
            <RefreshCw size={14} className="animate-spin" aria-hidden="true" />
            <span className="font-black uppercase tracking-widest text-[10px]">
              Genie is cooking...
            </span>
          </div>
        </div>
      )}

      <div ref={messagesEndRef} aria-hidden="true" />
    </div>
  );
};

export default ChatMessageList;
