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
      {isOpen && (
        <div className="mb-4 w-[90vw] md:w-96 bg-gray-950 border border-gray-800 rounded-[2rem] shadow-2xl overflow-hidden animate-in slide-in-from-bottom-8 duration-500 flex flex-col h-[550px] max-h-[80vh] backdrop-blur-xl">
          <div className="bg-primary p-5 flex justify-between items-center shadow-lg">
            <div className="flex items-center gap-3 text-white">
              <div className="bg-white/20 p-2 rounded-xl backdrop-blur-md shadow-inner">
                <Bot size={22} />
              </div>
              <div>
                <h3 className="font-black italic uppercase tracking-tighter text-sm">
                  Genie <span className="text-black/60">Pro</span>
                </h3>
                <p className="text-[9px] font-bold text-white/80 flex items-center gap-1.5 uppercase tracking-widest">
                  <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse shadow-[0_0_8px_rgba(74,222,128,0.8)]"></span>
                  AI Online
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="bg-black/20 hover:bg-black/40 p-2 rounded-full text-white transition-all hover:rotate-90 duration-300"
            >
              <X size={18} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-black/95 custom-scrollbar">
            {messages.map((msg, index) => (
              <div
                key={index}
                className={`flex ${
                  msg.sender === "user" ? "justify-end" : "justify-start"
                } animate-in fade-in slide-in-from-bottom-2`}
              >
                <div
                  className={`max-w-[85%] p-4 rounded-[1.5rem] text-sm leading-relaxed font-medium shadow-md ${
                    msg.sender === "user"
                      ? "bg-primary text-white rounded-br-none shadow-primary/10"
                      : "bg-gray-900 text-gray-200 rounded-bl-none border border-gray-800"
                  }`}
                >
                  <p className="whitespace-pre-line">{msg.text}</p>
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-gray-900 text-primary p-4 rounded-[1.5rem] rounded-bl-none border border-gray-800 text-xs flex items-center gap-3 animate-pulse">
                  <RefreshCw size={14} className="animate-spin" />
                  <span className="font-black uppercase tracking-widest text-[10px]">
                    Genie is cooking...
                  </span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="p-4 bg-gray-950 border-t border-gray-900 flex gap-2">
            <input
              ref={inputRef}
              type="text"
              placeholder="Ask for food recommendations..."
              className="flex-1 bg-black border border-gray-800 text-white rounded-2xl px-5 py-3 text-sm focus:outline-none focus:border-primary transition-all placeholder:text-gray-600 font-medium shadow-inner"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
            />
            <button
              onClick={handleSend}
              disabled={loading || !input.trim()}
              className="bg-primary hover:bg-red-600 text-white p-3.5 rounded-2xl transition-all disabled:opacity-50 disabled:grayscale shadow-xl shadow-primary/20 active:scale-90 hover:-translate-y-1"
            >
              <Send size={20} />
            </button>
          </div>
        </div>
      )}

      <button
        onClick={() => setIsOpen(!isOpen)}
        className="bg-primary hover:bg-red-600 text-white p-5 rounded-[1.8rem] shadow-2xl shadow-primary/40 transition-all hover:scale-110 active:scale-95 group relative z-50 hover:rotate-3"
      >
        {isOpen ? (
          <X size={28} />
        ) : (
          <div className="relative">
            <MessageCircle size={28} />
            <Sparkles
              size={14}
              className="absolute -top-2 -right-2 text-yellow-300 animate-bounce drop-shadow-md"
            />
          </div>
        )}
      </button>
    </div>
  );
};

export default ChatBot;
