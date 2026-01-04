import React, { useState } from "react";
import { Mic, MicOff } from "lucide-react";
import { toast } from "react-hot-toast";

const VoiceSearch = ({ setSearchTerm }) => {
  const [isListening, setIsListening] = useState(false);

  const startListening = () => {
    // Check browser support
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      return toast.error("Browser doesn't support Voice Search 😔");
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "en-IN"; // English (India) for better accent support
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => {
      setIsListening(true);
      toast.success("Listening... Speak now! 🎙️");
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setSearchTerm(transcript); // Send text back to Home component
      toast.success(`Search: "${transcript}"`);
    };

    recognition.onerror = (event) => {
      setIsListening(false);
      console.error(event.error);
      toast.error("Didn't catch that. Try again?");
    };

    recognition.start();
  };

  return (
    <button
      onClick={startListening}
      className={`p-3 rounded-full transition-all duration-300 flex items-center justify-center ${
        isListening
          ? "bg-red-600 text-white shadow-[0_0_15px_rgba(220,38,38,0.7)] animate-pulse scale-110"
          : "bg-gray-800 text-gray-400 hover:text-primary hover:bg-gray-700"
      }`}
      title="Voice Search"
    >
      {isListening ? <MicOff size={20} /> : <Mic size={20} />}
    </button>
  );
};

export default VoiceSearch;
