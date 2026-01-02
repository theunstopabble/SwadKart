import React, { useEffect } from "react";
import { Check, Copy } from "lucide-react";
import confetti from "canvas-confetti"; // 👈 Import Confetti

const SuccessScreen = ({ countdown, paymentDetails, totalPrice }) => {
  useEffect(() => {
    // 🎉 Confetti Animation Logic
    const duration = 3 * 1000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

    const randomInRange = (min, max) => Math.random() * (max - min) + min;

    const interval = setInterval(function () {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        return clearInterval(interval);
      }

      const particleCount = 50 * (timeLeft / duration);
      // Dono sides se पटाखे fodne ke liye
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
      });
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
      });
    }, 250);

    return () => clearInterval(interval);
  }, []);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(paymentDetails.id);
    alert("Payment ID Copied!");
  };

  return (
    <div className="fixed inset-0 bg-[#0cbf66] z-[9999] flex flex-col items-center justify-between py-12 px-6 text-white animate-in fade-in duration-300 overflow-hidden">
      {/* Top Section */}
      <div className="text-center space-y-2 mt-8">
        <p className="text-green-100 text-sm font-medium bg-white/10 px-4 py-1 rounded-full backdrop-blur-md inline-block">
          Redirecting in {countdown}s
        </p>
        <h1 className="text-4xl font-black tracking-tighter uppercase italic">
          Order Placed!
        </h1>
      </div>

      {/* Middle Animated Icon */}
      <div className="relative flex items-center justify-center">
        <div className="absolute w-32 h-32 bg-[#3ed186] rounded-full animate-ping opacity-75"></div>
        <div className="relative w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-2xl">
          <Check
            size={48}
            strokeWidth={4}
            className="text-[#0cbf66] drop-shadow-md"
          />
        </div>
      </div>

      {/* Bottom Receipt Card */}
      <div className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-[0_20px_50px_rgba(0,0,0,0.2)] text-gray-800 transform transition-all hover:scale-[1.02]">
        <div className="flex justify-between items-center mb-1 font-black text-xl text-black border-b border-gray-100 pb-4">
          <span className="tracking-tighter italic">SWADKART</span>
          <span className="text-primary">₹{totalPrice}</span>
        </div>

        <div className="py-4 space-y-3">
          <div className="flex justify-between text-xs font-bold text-gray-400 uppercase tracking-widest">
            <span>Status</span>
            <span className="text-green-600">Paid & Confirmed</span>
          </div>
          <div className="flex justify-between text-xs font-bold text-gray-400 uppercase tracking-widest">
            <span>Date</span>
            <span className="text-gray-700">{paymentDetails.date}</span>
          </div>
        </div>

        <div className="flex items-center justify-between bg-gray-50 p-4 rounded-2xl border border-gray-100 group">
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-gray-400 uppercase">
              Payment ID
            </span>
            <span className="text-sm font-mono font-medium text-gray-700 truncate w-44">
              {paymentDetails.id}
            </span>
          </div>
          <button
            onClick={copyToClipboard}
            className="p-2 bg-white rounded-full shadow-sm hover:text-primary transition-colors"
          >
            <Copy size={18} />
          </button>
        </div>

        <div className="mt-6 text-center">
          <p className="text-[10px] text-gray-400 font-medium">
            A confirmation email has been sent to your inbox.
          </p>
        </div>
      </div>

      {/* Footer Branding */}
      <div className="text-center opacity-80 mb-4">
        <p className="text-[10px] font-bold tracking-[0.2em] uppercase">
          Powered by <span className="text-lg italic ml-1">Razorpay</span>
        </p>
      </div>
    </div>
  );
};

export default SuccessScreen;
