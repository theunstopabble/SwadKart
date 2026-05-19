import { Mic, MicOff, Volume2, VolumeX } from "lucide-react";

/**
 * Voice control buttons: mic button with accessible label and read-aloud toggle.
 *
 * Requirements: 5.1, 5.2, 5.3, 5.6, 5.7
 *
 * @param {{
 *   isListening: boolean,
 *   isRecognitionSupported: boolean,
 *   onToggleMic: () => void,
 *   isSpeaking: boolean,
 *   isSynthesisSupported: boolean,
 *   readAloudEnabled: boolean,
 *   onToggleReadAloud: () => void,
 *   error: string | null,
 * }} props
 */
const VoiceControls = ({
  isListening,
  isRecognitionSupported,
  onToggleMic,
  isSynthesisSupported,
  readAloudEnabled,
  onToggleReadAloud,
  error,
}) => {
  return (
    <div className="flex items-center gap-1">
      {/* Mic button — only render if browser supports speech recognition */}
      {isRecognitionSupported && (
        <button
          onClick={onToggleMic}
          className={`p-2 sm:p-3 rounded-2xl transition-all shrink-0 ${
            isListening
              ? "bg-red-500/20 text-red-400 animate-pulse border border-red-500/30"
              : "text-gray-400 hover:text-primary"
          } ${error ? "ring-1 ring-red-500/50" : ""}`}
          aria-label={isListening ? "Stop voice input" : "Start voice input"}
          title={error ? `Voice error: ${error}` : isListening ? "Listening..." : "Start voice input"}
          tabIndex={0}
        >
          {isListening ? <MicOff size={18} /> : <Mic size={18} />}
        </button>
      )}

      {/* Read-aloud toggle — only render if browser supports speech synthesis */}
      {isSynthesisSupported && (
        <button
          onClick={onToggleReadAloud}
          className={`p-2 rounded-2xl transition-all shrink-0 ${
            readAloudEnabled
              ? "text-primary bg-primary/10"
              : "text-gray-500 hover:text-gray-300"
          }`}
          aria-label={readAloudEnabled ? "Disable read replies aloud" : "Enable read replies aloud"}
          aria-pressed={readAloudEnabled}
          tabIndex={0}
        >
          {readAloudEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
        </button>
      )}
    </div>
  );
};

export default VoiceControls;
