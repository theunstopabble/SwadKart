import { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send, Bot, User, Sparkles } from "lucide-react";
import { BASE_URL } from "../config";

const ChatBot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      text: "Namaste! 🙏 I am SwadKart Genie 🧞‍♂️. What are you craving today? (e.g., Spicy Burger, Paneer, or something sweet?)",
      sender: "bot",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  // Auto-scroll to bottom
  const messagesEndRef = useRef(null);
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };
  useEffect(scrollToBottom, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage = input;
    setInput("");

    // Add User Message
    setMessages((prev) => [...prev, { text: userMessage, sender: "user" }]);
    setLoading(true);

    try {
      const res = await fetch(`${BASE_URL}/api/v1/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMessage }),
      });

      const data = await res.json();

      // Add Bot Response
      setMessages((prev) => [
        ...prev,
        {
          text: data.reply || "Sorry, I am sleepy right now! 😴",
          sender: "bot",
        },
      ]);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        { text: "Network error! Please check your connection.", sender: "bot" },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") handleSend();
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      {/* 🟢 CHAT WINDOW */}
      {isOpen && (
        <div className="mb-4 w-80 md:w-96 bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-5 duration-300 flex flex-col h-[500px]">
          {/* Header */}
          <div className="bg-gradient-to-r from-primary to-red-700 p-4 flex justify-between items-center">
            <div className="flex items-center gap-2 text-white">
              <div className="bg-white/20 p-1.5 rounded-full">
                <Bot size={20} />
              </div>
              <div>
                <h3 className="font-bold text-sm">SwadKart Genie 🧞‍♂️</h3>
                <p className="text-[10px] text-white/80 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></span>
                  Online
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-white/80 hover:text-white transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-black/95 custom-scrollbar">
            {messages.map((msg, index) => (
              <div
                key={index}
                className={`flex ${
                  msg.sender === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-[80%] p-3 rounded-2xl text-sm leading-relaxed ${
                    msg.sender === "user"
                      ? "bg-primary text-white rounded-br-none"
                      : "bg-gray-800 text-gray-200 rounded-bl-none border border-gray-700"
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-gray-800 text-gray-400 p-3 rounded-2xl rounded-bl-none text-xs flex items-center gap-1">
                  <Sparkles size={12} className="animate-spin" /> Thinking...
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-3 bg-gray-900 border-t border-gray-800 flex gap-2">
            <input
              type="text"
              placeholder="Ask me about food..."
              className="flex-1 bg-black border border-gray-700 text-white rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-primary transition-all"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
            />
            <button
              onClick={handleSend}
              disabled={loading || !input.trim()}
              className="bg-primary hover:bg-red-600 text-white p-2.5 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send size={18} />
            </button>
          </div>
        </div>
      )}

      {/* 🔴 FLOATING BUTTON (FAB) */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="bg-primary hover:bg-red-600 text-white p-4 rounded-full shadow-lg shadow-primary/30 transition-all hover:scale-110 active:scale-95 group relative"
      >
        {isOpen ? <X size={28} /> : <MessageCircle size={28} />}

        {/* Tooltip hint if closed */}
        {!isOpen && (
          <span className="absolute right-full mr-3 top-1/2 -translate-y-1/2 bg-white text-black text-xs font-bold px-3 py-1.5 rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-md">
            Chat with Genie 🧞‍♂️
          </span>
        )}
      </button>
    </div>
  );
};

export default ChatBot;
