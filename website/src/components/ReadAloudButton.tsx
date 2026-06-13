"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";

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

// Lists of known female/male voice name fragments
const FEMALE_FRAGMENTS = [
  "female", "samantha", "zira", "victoria", "karen", "moira", "tessa",
  "veena", "hazel", "catherine", "susan", "jenny", "aria", "sonia", "mia",
  "libby", "serena", "fiona", "stephanie", "amanda", "tracy", "salli",
  "kimberly", "joanna", "ivy", "kendra", "nicole", "amy", "emily", "emma",
  "nadine", "elsa", "anna", "haruka", "huihui", "yaoyao", "heera", "sabina",
  "helena", "linda", "helen", "sara", "zuzana", "aurora", "laila", "yuna",
  "xiaoxiao", "yating", "zhiyu",
];

const MALE_FRAGMENTS = [
  "male", "daniel", "david", "arthur", "george", "alex", "fred", "guy",
  "ravi", "stefan", "filip", "danny", "james", "john", "robert", "michael",
  "william", "richard", "thomas", "christopher", "matthew", "mark", "steven",
  "paul", "andrew", "joshua", "kevin", "brian", "jason", "edward", "jeffrey",
  "ryan", "jacob", "gary", "nicholas", "eric", "jonathan", "stephen", "larry",
  "brandon", "samuel", "gregory", "frank", "alexander", "raymond", "jack",
];

function pickVoice(
  voicesList: SpeechSynthesisVoice[],
  gender: "female" | "male"
): SpeechSynthesisVoice | undefined {
  if (voicesList.length === 0) return undefined;

  const myFragments = gender === "female" ? FEMALE_FRAGMENTS : MALE_FRAGMENTS;
  const oppositeFragments = gender === "female" ? MALE_FRAGMENTS : FEMALE_FRAGMENTS;
  const myRegex = new RegExp(myFragments.join("|"), "i");
  const oppositeRegex = new RegExp(oppositeFragments.join("|"), "i");

  // Filter to English voices when possible
  const englishVoices = voicesList.filter((v) =>
    v.lang.toLowerCase().startsWith("en")
  );
  const pool = englishVoices.length > 0 ? englishVoices : voicesList;

  // Helper: check if a voice name explicitly belongs to the opposite gender
  const isOppositeGender = (v: SpeechSynthesisVoice) => {
    const name = v.name.toLowerCase();
    // Special case: "female" contains "male" so handle carefully
    if (gender === "male") {
      // Reject voices that say "female" in the name
      if (name.includes("female")) return true;
      // Check opposite (female) fragments, but skip the word "female" itself (already checked)
      return oppositeRegex.test(name) && !name.includes("male");
    } else {
      // gender === "female": reject voices that say "male" but NOT "female"
      if (name.includes("male") && !name.includes("female")) return true;
      return oppositeRegex.test(name);
    }
  };

  // Remove voices that clearly belong to the opposite gender
  const genderFiltered = pool.filter((v) => !isOppositeGender(v));

  // 1. Exact gender word match (e.g. "Google UK English Male")
  const exactMatch = genderFiltered.find((v) =>
    v.name.toLowerCase().includes(gender)
  );
  if (exactMatch) return exactMatch;

  // 2. Fragment match (e.g. "Daniel", "Samantha")
  const fragmentMatch = genderFiltered.find((v) => myRegex.test(v.name));
  if (fragmentMatch) return fragmentMatch;

  // 3. If we couldn't find a gender-specific voice, try the full unfiltered pool
  //    but with stronger matching
  const fullPoolExact = pool.find((v) =>
    v.name.toLowerCase().includes(gender)
  );
  if (fullPoolExact) return fullPoolExact;

  const fullPoolFragment = pool.find((v) => myRegex.test(v.name));
  if (fullPoolFragment) return fullPoolFragment;

  // 4. Last resort: for male pick the last English voice, for female pick the first
  //    (browsers tend to list female voices first, male voices later)
  if (gender === "male" && pool.length > 1) {
    return pool[pool.length - 1];
  }

  // 5. Default browser voice or first available
  const defaultVoice = pool.find((v) => v.default);
  if (defaultVoice) return defaultVoice;

  return pool[0];
}

export default function ReadAloudButton({ content }: ReadAloudButtonProps) {
  const [isSupported, setIsSupported] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [estimatedTime, setEstimatedTime] = useState("");
  const [voiceGender, setVoiceGender] = useState<"female" | "male">("female");
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);

  // Ref mirrors state so handlePlay always sees the latest gender (avoids stale closure)
  const voiceGenderRef = useRef<"female" | "male">("female");
  const voicesRef = useRef<SpeechSynthesisVoice[]>([]);

  // Initialize voices and listen to changes
  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

    setIsSupported(true);

    const updateVoices = () => {
      const allVoices = window.speechSynthesis.getVoices();
      if (allVoices.length > 0) {
        setVoices(allVoices);
        voicesRef.current = allVoices;
      }
    };

    // Chrome loads voices asynchronously; Firefox may have them immediately
    updateVoices();
    window.speechSynthesis.onvoiceschanged = updateVoices;

    return () => {
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, []);

  // Keep the ref in sync whenever the dropdown changes
  const handleGenderChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const gender = e.target.value as "female" | "male";
      setVoiceGender(gender);
      voiceGenderRef.current = gender;

      // Stop playback so the next Press uses the new voice
      if (isPlaying || isPaused) {
        window.speechSynthesis.cancel();
        setIsPlaying(false);
        setIsPaused(false);
      }
    },
    [isPlaying, isPaused]
  );

  useEffect(() => {
    // Calculate estimated time (avg listening speed ~150 wpm)
    const plainText = stripMarkdown(content);
    const wordCount = plainText.split(/\s+/).length;
    const minutes = Math.ceil(wordCount / 150);
    setEstimatedTime(`${minutes} min listen`);

    return () => {
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, [content]);

  const handlePlay = useCallback(() => {
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

    // Use ref so we always have the latest gender, even if called from inside a stale closure
    const currentGender = voiceGenderRef.current;

    // Prefer the ref (most up to date) but fall back to live getVoices() call
    let currentVoices = voicesRef.current;
    if (currentVoices.length === 0) {
      currentVoices = window.speechSynthesis.getVoices();
      voicesRef.current = currentVoices;
    }

    const selectedVoice = pickVoice(currentVoices, currentGender);

    if (selectedVoice) {
      console.log(
        `[ReadAloud] Using ${currentGender} voice: "${selectedVoice.name}" (${selectedVoice.lang})`
      );
      utterance.voice = selectedVoice;
    } else {
      console.warn("[ReadAloud] No matching voice found – using browser default");
    }

    // Use noticeably different pitch and rate for each gender
    if (currentGender === "male") {
      utterance.rate = 0.95;
      utterance.pitch = 0.7;   // Much deeper
    } else {
      utterance.rate = 1.0;
      utterance.pitch = 1.1;   // Slightly higher
    }

    utterance.onend = () => {
      setIsPlaying(false);
      setIsPaused(false);
    };

    utterance.onerror = (e) => {
      console.error("[ReadAloud] Speech synthesis error", e);
      setIsPlaying(false);
      setIsPaused(false);
    };

    window.speechSynthesis.speak(utterance);
    setIsPlaying(true);
    setIsPaused(false);
  }, [content, isPaused]);

  const handlePause = useCallback(() => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.pause();
    setIsPlaying(false);
    setIsPaused(true);
  }, []);

  const handleStop = useCallback(() => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    setIsPlaying(false);
    setIsPaused(false);
  }, []);

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
          {/* Voice gender selector — shown with icon labels */}
          <button
            onClick={() => {
              const next = voiceGender === "female" ? "male" : "female";
              setVoiceGender(next);
              voiceGenderRef.current = next;
              if (isPlaying || isPaused) {
                window.speechSynthesis.cancel();
                setIsPlaying(false);
                setIsPaused(false);
              }
            }}
            className="flex items-center gap-1 text-xs text-[#34d399] hover:text-white transition-colors font-medium cursor-pointer"
            title={`Switch to ${voiceGender === "female" ? "male" : "female"} voice`}
          >
            {voiceGender === "female" ? (
              <>
                <span>♀</span>
                <span>Female</span>
              </>
            ) : (
              <>
                <span>♂</span>
                <span>Male</span>
              </>
            )}
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3 opacity-60">
              <path fillRule="evenodd" d="M8 1a.75.75 0 0 1 .75.75v10.638l3.96-4.158a.75.75 0 1 1 1.08 1.04l-5.25 5.5a.75.75 0 0 1-1.08 0l-5.25-5.5a.75.75 0 1 1 1.08-1.04l3.96 4.158V1.75A.75.75 0 0 1 8 1Z" clipRule="evenodd" />
            </svg>
          </button>

          {/* Hidden but accessible select for screen readers */}
          <select
            value={voiceGender}
            onChange={handleGenderChange}
            className="sr-only"
            aria-label="Voice gender"
          >
            <option value="female">Female</option>
            <option value="male">Male</option>
          </select>
        </div>
      </div>

      {isPlaying && (
        <div className="flex items-center gap-1 ml-2">
          <div className="w-1 h-3 bg-[#34d399] rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
          <div className="w-1 h-4 bg-[#34d399] rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
          <div className="w-1 h-2 bg-[#34d399] rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
        </div>
      )}
    </div>
  );
}
