import React, { useEffect, useState } from "react";
import { Download, Smartphone } from "lucide-react";

const InstallPWA = () => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);

  // ✅ FIX: Default false rakha hai taaki button shuru me na dikhe
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handler = (e) => {
      // Browser se signal milega tabhi ye function chalega
      e.preventDefault();
      setDeferredPrompt(e);
      setIsVisible(true); // ✅ Signal milne par hi button dikhao
    };

    window.addEventListener("beforeinstallprompt", handler);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();

    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === "accepted") {
      console.log("User accepted the install prompt");
      setDeferredPrompt(null);
      setIsVisible(false); // ✅ Install hone ke baad button gayab
    }
  };

  // ✅ REAL LOGIC: Agar browser ne signal nahi diya (matlab app pehle se hai), to kuch mat dikhao
  if (!isVisible) return null;

  return (
    <button
      onClick={handleInstallClick}
      className="
        flex items-center gap-2 
        bg-gray-800/80 hover:bg-primary text-white 
        border border-gray-700 hover:border-primary
        px-3 py-1.5 md:px-4 md:py-2 
        rounded-full text-[10px] md:text-xs font-bold uppercase tracking-widest 
        transition-all duration-300 transform active:scale-95
        shadow-lg backdrop-blur-sm
      "
    >
      <Smartphone size={14} className="md:w-4 md:h-4" />
      <span className="whitespace-nowrap">Install</span>
      <Download size={12} className="animate-bounce md:w-3.5 md:h-3.5" />
    </button>
  );
};

export default InstallPWA;
