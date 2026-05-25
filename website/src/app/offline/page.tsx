"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export default function OfflinePage() {
  const [isOnline, setIsOnline] = useState(false);

  useEffect(() => {
    // Basic check for returning online
    const checkOnline = () => {
      if (navigator.onLine) {
        setIsOnline(true);
        window.location.reload();
      }
    };

    window.addEventListener("online", checkOnline);
    return () => window.removeEventListener("online", checkOnline);
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center p-6 text-center">
      <div className="max-w-md w-full glass-card py-12 px-8">
        <div className="w-16 h-16 mx-auto bg-[rgba(251,113,133,0.1)] border border-[rgba(251,113,133,0.2)] rounded-full flex items-center justify-center text-3xl mb-6">
          📡
        </div>
        <h1 className="text-2xl font-bold text-white mb-3">You're Offline</h1>
        <p className="text-[#94a3b8] text-[0.95rem] mb-8 leading-relaxed">
          It looks like you've lost your internet connection. We couldn't load this page from the cache.
        </p>
        
        <button
          onClick={() => window.location.reload()}
          className="w-full py-3 rounded-xl font-semibold text-white transition-all duration-300 hover:scale-[1.02]"
          style={{ background: "var(--gradient-primary)" }}
        >
          Try Again
        </button>

        <div className="mt-4">
          <Link href="/" className="text-[#a78bfa] text-sm hover:underline">
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
