import React, { useState } from "react";
import { Lock } from "lucide-react";

const OTPSection = ({ orderId, otpValue, onOtpChange, onVerify }) => {
  const [verifying, setVerifying] = useState(false);

  const handleVerify = () => {
    if (!orderId || !onVerify) return;
    if (!otpValue || otpValue.length !== 4 || !/^\d{4}$/.test(otpValue)) return;
    setVerifying(true);
    onVerify(orderId);
    setVerifying(false);
  };

  return (
    <div className="bg-black/30 p-3 sm:p-4 rounded-xl border border-gray-700 mt-3 sm:mt-4">
      <p className="text-[9px] sm:text-[10px] text-gray-400 font-bold uppercase mb-2 flex items-center gap-1">
        <Lock size={10} className="shrink-0" /> Customer OTP Required
      </p>
      <div className="flex gap-2">
        <input
          type="text"
          inputMode="numeric"
          maxLength={4}
          placeholder="OTP"
          className="bg-black border border-gray-600 text-white text-center font-mono text-base sm:text-lg tracking-widest rounded-lg w-16 sm:w-20 focus:border-blue-500 outline-none"
          value={otpValue || ""}
          onChange={(e) => onOtpChange(e.target.value.replace(/\D/g, "").slice(0, 4))}
        />
        <button
          onClick={handleVerify}
          disabled={verifying || !otpValue || otpValue.length !== 4}
          className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 px-2 sm:px-4 rounded-lg shadow-lg transition-transform active:scale-95 text-xs sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {verifying ? "..." : "Verify & Finish"}
        </button>
      </div>
    </div>
  );
};

export default OTPSection;
