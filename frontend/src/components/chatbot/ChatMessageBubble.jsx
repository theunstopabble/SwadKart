import { RefreshCw, AlertCircle, File } from "lucide-react";

/**
 * Individual message bubble with typing indicator and error state.
 *
 * Requirements: 11.5, 11.8
 *
 * @param {{ message: { text: string, sender: string, files?: Array, error?: boolean, isStreaming?: boolean } }} props
 */
const ChatMessageBubble = ({ message }) => {
  const isUser = message.sender === "user";
  const isBot = message.sender === "bot";

  return (
    <div
      className={`flex ${isUser ? "justify-end" : "justify-start"} animate-in fade-in slide-in-from-bottom-2`}
      role="listitem"
    >
      <div
        className={`max-w-[85%] p-4 rounded-[1.5rem] text-sm leading-relaxed font-medium shadow-md ${
          isUser
            ? "bg-primary text-white rounded-br-none shadow-primary/10"
            : "bg-gray-900 text-gray-200 rounded-bl-none border border-gray-800"
        } ${message.error ? "border-red-500/50" : ""}`}
      >
        {/* Message text */}
        <p className="whitespace-pre-line">{message.text}</p>

        {/* Typing indicator for streaming */}
        {message.isStreaming && isBot && (
          <span className="inline-flex items-center gap-1 mt-1">
            <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></span>
            <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></span>
            <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></span>
          </span>
        )}

        {/* Error state */}
        {message.error && isBot && (
          <div className="flex items-center gap-1.5 mt-2 text-red-400 text-xs">
            <AlertCircle size={12} />
            <span>Failed to complete response</span>
          </div>
        )}

        {/* Attachment pills */}
        {message.files && message.files.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {message.files.map((f, fi) => (
              <span
                key={fi}
                className="inline-flex items-center gap-1 bg-white/20 px-2 py-1 rounded-lg text-[10px] font-bold backdrop-blur-sm"
              >
                <File size={10} aria-hidden="true" />
                {f.name}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatMessageBubble;
