import { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send, Bot, Sparkles, RefreshCw } from "lucide-react";
import { useSelector } from "react-redux";
import { BASE_URL } from "../config";

const ChatBot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { userInfo } = useSelector((state) => state.user);

  const [messages, setMessages] = useState([
    {
      text: `Namaste${
        userInfo ? " " + userInfo.name : ""
      }! 🙏 I am SwadKart Genie 🧞‍♂️. Looking for a spicy recommendation or need help with an order?`,
      sender: "bot",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages, loading]);

  // Auto-focus input when chat opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMsg = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { text: userMsg, sender: "user" }]);
    setLoading(true);

    try {
      const res = await fetch(`${BASE_URL}/api/v1/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: userInfo ? `Bearer ${userInfo.token}` : "",
        },
        body: JSON.stringify({ message: userMsg }),
      });

      const data = await res.json();

      setMessages((prev) => [
        ...prev,
        {
          text:
            data.reply ||
            "My taste buds are confused! Can you say that again? 🍛",
          sender: "bot",
        },
      ]);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          text: "🧞‍♂️ Genie is out of magic! Please check your internet.",
          sender: "bot",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") handleSend();
  };

  return (
    <div className="fixed bottom-6 right-6 z-[999] flex flex-col items-end font-sans">
      {/* 🟢 CHAT WINDOW */}
      {isOpen && (
        <div className="mb-4 w-[90vw] md:w-96 bg-gray-950 border border-gray-800 rounded-[2rem] shadow-2xl overflow-hidden animate-in slide-in-from-bottom-8 duration-500 flex flex-col h-[550px] max-h-[80vh]">
          {/* Header */}
          <div className="bg-primary p-5 flex justify-between items-center shadow-lg">
            <div className="flex items-center gap-3 text-white">
              <div className="bg-white/20 p-2 rounded-xl backdrop-blur-md">
                <Bot size={22} />
              </div>
              <div>
                <h3 className="font-black italic uppercase tracking-tighter text-sm">
                  Genie <span className="text-black/60">Pro</span>
                </h3>
                <p className="text-[9px] font-bold text-white/70 flex items-center gap-1 uppercase tracking-widest">
                  <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></span>
                  AI Assistance
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="bg-black/20 hover:bg-black/40 p-2 rounded-full text-white transition-all"
            >
              <X size={18} />
            </button>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-black custom-scrollbar">
            {messages.map((msg, index) => (
              <div
                key={index}
                className={`flex ${
                  msg.sender === "user" ? "justify-end" : "justify-start"
                } animate-in fade-in slide-in-from-bottom-2`}
              >
                <div
                  className={`max-w-[85%] p-4 rounded-[1.5rem] text-sm leading-relaxed font-medium ${
                    msg.sender === "user"
                      ? "bg-primary text-white rounded-br-none shadow-lg shadow-primary/10"
                      : "bg-gray-900 text-gray-200 rounded-bl-none border border-gray-800 italic"
                  }`}
                >
                  <p className="whitespace-pre-line">{msg.text}</p>
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-gray-900 text-primary p-4 rounded-[1.5rem] rounded-bl-none border border-gray-800 text-xs flex items-center gap-3">
                  <RefreshCw size={14} className="animate-spin" />
                  <span className="font-black uppercase tracking-widest text-[10px]">
                    Genie is cooking a reply...
                  </span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-4 bg-gray-950 border-t border-gray-900 flex gap-2">
            <input
              ref={inputRef}
              type="text"
              placeholder="Hungry for help? Type here..."
              className="flex-1 bg-black border border-gray-800 text-white rounded-2xl px-5 py-3 text-sm focus:outline-none focus:border-primary transition-all placeholder:text-gray-600 font-medium"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
            />
            <button
              onClick={handleSend}
              disabled={loading || !input.trim()}
              className="bg-primary hover:bg-red-600 text-white p-3.5 rounded-2xl transition-all disabled:opacity-50 disabled:grayscale shadow-xl shadow-primary/20 active:scale-90"
            >
              <Send size={20} />
            </button>
          </div>
        </div>
      )}

      {/* 🔴 FLOATING BUTTON */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="bg-primary hover:bg-red-600 text-white p-5 rounded-[1.8rem] shadow-2xl shadow-primary/30 transition-all hover:scale-110 active:scale-95 group relative"
      >
        {isOpen ? (
          <X size={28} />
        ) : (
          <div className="relative">
            <MessageCircle size={28} />
            <Sparkles
              size={12}
              className="absolute -top-1 -right-1 text-yellow-300 animate-bounce"
            />
          </div>
        )}

        {/* Tooltip */}
        {!isOpen && (
          <span className="absolute right-full mr-4 top-1/2 -translate-y-1/2 bg-white text-black text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-xl whitespace-nowrap opacity-0 group-hover:opacity-100 transition-all pointer-events-none shadow-xl translate-x-4 group-hover:translate-x-0">
            Ask Swad Genie 🧞‍♂️
          </span>
        )}
      </button>
    </div>
  );
};

export default ChatBot;
