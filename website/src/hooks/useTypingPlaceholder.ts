"use client";

import { useEffect, useState, useRef } from "react";

interface UseTypingPlaceholderProps {
  strings: string[];
  staticPlaceholder: string;
  value?: string;
  speed?: number;
  backSpeed?: number;
  delay?: number;
}

export function useTypingPlaceholder({
  strings,
  staticPlaceholder,
  value = "",
  speed = 25,
  backSpeed = 12,
  delay = 1000,
}: UseTypingPlaceholderProps) {
  const [placeholder, setPlaceholder] = useState(staticPlaceholder);
  const [isFocused, setIsFocused] = useState(false);
  const [hasValue, setHasValue] = useState(!!value);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const stateRef = useRef({
    stringIndex: 0,
    charIndex: 0,
    isDeleting: false,
    text: "",
    isFocused: false,
    hasValue: !!value,
    isVisible: false,
    pauseTicksCount: 0,
    showCursor: true,
  });

  // Keep latest configuration in ref to avoid loop restarts on parent re-renders
  const configRef = useRef({ strings, staticPlaceholder, speed, backSpeed, delay });
  useEffect(() => {
    configRef.current = { strings, staticPlaceholder, speed, backSpeed, delay };
  }, [strings, staticPlaceholder, speed, backSpeed, delay]);

  // Keep focus state updated in ref
  useEffect(() => {
    stateRef.current.isFocused = isFocused;
  }, [isFocused]);

  // Keep value state updated reactively for controlled inputs
  useEffect(() => {
    setHasValue(!!value);
    stateRef.current.hasValue = !!value;
  }, [value]);

  // Observe visibility of input in the viewport to avoid CPU overhead when hidden
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;

    // Check initial value
    if (el.value) {
      setHasValue(true);
      stateRef.current.hasValue = true;
    }

    let observer: IntersectionObserver | null = null;
    if (typeof window !== "undefined" && "IntersectionObserver" in window) {
      observer = new IntersectionObserver(
        ([entry]) => {
          stateRef.current.isVisible = entry.isIntersecting;
        },
        { threshold: 0.1 }
      );
      observer.observe(el);
    } else {
      stateRef.current.isVisible = true;
    }

    return () => {
      if (observer) {
        observer.disconnect();
      }
    };
  }, []);

  // Animation Loop Effect (runs once on mount)
  useEffect(() => {
    let timerId: NodeJS.Timeout;

    // Defer start of loop by 2 seconds to make sure it doesn't execute during
    // initial page load, hydrated event attachments, or LCP calculations.
    const startTimeout = setTimeout(() => {
      const tick = () => {
        const state = stateRef.current;
        const config = configRef.current;

        // Skip animating when hidden, tab out of focus, focused, or contains text
        if (
          document.visibilityState === "hidden" ||
          !state.isVisible ||
          state.isFocused ||
          state.hasValue
        ) {
          timerId = setTimeout(tick, 300); // Check again soon
          return;
        }

        const currentString = config.strings[state.stringIndex % config.strings.length];
        const stringLength = currentString.length || 1;

        let nextTickDelay = 700 / stringLength;

        if (state.isDeleting) {
          // Deleting phase: delete character and show solid cursor
          state.text = currentString.substring(0, state.charIndex - 1);
          state.charIndex--;
          
          setPlaceholder(state.text ? state.text + "|" : config.staticPlaceholder);
          nextTickDelay = 550 / stringLength;
          
          if (state.text === "") {
            state.isDeleting = false;
            state.stringIndex++;
            nextTickDelay = 200; // Pause before typing the next word
          }
        } else if (state.charIndex < currentString.length) {
          // Typing phase: add character, solid cursor, and random human jitter
          state.text = currentString.substring(0, state.charIndex + 1);
          state.charIndex++;
          
          setPlaceholder(state.text + "|");
          // Multiplies the base typing speed by a random jitter factor between 0.85 and 1.15
          nextTickDelay = (700 / stringLength) * (0.85 + Math.random() * 0.3);
        } else {
          // Pause phase at full word: blink the cursor every 150ms
          state.showCursor = !state.showCursor;
          setPlaceholder(currentString + (state.showCursor ? "|" : ""));
          
          state.pauseTicksCount++;
          nextTickDelay = 150; // Cursor blink interval
          
          const maxTicks = Math.round(config.delay / 150);
          if (state.pauseTicksCount >= maxTicks) {
            state.pauseTicksCount = 0;
            state.isDeleting = true;
            state.showCursor = true;
            nextTickDelay = 150;
          }
        }

        timerId = setTimeout(tick, nextTickDelay);
      };

      tick();
    }, 2000);

    return () => {
      clearTimeout(startTimeout);
      clearTimeout(timerId);
    };
  }, []);

  const activePlaceholder = isFocused || hasValue ? staticPlaceholder : placeholder;

  return {
    ref: inputRef,
    placeholder: activePlaceholder,
    onFocus: () => setIsFocused(true),
    onBlur: (e: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(false);
      setHasValue(!!e.target.value);
    },
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
      setHasValue(!!e.target.value);
    },
  };
}
