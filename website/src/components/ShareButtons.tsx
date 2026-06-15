"use client";

import React, { useState, useEffect } from "react";

interface ShareButtonsProps {
  url?: string;
  title: string;
  size?: "sm" | "md";
  layout?: "row" | "col";
}

export default function ShareButtons({ url, title, size = "md", layout = "row" }: ShareButtonsProps) {
  const [shareUrl, setShareUrl] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // Fallback to window.location.href if url is not passed from a server component
    setShareUrl(url || window.location.href);
  }, [url]);

  const handleShareX = () => {
    const shareLink = `https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(title)}`;
    window.open(shareLink, "_blank", "width=600,height=400");
  };

  const handleShareLinkedIn = () => {
    const shareLink = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`;
    window.open(shareLink, "_blank", "width=600,height=600");
  };

  const handleShareWhatsApp = () => {
    const shareLink = `https://api.whatsapp.com/send?text=${encodeURIComponent(title + " - " + shareUrl)}`;
    window.open(shareLink, "_blank");
  };

  const handleShareTruthSocial = () => {
    const shareLink = `https://truthsocial.com/share?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(title)}`;
    window.open(shareLink, "_blank", "width=600,height=650");
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const buttonClass = size === "sm"
    ? "w-8 h-8 rounded-full border border-white/10 flex items-center justify-center text-[#94a3b8] transition-all hover:scale-105"
    : "w-10 h-10 rounded-full border border-white/10 flex items-center justify-center text-[#94a3b8] transition-all hover:scale-105";

  const iconSize = size === "sm" ? "w-3.5 h-3.5" : "w-4 h-4";

  return (
    <div className={`flex ${layout === "col" ? "flex-col gap-3" : "items-center gap-3"}`}>
      {/* X (Twitter) */}
      <button 
        onClick={handleShareX}
        className={`${buttonClass} hover:text-white hover:border-white/30 hover:bg-white/5`}
        title="Share on X"
      >
        <svg className={`${iconSize} fill-current`} viewBox="0 0 24 24">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      </button>

      {/* LinkedIn */}
      <button 
        onClick={handleShareLinkedIn}
        className={`${buttonClass} hover:text-[#0a66c2] hover:border-[#0a66c2]/30 hover:bg-[#0a66c2]/5`}
        title="Share on LinkedIn"
      >
        <svg className={`${iconSize} fill-current`} viewBox="0 0 24 24">
          <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0z"/>
        </svg>
      </button>

      {/* WhatsApp */}
      <button 
        onClick={handleShareWhatsApp}
        className={`${buttonClass} hover:text-[#25d366] hover:border-[#25d366]/30 hover:bg-[#25d366]/5`}
        title="Share on WhatsApp"
      >
        <svg className={`${iconSize} fill-current`} viewBox="0 0 24 24">
          <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.249 8.477 3.518 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.731-1.456L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.859-4.37 9.863-9.748.002-2.607-1.01-5.059-2.85-6.902C16.643 2.11 14.195.899 11.595.899c-5.442 0-9.866 4.372-9.87 9.752-.001 1.771.482 3.5 1.396 5.018l-.994 3.633 3.73-.97 1.2.722z" />
        </svg>
      </button>

      {/* Truth Social */}
      <button 
        onClick={handleShareTruthSocial}
        className={`${buttonClass} hover:text-[#8c5cf6] hover:border-[#8c5cf6]/30 hover:bg-[#8c5cf6]/5`}
        title="Share on Truth Social"
      >
        <span className="font-black text-sm select-none tracking-tight">T</span>
      </button>

      {/* Copy Link */}
      <button 
        onClick={handleCopyLink}
        className={`${buttonClass} transition-all ${
          copied 
            ? "border-[#34d399]/40 bg-[#34d399]/10 text-[#34d399] shadow-[0_0_12px_rgba(52,211,153,0.2)]" 
            : "hover:text-white hover:border-white/30 hover:bg-white/5"
        }`}
        title="Copy Link"
      >
        {copied ? (
          <svg className={`${iconSize}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        ) : (
          <svg className={`${iconSize}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
          </svg>
        )}
      </button>

      {copied && (
        <span className="text-[10px] text-[#34d399] font-bold uppercase tracking-wider animate-pulse">
          Copied!
        </span>
      )}
    </div>
  );
}
