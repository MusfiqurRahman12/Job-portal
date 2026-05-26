"use client";

import { useEffect } from "react";

interface AdUnitProps {
  slot: string;
  format?: string;
  responsive?: string;
  style?: React.CSSProperties;
}

export default function AdUnit({ slot, format = "auto", responsive = "true", style }: AdUnitProps) {
  const client = process.env.NEXT_PUBLIC_ADSENSE_CLIENT;

  useEffect(() => {
    if (client) {
      try {
        ((window as any).adsbygoogle = (window as any).adsbygoogle || []).push({});
      } catch (e) {
        console.error("AdSense initialization error:", e);
      }
    }
  }, [client]);

  // If no AdSense publisher ID is configured, show a clean, brand-themed placeholder
  if (!client) {
    return (
      <div 
        className="glass-card flex items-center justify-center p-6 text-sm text-[#475569] border border-dashed border-white/5 hover:border-white/10 transition-colors select-none"
        style={{ minHeight: "90px", ...style }}
      >
        <div className="text-center">
          <span className="block text-xs font-semibold text-[#64748b] tracking-wider uppercase mb-1">Sponsored Advertisement</span>
          <span className="text-[0.75rem] text-[#475569]">AdSense — Active when client ID is configured</span>
        </div>
      </div>
    );
  }

  return (
    <div style={{ overflow: "hidden", margin: "1rem 0", ...style }}>
      <ins
        className="adsbygoogle"
        style={{ display: "block", ...style }}
        data-ad-client={client}
        data-ad-slot={slot}
        data-ad-format={format}
        data-full-width-responsive={responsive}
      />
    </div>
  );
}
