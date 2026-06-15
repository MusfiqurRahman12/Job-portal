"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function PWAProvider({ children }: { children: React.ReactNode }) {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showTopBanner, setShowTopBanner] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    // Check if app is already installed/standalone
    if (window.matchMedia("(display-mode: standalone)").matches || (window.navigator as any).standalone) {
      setIsStandalone(true);
    }

    // Register Service Worker
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((registration) => console.log("Service Worker registered with scope:", registration.scope))
        .catch((err) => console.error("Service Worker registration failed:", err));
    }

    // Listen for the install prompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      
      // Only show banner if they haven't dismissed it before
      if (!localStorage.getItem("pwa-banner-dismissed") && !isStandalone) {
        setShowTopBanner(true);
      }
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, [isStandalone]);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        setDeferredPrompt(null);
        setShowTopBanner(false);
      }
    } else {
      // Fallback for iOS Safari - show alert guide
      alert("To install on iOS: tap the Share icon at the bottom of Safari, then select 'Add to Home Screen'.");
    }
  };

  const dismissBanner = () => {
    setShowTopBanner(false);
    localStorage.setItem("pwa-banner-dismissed", "true");
  };

  return (
    <>
      {/* Top Sticky Install Banner (Visible if prompt is ready and not dismissed) */}
      {showTopBanner && (
        <div className="fixed top-0 left-0 right-0 z-[200] bg-[rgba(139,92,246,0.15)] border-b border-[rgba(139,92,246,0.3)] backdrop-blur-md px-4 py-3 flex items-center justify-between text-sm shadow-[0_0_20px_rgba(139,92,246,0.2)]">
          <div className="flex items-center gap-3">
            <img src="/icons/icon-192x192.png" alt="FutureTalent Logo" className="w-8 h-8 rounded-md" />
            <div>
              <div className="font-bold text-white">FutureTalent App</div>
              <div className="text-xs text-[#a78bfa]">Install for a faster, offline experience</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleInstallClick} className="bg-[var(--accent-violet)] hover:bg-[var(--accent-violet-light)] text-white px-3 py-1.5 rounded-lg font-semibold transition-colors">
              Install
            </button>
            <button onClick={dismissBanner} className="text-[#94a3b8] hover:text-white p-1">
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Main App Content */}
      <div className={`${showTopBanner ? "pt-14" : ""} pb-20 md:pb-0 min-h-screen flex flex-col`}>
        {children}
      </div>

      {/* Mobile Bottom Navigation Bar (Hidden on desktop) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-[150] bg-[rgba(15,15,22,0.85)] backdrop-blur-xl border-t border-[var(--border-subtle)] pb-[env(safe-area-inset-bottom)]">
        <div className="flex items-center justify-around px-2 py-3">
          
          <Link href="/" className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-colors ${pathname === "/" ? "text-[var(--accent-violet-light)]" : "text-[#64748b] hover:text-white"}`}>
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            <span className="text-[0.65rem] font-medium">Home</span>
          </Link>

          <Link href="/jobs" className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-colors ${pathname?.startsWith("/jobs") ? "text-[var(--accent-violet-light)]" : "text-[#64748b] hover:text-white"}`}>
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            <span className="text-[0.65rem] font-medium">Jobs</span>
          </Link>

          <Link href="/companies" className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-colors ${pathname?.startsWith("/companies") ? "text-[var(--accent-violet-light)]" : "text-[#64748b] hover:text-white"}`}>
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            <span className="text-[0.65rem] font-medium">Companies</span>
          </Link>

          <Link href="/blog" className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-colors ${pathname?.startsWith("/blog") ? "text-[var(--accent-violet-light)]" : "text-[#64748b] hover:text-white"}`}>
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9.5a2.5 2.5 0 00-2.5-2.5H14" />
            </svg>
            <span className="text-[0.65rem] font-medium">Blog</span>
          </Link>

          {/* Dynamic Install/App Button */}
          {!isStandalone && (
            <button onClick={handleInstallClick} className="flex flex-col items-center gap-1 p-2 rounded-xl text-[#34d399] hover:text-[#10b981] transition-colors relative">
              <span className="absolute top-1 right-1 w-2 h-2 bg-[#10b981] rounded-full animate-pulse"></span>
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              <span className="text-[0.65rem] font-bold">Install</span>
            </button>
          )}

        </div>
      </nav>
    </>
  );
}
