import React, { useEffect, useState } from "react";
import { Download, Smartphone } from "lucide-react";

const InstallPWA = () => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handler = (e) => {
      // Prevent Chrome 67 and earlier from automatically showing the prompt
      e.preventDefault();
      // Stash the event so it can be triggered later.
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

    // Show the install prompt
    deferredPrompt.prompt();

    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === "accepted") {
      console.log("User accepted the install prompt");
    } else {
      console.log("User dismissed the install prompt");
    }

    // We no longer need the prompt. Clear it up
    setDeferredPrompt(null);
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <button
      onClick={handleInstallClick}
      // 👇 FIX: 'hidden' class hata di taaki Mobile pe bhi dikhe
      className="flex items-center gap-2 bg-gray-800 hover:bg-primary text-white px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest transition-all shadow-lg border border-gray-700 hover:border-primary animate-in fade-in slide-in-from-top-4 cursor-pointer"
    >
      <Smartphone size={16} />
      <span>Install App</span>
      <Download size={14} className="animate-bounce" />
    </button>
  );
};

export default InstallPWA;
