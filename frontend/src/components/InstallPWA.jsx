import React, { useEffect, useState } from "react";
import { Download, Smartphone } from "lucide-react";

const InstallPWA = () => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);

  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsVisible(true);
    };

    window.addEventListener("beforeinstallprompt", handler);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    try {
      const result = await deferredPrompt.prompt();
      const { outcome } = result?.userChoice || {};

      if (outcome === "accepted") {
        console.log("User accepted the install prompt");
      }
    } catch {
      console.warn("PWA install prompt not supported in this browser");
    } finally {
      setDeferredPrompt(null);
      setIsVisible(false);
    }
  };

  if (!isVisible) return null;

  return (
    <button
      onClick={handleInstallClick}
      className="
        flex items-center justify-center
        bg-gray-800/80 hover:bg-primary text-white
        border border-gray-700 hover:border-primary
        p-1.5 md:px-4 md:py-2
        rounded-full
        transition-all duration-300 active:scale-95
        shadow-lg backdrop-blur-sm
      "
    >
      <Download size={16} className="md:hidden" />
      <span className="hidden md:flex md:items-center md:gap-2">
        <Smartphone size={14} />
        <span className="whitespace-nowrap text-[10px] md:text-xs font-bold uppercase tracking-widest">Install</span>
        <Download size={12} className="animate-bounce" />
      </span>
    </button>
  );
};

export default InstallPWA;
