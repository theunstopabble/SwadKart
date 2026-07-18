import { X, Maximize2, Minimize2, MessageSquarePlus, Bot } from "lucide-react";

/**
 * Chat widget header with title, maximize/restore, new chat, and close controls.
 *
 * Requirements: 1.7, 13.5, 13.6, 13.7
 *
 * @param {{ isMaximized: boolean, onToggleMaximize: () => void, onNewChat: () => void, onClose: () => void }} props
 */
const ChatHeader = ({ isMaximized, onToggleMaximize, onNewChat, onClose }) => {
 return (
 <div className="bg-primary p-3 sm:p-4 flex justify-between items-center shadow-lg shrink-0">
 <div className="flex items-center gap-3 text-white">
 <div className="bg-white/20 p-2 rounded-xl backdrop-blur-md shadow-inner">
 <Bot size={20} aria-hidden="true" />
 </div>
 <div>
 <h3 className="font-black uppercase tracking-tighter text-sm">
 Genie <span className="text-black/60">Pro</span>
 </h3>
 <p className="text-[9px] font-bold text-white/80 flex items-center gap-1.5 uppercase tracking-widest">
 <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse shadow-[0_0_8px_rgba(74,222,128,0.8)]"></span>
 AI Online
 </p>
 </div>
 </div>

 <div className="flex items-center gap-1">
 {/* New Chat button */}
 <button
 onClick={onNewChat}
 className="bg-black/20 hover:bg-black/40 p-2 rounded-full text-white transition-all"
 aria-label="Start new chat"
 tabIndex={0}
 >
 <MessageSquarePlus size={16} />
 </button>

 {/* Maximize/Restore */}
 <button
 onClick={onToggleMaximize}
 className="bg-black/20 hover:bg-black/40 p-2 rounded-full text-white transition-all"
 aria-label={isMaximized ? "Restore chat size" : "Maximize chat"}
 tabIndex={0}
 >
 {isMaximized ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
 </button>

 {/* Close button */}
 <button
 onClick={onClose}
 className="bg-black/20 hover:bg-black/40 p-2 rounded-full text-white transition-all hover:rotate-90 duration-300"
 aria-label="Close chat"
 tabIndex={0}
 >
 <X size={16} />
 </button>
 </div>
 </div>
 );
};

export default ChatHeader;
