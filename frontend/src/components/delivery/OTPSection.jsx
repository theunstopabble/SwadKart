import React from "react";
import { Lock } from "lucide-react";

const OTPSection = ({ orderId, otpValue, setOtpInputs, onVerify }) => (
  <div className="bg-black/30 p-4 rounded-xl border border-gray-700 mt-4">
    <p className="text-[10px] text-gray-400 font-bold uppercase mb-2 flex items-center gap-1">
      <Lock size={10} /> Customer OTP Required
    </p>
    <div className="flex gap-2">
      <input
        type="text"
        maxLength={4}
        placeholder="OTP"
        className="bg-black border border-gray-600 text-white text-center font-mono text-lg tracking-widest rounded-lg w-20 focus:border-blue-500 outline-none"
        value={otpValue || ""}
        onChange={(e) =>
          setOtpInputs((prev) => ({ ...prev, [orderId]: e.target.value }))
        }
      />
      <button
        onClick={() => onVerify(orderId)}
        className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 px-4 rounded-lg shadow-lg transition-transform active:scale-95 text-sm"
      >
        Verify & Finish
      </button>
    </div>
  </div>
);

export default OTPSection;
