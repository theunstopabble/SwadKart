import { useState, useCallback, useEffect } from "react";
import { MessageCircle, X, Sparkles } from "lucide-react";
import { useSelector } from "react-redux";

// Hooks
import { useChatSession } from "./chatbot/hooks/useChatSession";
import { useChatStream } from "./chatbot/hooks/useChatStream";
import { useResponsiveWidget } from "./chatbot/hooks/useResponsiveWidget";
import { useSpeechRecognition } from "./chatbot/hooks/useSpeechRecognition";
import { useSpeechSynthesis } from "./chatbot/hooks/useSpeechSynthesis";

// Sub-components
import ChatHeader from "./chatbot/ChatHeader";
import ChatMessageList from "./chatbot/ChatMessageList";
import ChatInput from "./chatbot/ChatInput";
import QuickActionChips from "./chatbot/QuickActionChips";
import PastConversationsPanel from "./chatbot/PastConversationsPanel";
import VoiceControls from "./chatbot/VoiceControls";

/**
 * ChatBot container component — composes all sub-components and hooks.
 *
 * When closed: shows a floating action button (FAB).
 * When open: shows the full chat widget positioned via useResponsiveWidget.
 *
 * Requirements: 1.7, 4.8, 5.1, 7.4, 7.5, 7.6, 11.5, 11.8, 13.1-13.8, 14.1, 14.3-14.6
 */
const ChatBot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [showPastConversations, setShowPastConversations] = useState(false);
  const { userInfo } = useSelector((state) => state.user);
  const { cartItems } = useSelector((state) => state.cart);

  // Hooks
  const { sessionId, startNewChat } = useChatSession();
  const { sendMessage, isStreaming, streamedText, resetStream } = useChatStream();
  const { widgetStyle, isMaximized, isLandscape, toggleMaximize } = useResponsiveWidget();
  const {
    isListening,
    transcript,
    error: micError,
    startListening,
    stopListening,
    isSupported: isRecognitionSupported,
  } = useSpeechRecognition();
  const {
    speak,
    cancel: cancelSpeech,
    isSupported: isSynthesisSupported,
    readAloudEnabled,
    toggleReadAloud,
  } = useSpeechSynthesis();

  // Local state
  const [messages, setMessages] = useState([
    {
      text: `Namaste${
        userInfo ? " " + userInfo.name : ""
      }! 🙏 I am SwadKart Genie 🧞‍♂️. Looking for a spicy recommendation or need help with an order?`,
      sender: "bot",
    },
  ]);
  const [input, setInput] = useState("");
  const [files, setFiles] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [chipsDisabled, setChipsDisabled] = useState(false);

  // Track the last assistant message for quick-action chips
  const lastAssistantMessage = messages
    .filter((m) => m.sender === "bot" && !m.isStreaming)
    .slice(-1)[0]?.text || null;

  // Handle transcript from speech recognition → replace input (Requirement 5.4)
  useEffect(() => {
    if (transcript && transcript.trim().length > 0) {
      setInput(transcript);
    }
  }, [transcript]);

  // Read aloud new assistant messages (Requirement 5.6)
  useEffect(() => {
    if (!readAloudEnabled) return;
    const lastMsg = messages[messages.length - 1];
    if (lastMsg && lastMsg.sender === "bot" && !lastMsg.isStreaming && messages.length > 1) {
      speak(lastMsg.text);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages.length, readAloudEnabled, speak]);

  // Cancel speech on widget close (Requirement 5.7)
  useEffect(() => {
    if (!isOpen) {
      cancelSpeech();
    }
  }, [isOpen, cancelSpeech]);

  // Handle streaming text updates
  useEffect(() => {
    if (isStreaming && streamedText) {
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last && last.isStreaming) {
          return [
            ...prev.slice(0, -1),
            { ...last, text: streamedText },
          ];
        }
        return prev;
      });
    }
  }, [streamedText, isStreaming]);

  /**
   * Send a message (text or file attachment).
   */
  const handleSend = useCallback(async () => {
    const trimmedInput = input.trim();
    if ((!trimmedInput && files.length === 0) || isLoading || isStreaming) return;

    const userMsg = trimmedInput || "📎 [File attachment]";
    setInput("");
    setChipsDisabled(true);

    // Add user message
    setMessages((prev) => [
      ...prev,
      { text: userMsg, sender: "user", files: [...files] },
    ]);

    // Add streaming placeholder for bot
    setMessages((prev) => [
      ...prev,
      { text: "", sender: "bot", isStreaming: true },
    ]);

    setIsLoading(true);
    setFiles([]);

    try {
      const result = await sendMessage(userMsg, sessionId, cartItems);

      // Replace streaming placeholder with final message
      setMessages((prev) => {
        const withoutStreaming = prev.filter((m) => !m.isStreaming);
        return [
          ...withoutStreaming,
          {
            text: result.text || "My taste buds are confused! Can you say that again? 🍛",
            sender: "bot",
            error: !!result.error,
          },
        ];
      });
    } catch {
      // Replace streaming placeholder with error message
      setMessages((prev) => {
        const withoutStreaming = prev.filter((m) => !m.isStreaming);
        return [
          ...withoutStreaming,
          {
            text: "🧞‍♂️ Genie is out of magic! Please check your internet.",
            sender: "bot",
            error: true,
          },
        ];
      });
    } finally {
      setIsLoading(false);
      setChipsDisabled(false);
    }
  }, [input, files, isLoading, isStreaming, sendMessage, sessionId, cartItems]);

  /**
   * Handle quick-action chip click — reuse handleSend by setting input.
   */
  const handleChipClick = useCallback((chipText) => {
    setInput(chipText);
  }, []);

  useEffect(() => {
    if (input && !isLoading && !isStreaming) {
      handleSend();
    }
  }, [input]); // eslint-disable-line react-hooks/exhaustive-deps

  /**
   * Start a new chat session.
   */
  const handleNewChat = useCallback(() => {
    startNewChat();
    resetStream();
    setMessages([
      {
        text: `Namaste${
          userInfo ? " " + userInfo.name : ""
        }! 🙏 I am SwadKart Genie 🧞‍♂️. Looking for a spicy recommendation or need help with an order?`,
        sender: "bot",
      },
    ]);
    setInput("");
    setFiles([]);
    setChipsDisabled(false);
  }, [startNewChat, resetStream, userInfo]);

  /**
   * Load a past conversation.
   */
  const handleSelectConversation = useCallback((conv) => {
    if (conv.messages && conv.messages.length > 0) {
      const loadedMessages = conv.messages.map((m) => ({
        text: m.content,
        sender: m.role === "user" ? "user" : "bot",
      }));
      setMessages(loadedMessages);
    }
    setShowPastConversations(false);
  }, []);

  /**
   * Handle file selection.
   */
  const handleFileChange = (e) => {
    const selected = Array.from(e.target.files || []);
    if (selected.length + files.length > 3) {
      setMessages((prev) => [
        ...prev,
        { text: "Max 3 files allowed, boss! 🚫", sender: "bot" },
      ]);
      return;
    }
    setFiles((prev) => [...prev, ...selected]);
  };

  const handleRemoveFile = (index) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  /**
   * Toggle mic on/off.
   */
  const handleToggleMic = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  // Mic button rendered as a slot for ChatInput (maintains tab order)
  const micButton = (
    <VoiceControls
      isListening={isListening}
      isRecognitionSupported={isRecognitionSupported}
      onToggleMic={handleToggleMic}
      isSynthesisSupported={isSynthesisSupported}
      readAloudEnabled={readAloudEnabled}
      onToggleReadAloud={toggleReadAloud}
      error={micError}
    />
  );

  return (
    <div className={`fixed z-[999] flex flex-col items-end font-sans ${isOpen && isMaximized ? "inset-0" : "bottom-6 right-6"}`}>
      {/* Chat Widget */}
      {isOpen && (
        <div
          className={`bg-gray-950 border border-gray-800 shadow-2xl overflow-hidden flex flex-col backdrop-blur-xl ${
            isMaximized
              ? "rounded-none w-full h-full"
              : "mb-4 rounded-[1.5rem]"
          }`}
          style={isMaximized ? undefined : widgetStyle}
          role="dialog"
          aria-label="SwadKart Genie Chat"
          aria-modal="false"
        >
          {/* Header */}
          <ChatHeader
            isMaximized={isMaximized}
            onToggleMaximize={toggleMaximize}
            onNewChat={handleNewChat}
            onClose={() => setIsOpen(false)}
          />

          {/* Past Conversations Panel — hidden in landscape constrained mode */}
          {!isLandscape && (
            <PastConversationsPanel
              isAuthenticated={!!userInfo}
              onSelectConversation={handleSelectConversation}
              isVisible={showPastConversations}
            />
          )}

          {/* Toggle past conversations button (only for authenticated users, not in landscape) */}
          {!!userInfo && !isLandscape && (
            <button
              onClick={() => setShowPastConversations((prev) => !prev)}
              className="text-[10px] text-gray-500 hover:text-gray-300 uppercase tracking-wider font-bold px-4 py-1 text-left transition-colors"
              aria-label={showPastConversations ? "Hide past conversations" : "Show past conversations"}
              aria-expanded={showPastConversations}
            >
              {showPastConversations ? "▲ Hide past chats" : "▼ Past chats"}
            </button>
          )}

          {/* Message List */}
          <ChatMessageList
            messages={messages}
            isLoading={isLoading && !isStreaming}
          />

          {/* Quick Action Chips */}
          <QuickActionChips
            lastAssistantMessage={lastAssistantMessage}
            sessionId={sessionId}
            onChipClick={handleChipClick}
            disabled={chipsDisabled || isLoading || isStreaming}
            messageCount={messages.length}
          />

          {/* Input Area */}
          <ChatInput
            input={input}
            onInputChange={setInput}
            onSend={handleSend}
            isLoading={isLoading || isStreaming}
            files={files}
            onFileChange={handleFileChange}
            onRemoveFile={handleRemoveFile}
            micButton={micButton}
            isOpen={isOpen}
          />
        </div>
      )}

      {/* Floating Action Button (FAB) — hidden when maximized */}
      {!(isMaximized && isOpen) && (
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="bg-primary hover:bg-red-600 text-white p-4 sm:p-5 rounded-[1.8rem] shadow-2xl shadow-primary/40 transition-all hover:scale-110 active:scale-95 group relative z-50 hover:rotate-3"
          aria-label={isOpen ? "Close chat" : "Open chat"}
        >
          {isOpen ? (
            <X size={24} />
          ) : (
            <div className="relative">
              <MessageCircle size={24} />
              <Sparkles
                size={12}
                className="absolute -top-2 -right-2 text-yellow-300 animate-bounce drop-shadow-md"
                aria-hidden="true"
              />
            </div>
          )}
        </button>
      )}
    </div>
  );
};

export default ChatBot;
