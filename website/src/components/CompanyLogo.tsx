"use client";

import React, { useState } from "react";

interface CompanyLogoProps {
  src: string | null | undefined;
  alt: string;
  className?: string;
  fallback: React.ReactNode;
  loading?: "lazy" | "eager";
  decoding?: "async" | "sync" | "auto";
}

export default function CompanyLogo({
  src,
  alt,
  className,
  fallback,
  loading = "lazy",
  decoding = "async",
}: CompanyLogoProps) {
  const [error, setError] = useState(false);

  // Check if src is valid
  const isValidSrc =
    src &&
    src.length > 1 &&
    (src.startsWith("http") || src.startsWith("data:") || src.startsWith("/"));

  if (error || !isValidSrc) {
    return <>{fallback}</>;
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      loading={loading}
      decoding={decoding}
      onError={() => setError(true)}
    />
  );
}
