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
  delay = 600,
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
  });

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

  // Animation Loop Effect
  useEffect(() => {
    let timerId: NodeJS.Timeout;

    // Defer start of loop by 2 seconds to make sure it doesn't execute during
    // initial page load, hydrated event attachments, or LCP calculations.
    const startTimeout = setTimeout(() => {
      const tick = () => {
        const state = stateRef.current;

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

        const currentString = strings[state.stringIndex % strings.length];
        const stringLength = currentString.length || 1;

        if (state.isDeleting) {
          state.text = currentString.substring(0, state.charIndex - 1);
          state.charIndex--;
        } else {
          state.text = currentString.substring(0, state.charIndex + 1);
          state.charIndex++;
        }

        // Show animated typing placeholder, fallback to static if empty
        setPlaceholder(state.text || staticPlaceholder);

        // Dynamically compute character interval to type the entire string in exactly 450ms (0.45s)
        // and delete it in exactly 225ms (0.225s)
        let typeSpeed = 450 / stringLength;
        if (state.isDeleting) {
          typeSpeed = 225 / stringLength;
        }

        if (!state.isDeleting && state.text === currentString) {
          typeSpeed = delay; // Pause at full word
          state.isDeleting = true;
        } else if (state.isDeleting && state.text === "") {
          state.isDeleting = false;
          state.stringIndex++;
          typeSpeed = 120; // Pause before typing next word
        }

        timerId = setTimeout(tick, typeSpeed);
      };

      tick();
    }, 2000);

    return () => {
      clearTimeout(startTimeout);
      clearTimeout(timerId);
    };
  }, [strings, staticPlaceholder, speed, backSpeed, delay]);

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
