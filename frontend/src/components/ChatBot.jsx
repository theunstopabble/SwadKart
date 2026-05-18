import { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send, Bot, Sparkles, RefreshCw, Paperclip, File, XCircle } from "lucide-react";
import { useSelector } from "react-redux";
import { BASEURL } from "../config";

const ChatBot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { userInfo } = useSelector((state) => state.user);
  const { cartItems } = useSelector((state) => state.cart);

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
  const [files, setFiles] = useState([]);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);

  // 👈 FIX 1: Inline the scroll logic to remove useEffect dependency lint error
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen]);

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

  const removeFile = (index) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSend = async () => {
    const trimmedInput = input.trim();
    if ((!trimmedInput && files.length === 0) || loading) return;

    const userMsg = trimmedInput || "📎 [File attachment]";
    setInput("");
    setMessages((prev) => [
      ...prev,
      { text: userMsg, sender: "user", files: [...files] },
    ]);
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("message", trimmedInput);
      files.forEach((f) => formData.append("attachments", f));
      formData.append("cartItems", JSON.stringify(cartItems));

      const res = await fetch(`${BASEURL}/api/v1/chat`, {
        method: "POST",
        credentials: "include",
        body: formData,
      });
      setFiles([]);

      if (!res.ok) throw new Error("chat failed");

      let data;
      try {
        data = await res.json();
      } catch {
        data = { reply: "Genie is out of magic! Please check your internet." };
      }

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
      console.error("ChatBot Error:", error);
      setFiles([]);
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
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
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
                  {/* 📎 Attachment pills inside user message */}
                  {msg.files && msg.files.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {msg.files.map((f, fi) => (
                        <span
                          key={fi}
                          className="inline-flex items-center gap-1 bg-white/20 px-2 py-1 rounded-lg text-[10px] font-bold backdrop-blur-sm"
                        >
                          <File size={10} />
                          {f.name}
                        </span>
                      ))}
                    </div>
                  )}
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

          <div className="p-4 bg-gray-950 border-t border-gray-900">
            {/* 📎 Selected file chips */}
            {files.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {files.map((f, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 bg-primary/10 text-primary border border-primary/20 px-2 py-1 rounded-lg text-[10px] font-bold"
                  >
                    <File size={10} />
                    {f.name}
                    <button onClick={() => removeFile(i)} className="ml-1 hover:text-white">
                      <XCircle size={10} />
                    </button>
                  </span>
                ))}
              </div>
            )}

            <div className="flex items-center gap-2">
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={loading || files.length >= 3}
                className="text-gray-400 hover:text-primary transition-colors p-2 sm:p-3 rounded-2xl disabled:opacity-30 shrink-0"
                title="Attach file (PDF, TXT, DOCX, Image)"
              >
                <Paperclip size={18} />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".pdf,.txt,.docx,.doc,image/*"
                className="hidden"
                onChange={handleFileChange}
              />
              <input
                ref={inputRef}
                type="text"
                placeholder="Ask for food recommendations..."
                className="flex-1 min-w-0 bg-black border border-gray-800 text-white rounded-2xl px-3 sm:px-5 py-3 text-sm focus:outline-none focus:border-primary transition-all placeholder:text-gray-600 font-medium shadow-inner"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyPress}
              />
              <button
                onClick={handleSend}
                disabled={loading || (!input.trim() && files.length === 0)}
                className="bg-primary hover:bg-red-600 text-white p-3 sm:p-3.5 rounded-2xl transition-all disabled:opacity-50 disabled:grayscale shadow-xl shadow-primary/20 active:scale-90 hover:-translate-y-1 shrink-0"
              >
                <Send size={18} />
              </button>
            </div>
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
