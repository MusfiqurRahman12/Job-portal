"use client";

import React, { useState, useEffect, useRef } from "react";

interface ReadAloudButtonProps {
  content: string; // The markdown or raw text content of the article
}

function stripMarkdown(md: string): string {
  if (!md) return "";
  return md
    .replace(/\[(.*?)\]\(.*?\)/g, "$1") // Remove links but keep text
    .replace(/[#*`_>~]/g, "") // Remove common markdown characters
    .replace(/!\[.*?\]\(.*?\)/g, "") // Remove images
    .replace(/\n+/g, " ") // Replace newlines with spaces
    .replace(/\s{2,}/g, " ") // Remove extra spaces
    .trim();
}

export default function ReadAloudButton({ content }: ReadAloudButtonProps) {
  const [isSupported, setIsSupported] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [estimatedTime, setEstimatedTime] = useState("");
  const [voiceGender, setVoiceGender] = useState<"female" | "male">("female");
  
  // Keep track of the utterance so we can pause/resume
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      setIsSupported(true);
      
      // Calculate estimated time (avg reading speed ~150 wpm)
      const plainText = stripMarkdown(content);
      const wordCount = plainText.split(/\s+/).length;
      const minutes = Math.ceil(wordCount / 150);
      setEstimatedTime(`${minutes} min listen`);
    }

    // Cleanup on unmount
    return () => {
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, [content]);

  const handlePlay = () => {
    if (!window.speechSynthesis) return;

    if (isPaused) {
      window.speechSynthesis.resume();
      setIsPlaying(true);
      setIsPaused(false);
      return;
    }

    // Stop anything currently playing
    window.speechSynthesis.cancel();

    const plainText = stripMarkdown(content);
    const utterance = new SpeechSynthesisUtterance(plainText);
    
    // Attempt to pick a voice based on selected gender
    const voices = window.speechSynthesis.getVoices();
    let selectedVoice;

    if (voiceGender === "female") {
      selectedVoice = voices.find(v => v.lang.startsWith("en-") && (v.name.includes("Female") || v.name.includes("Samantha") || v.name.includes("Zira") || v.name.includes("Google US English") || v.name.includes("Victoria")));
    } else {
      selectedVoice = voices.find(v => v.lang.startsWith("en-") && (v.name.includes("Male") || v.name.includes("Daniel") || v.name.includes("David") || v.name.includes("Google UK English Male") || v.name.includes("Arthur")));
    }

    // Fallback if the explicitly gendered voice wasn't found
    if (!selectedVoice) {
      selectedVoice = voices.find(v => v.lang.startsWith("en-") && (v.name.includes("Google") || v.name.includes("Natural")));
    }
    
    // Ultimate fallback to any English voice
    if (!selectedVoice) {
      selectedVoice = voices.find(v => v.lang.startsWith("en-"));
    }

    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }

    utterance.rate = 1.0; // Normal speed
    utterance.pitch = 1.0;

    utterance.onend = () => {
      setIsPlaying(false);
      setIsPaused(false);
    };

    utterance.onerror = (e) => {
      console.error("Speech synthesis error", e);
      setIsPlaying(false);
      setIsPaused(false);
    };

    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
    
    setIsPlaying(true);
    setIsPaused(false);
  };

  const handlePause = () => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.pause();
    setIsPlaying(false);
    setIsPaused(true);
  };

  const handleStop = () => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    setIsPlaying(false);
    setIsPaused(false);
  };

  if (!isSupported) return null;

  return (
    <div className="flex items-center gap-3 p-3 rounded-2xl bg-white/5 border border-white/10 w-fit mb-8 backdrop-blur-md">
      <div className="flex items-center gap-2">
        {!isPlaying ? (
          <button 
            onClick={handlePlay}
            className="w-10 h-10 rounded-full bg-[#34d399]/20 hover:bg-[#34d399]/30 text-[#34d399] flex items-center justify-center transition-colors border border-[#34d399]/30 animate-neon-heartbeat"
            title={isPaused ? "Resume" : "Play"}
          >
            {/* Play Icon */}
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 ml-1">
              <path fillRule="evenodd" d="M4.5 5.653c0-1.427 1.529-2.33 2.779-1.643l11.54 6.347c1.295.712 1.295 2.573 0 3.286L7.28 19.99c-1.25.687-2.779-.217-2.779-1.643V5.653Z" clipRule="evenodd" />
            </svg>
          </button>
        ) : (
          <button 
            onClick={handlePause}
            className="w-10 h-10 rounded-full bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-500 flex items-center justify-center transition-colors border border-yellow-500/30"
            title="Pause"
          >
            {/* Pause Icon */}
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
              <path fillRule="evenodd" d="M6.75 5.25a.75.75 0 0 1 .75-.75H9a.75.75 0 0 1 .75.75v13.5a.75.75 0 0 1-.75.75H7.5a.75.75 0 0 1-.75-.75V5.25Zm7.5 0A.75.75 0 0 1 15 4.5h1.5a.75.75 0 0 1 .75.75v13.5a.75.75 0 0 1-.75.75H15a.75.75 0 0 1-.75-.75V5.25Z" clipRule="evenodd" />
            </svg>
          </button>
        )}

        {(isPlaying || isPaused) && (
          <button 
            onClick={handleStop}
            className="w-10 h-10 rounded-full bg-red-500/20 hover:bg-red-500/30 text-red-500 flex items-center justify-center transition-colors border border-red-500/30"
            title="Stop"
          >
            {/* Stop Icon */}
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
              <path fillRule="evenodd" d="M4.5 7.5a3 3 0 0 1 3-3h9a3 3 0 0 1 3 3v9a3 3 0 0 1-3 3h-9a3 3 0 0 1-3-3v-9Z" clipRule="evenodd" />
            </svg>
          </button>
        )}
      </div>

      <div className="flex flex-col pr-3">
        <span className="text-sm font-bold text-white leading-tight">Read Aloud</span>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs text-[#94a3b8]">{estimatedTime}</span>
          <span className="text-[#64748b] text-xs">•</span>
          <select 
            value={voiceGender} 
            onChange={(e) => {
              setVoiceGender(e.target.value as "female" | "male");
              // If we change voice while paused or playing, it's best to stop so the next play uses the new voice
              if (isPlaying || isPaused) {
                window.speechSynthesis.cancel();
                setIsPlaying(false);
                setIsPaused(false);
              }
            }}
            className="bg-transparent text-xs text-[#34d399] outline-none cursor-pointer appearance-none font-medium hover:text-white transition-colors"
          >
            <option value="female" className="bg-[#0f172a]">Female</option>
            <option value="male" className="bg-[#0f172a]">Male</option>
          </select>
        </div>
      </div>
      
      {isPlaying && (
        <div className="flex items-center gap-1 ml-2">
          <div className="w-1 h-3 bg-[#34d399] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
          <div className="w-1 h-4 bg-[#34d399] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
          <div className="w-1 h-2 bg-[#34d399] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      )}
    </div>
  );
}
