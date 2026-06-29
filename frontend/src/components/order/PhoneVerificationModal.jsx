import React, { useState } from "react";
import { toast } from "react-hot-toast";
import { useDispatch } from "react-redux";
import { setCredentials } from "../../redux/userSlice";
import { BASEURL } from "../../config";
import { Phone, ArrowRight, RotateCcw, X } from "lucide-react";

const PhoneVerificationModal = ({ onClose, onVerified }) => {
  const [step, setStep] = useState("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const dispatch = useDispatch();

  const startCooldown = () => {
    setCooldown(30);
    const timer = setInterval(() => {
      setCooldown((c) => {
        if (c <= 1) { clearInterval(timer); return 0; }
        return c - 1;
      });
    }, 1000);
  };

  const sendOTP = async () => {
    const phoneRegex = /^[6-9]\d{9}$/;
    if (!phoneRegex.test(phone)) {
      return toast.error("Please enter a valid 10-digit Indian phone number");
    }
    setLoading(true);
    try {
      const res = await fetch(`${BASEURL}/api/v1/whatsapp/send-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ phone }),
      });
      if (res.ok) {
        toast.success("OTP sent to your WhatsApp!");
        setStep("otp");
        startCooldown();
      } else {
        const err = await res.json();
        toast.error(err.message || "Failed to send OTP");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setLoading(false);
    }
  };

  const verifyOTP = async () => {
    if (!otp || otp.length < 4) {
      return toast.error("Enter the OTP received on WhatsApp");
    }
    setLoading(true);
    try {
      const res = await fetch(`${BASEURL}/api/v1/whatsapp/verify-phone-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ otp }),
      });
      if (res.ok) {
        const data = await res.json();
        dispatch(setCredentials(data.user));
        toast.success("Phone verified! 🎉");
        onVerified(data.user);
      } else {
        const err = await res.json();
        toast.error(err.message || "Invalid OTP");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[9999] flex items-center justify-center p-6">
      <div className="bg-gray-900 border border-gray-800 p-8 rounded-[2.5rem] w-full max-w-sm shadow-2xl relative">
        <button onClick={onClose} className="absolute top-6 right-6 text-gray-500 hover:text-white">
          <X size={20} />
        </button>

        <h2 className="text-2xl font-black italic uppercase text-white mb-2">
          {step === "phone" ? "Verify Your" : "Enter"} <span className="text-primary">Phone</span> 📞
        </h2>
        <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest mb-8">
          {step === "phone"
            ? "Required for delivery updates"
            : "Check WhatsApp for the OTP"}
        </p>

        {step === "phone" ? (
          <div className="space-y-4">
            <div className="relative group">
              <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
              <input
                type="tel"
                placeholder="98765 43210"
                maxLength={10}
                className="w-full bg-black border border-gray-800 p-4 pl-12 rounded-xl text-white outline-none focus:border-primary font-bold tracking-widest transition-all"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
              />
            </div>
            <button
              onClick={sendOTP}
              disabled={loading}
              className="w-full bg-primary hover:bg-red-600 text-white py-4 rounded-xl font-black uppercase text-xs tracking-[0.2em] shadow-lg shadow-primary/20 transition-all active:scale-95 flex justify-center items-center gap-2"
            >
              {loading ? "Sending..." : <>Send OTP <ArrowRight size={16} /></>}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="relative group">
              <input
                type="text"
                placeholder="Enter OTP"
                maxLength={6}
                className="w-full bg-black border border-gray-800 p-4 rounded-xl text-white outline-none focus:border-primary font-bold tracking-[0.3em] text-center text-2xl transition-all"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
              />
            </div>
            <button
              onClick={verifyOTP}
              disabled={loading}
              className="w-full bg-primary hover:bg-red-600 text-white py-4 rounded-xl font-black uppercase text-xs tracking-[0.2em] shadow-lg shadow-primary/20 transition-all active:scale-95"
            >
              {loading ? "Verifying..." : "Verify OTP"}
            </button>
            <button
              onClick={sendOTP}
              disabled={loading || cooldown > 0}
              className="w-full text-gray-500 hover:text-white py-2 rounded-xl font-bold text-xs uppercase tracking-widest transition-colors flex items-center justify-center gap-2"
            >
              <RotateCcw size={14} />
              {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend OTP"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default PhoneVerificationModal;
