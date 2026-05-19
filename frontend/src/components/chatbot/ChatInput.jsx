import { useRef, useEffect } from "react";
import { Send, Paperclip, File, XCircle } from "lucide-react";

/**
 * Chat input area with text input, send button, mic button slot, and file attach.
 *
 * Tab order: input → send → mic (rendered by parent) → file-attach
 *
 * Requirements: 13.7, 4.8
 *
 * @param {{
 *   input: string,
 *   onInputChange: (value: string) => void,
 *   onSend: () => void,
 *   isLoading: boolean,
 *   files: Array<File>,
 *   onFileChange: (e: Event) => void,
 *   onRemoveFile: (index: number) => void,
 *   micButton: React.ReactNode,
 *   isOpen: boolean,
 * }} props
 */
const ChatInput = ({
  input,
  onInputChange,
  onSend,
  isLoading,
  files,
  onFileChange,
  onRemoveFile,
  micButton,
  isOpen,
}) => {
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen]);

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  return (
    <div className="p-4 bg-gray-950 border-t border-gray-900 shrink-0">
      {/* Selected file chips */}
      {files.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {files.map((f, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1 bg-primary/10 text-primary border border-primary/20 px-2 py-1 rounded-lg text-[10px] font-bold"
            >
              <File size={10} aria-hidden="true" />
              {f.name}
              <button
                onClick={() => onRemoveFile(i)}
                className="ml-1 hover:text-white"
                aria-label={`Remove file ${f.name}`}
              >
                <XCircle size={10} />
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="flex items-center gap-2">
        {/* Text input — tabIndex 1 in sequence */}
        <input
          ref={inputRef}
          type="text"
          placeholder="Ask for food recommendations..."
          className="flex-1 min-w-0 bg-black border border-gray-800 text-white rounded-2xl px-3 sm:px-5 py-3 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/50 transition-all placeholder:text-gray-600 font-medium shadow-inner"
          value={input}
          onChange={(e) => onInputChange(e.target.value)}
          onKeyDown={handleKeyPress}
          aria-label="Type your message"
          tabIndex={0}
        />

        {/* Send button — tabIndex 2 in sequence */}
        <button
          onClick={onSend}
          disabled={isLoading || (!input.trim() && files.length === 0)}
          className="bg-primary hover:bg-red-600 text-white p-3 sm:p-3.5 rounded-2xl transition-all disabled:opacity-50 disabled:grayscale shadow-xl shadow-primary/20 active:scale-90 hover:-translate-y-1 shrink-0"
          aria-label="Send message"
          tabIndex={0}
        >
          <Send size={18} />
        </button>

        {/* Mic button slot — tabIndex 3 in sequence (rendered by parent) */}
        {micButton}

        {/* File attach button — tabIndex 4 in sequence */}
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isLoading || files.length >= 3}
          className="text-gray-400 hover:text-primary transition-colors p-2 sm:p-3 rounded-2xl disabled:opacity-30 shrink-0"
          aria-label="Attach file (PDF, TXT, DOCX, Image)"
          tabIndex={0}
        >
          <Paperclip size={18} />
        </button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,.txt,.docx,.doc,image/*"
          className="hidden"
          onChange={onFileChange}
          aria-hidden="true"
          tabIndex={-1}
        />
      </div>
    </div>
  );
};

export default ChatInput;
