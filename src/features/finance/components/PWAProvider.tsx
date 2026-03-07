// src/features/finance/components/PWAProvider.tsx
"use client";

import { useEffect, useState } from "react";

export function PWAProvider() {
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Register service worker
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((registration) => {
          console.log("SW registered:", registration.scope);
        })
        .catch((error) => {
          console.error("SW registration failed:", error);
        });
    }

    // Check if already installed
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
    }

    // Listen for install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt
      );
    };
  }, []);

  const handleInstall = async () => {
    if (!installPrompt) return;

    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;

    if (outcome === "accepted") {
      setIsInstalled(true);
    }

    setInstallPrompt(null);
  };

  // Don't show install button if already installed or no prompt
  if (isInstalled || !installPrompt) {
    return null;
  }

  return (
    <div className="fixed bottom-24 right-6 z-30 pointer-events-none">
      <button
        onClick={handleInstall}
        className="pointer-events-auto bg-zinc-900/80 backdrop-blur-md hover:bg-zinc-800 text-zinc-100 px-5 py-3 rounded-2xl shadow-[0_0_20px_rgba(0,0,0,0.5)] border border-white/10 flex items-center gap-3 transition-all active:scale-95 group"
      >
        <div className="p-1.5 bg-indigo-500/10 rounded-lg group-hover:bg-indigo-500/20 transition-colors">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-indigo-400 drop-shadow-sm"
          >
            <path d="M12 2v20M2 12h20" />
          </svg>
        </div>
        <span className="text-xs font-bold tracking-wide">Add to Home Screen</span>
      </button>
    </div>
  );
}
