"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useTypingPlaceholder } from "@/hooks/useTypingPlaceholder";

export default function SearchForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentSearch = searchParams.get("search") || "";
  const currentCategory = searchParams.get("category") || "";
  
  const [input, setInput] = useState(currentSearch);

  const searchPlaceholderProps = useTypingPlaceholder({
    strings: [
      "Search for React Developer...",
      "Search for Product Designer...",
      "Search for DevOps Engineer...",
      "Search for Marketing Manager...",
      "Search for Remote Software Engineer...",
      "Search for Product Manager...",
      "Search for Data Scientist...",
    ],
    staticPlaceholder: "Search role, position, skills, experience...",
    value: input,
  });

  // Sync input field value when search query changes (e.g. back navigation)
  useEffect(() => {
    setInput(currentSearch);
  }, [currentSearch]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    
    if (currentCategory && currentCategory !== "All") {
      params.set("category", currentCategory);
    }
    
    if (input.trim()) {
      params.set("search", input.trim());
    }
    
    // Push the updated search query to the URL parameter
    router.push(`/jobs?${params.toString()}`);
  };

  return (
    <form onSubmit={handleSubmit} className="search-container !relative !max-w-full !transform-none !opacity-100">
      <input
        type="text"
        className="search-bar"
        value={input}
        ref={searchPlaceholderProps.ref}
        placeholder={searchPlaceholderProps.placeholder}
        onFocus={searchPlaceholderProps.onFocus}
        onBlur={searchPlaceholderProps.onBlur}
        onChange={(e) => {
          setInput(e.target.value);
          searchPlaceholderProps.onChange(e);
        }}
      />
      <button type="submit" className="search-btn">Search</button>
    </form>
  );
}
export const dynamic = "force-dynamic";
