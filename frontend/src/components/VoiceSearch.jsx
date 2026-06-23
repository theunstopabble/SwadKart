import { useState, useRef, useEffect } from "react";
import { Mic, MicOff, Globe } from "lucide-react";
import { toast } from "react-hot-toast";

const VoiceSearch = ({ setSearchTerm }) => {
  const [isListening, setIsListening] = useState(false);
  const [lang, setLang] = useState("en-IN");
  const recognitionRef = useRef(null);

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
        recognitionRef.current = null;
      }
    };
  }, []);

  const startListening = () => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      return toast.error("Browser doesn't support Voice Search 😔");
    }

    if (recognitionRef.current) {
      recognitionRef.current.abort();
    }

    const recognition = new SpeechRecognition();
    recognition.lang = lang;
    recognition.continuous = false;
    recognition.interimResults = false;
    recognitionRef.current = recognition;

    recognition.onstart = () => {
      setIsListening(true);
      toast.success(lang === "hi-IN" ? "सुन रहा हूँ... बोलिए! 🎙️" : "Listening... Speak now! 🎙️");
    };

    recognition.onend = () => {
      setIsListening(false);
      recognitionRef.current = null;
    };

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setSearchTerm(transcript);
      toast.success(`Search: "${transcript}"`);
    };

    recognition.onerror = (event) => {
      setIsListening(false);
      recognitionRef.current = null;
      if (event.error === "aborted") return;
      console.error("Speech recognition error:", event.error);
      toast.error("Didn't catch that. Try again?");
    };

    recognition.start();
  };

  return (
    <div className="flex items-center gap-1">
      <button
        onClick={() => setLang(lang === "en-IN" ? "hi-IN" : "en-IN")}
        className="p-2 rounded-full text-[10px] font-bold text-gray-400 hover:text-primary transition-colors"
        title={lang === "en-IN" ? "Switch to Hindi" : "Switch to English"}
      >
        <Globe size={14} />
      </button>
      <button
        onClick={startListening}
        disabled={isListening}
        className={`p-3 rounded-full transition-all duration-300 flex items-center justify-center ${
          isListening
            ? "bg-red-600 text-white shadow-[0_0_15px_rgba(220,38,38,0.7)] animate-pulse scale-110"
            : "bg-gray-800 text-gray-400 hover:text-primary hover:bg-gray-700"
        }`}
        title={`Voice Search (${lang === "en-IN" ? "English" : "Hindi"})`}
      >
        {isListening ? <MicOff size={20} /> : <Mic size={20} />}
      </button>
    </div>
  );
};

export default VoiceSearch;
