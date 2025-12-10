import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import clsx from 'clsx';

type GlitchButtonProps = {
  label: string;
  to?: string;
  href?: string;
  soundSrc?: string;
  variant?: 'primary' | 'ghost';
  className?: string;
  external?: boolean;
  /** Triggers the glitch animation on mount */
  maskText?: boolean;
  /** Delay in seconds before the glitch entry starts */
  maskDelay?: number;
};

// Expanded character set for a more "Matrix/Data" feel
const possibleChars =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789$#@%&?!<>/[]{}—=+';
const glitchSpeed = 12; // Slightly faster for a snappier feel

export function GlitchButton({
  label,
  to,
  href,
  soundSrc,
  variant = 'ghost',
  className,
  external,
  maskText = false, // If true, button "decrypts" on load
  maskDelay = 0,
}: GlitchButtonProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  
  // State: Text to display
  const [displayText, setDisplayText] = useState(label);
  // State: Visibility (starts hidden if animating in)
  const [isVisible, setIsVisible] = useState(!maskText);

  const original = useMemo(() => label.split(''), [label]);
  const spaceRegex = useMemo(() => /\s/, []);

  // 1. Audio Setup
  useEffect(() => {
    if (!soundSrc) return;
    audioRef.current = new Audio(soundSrc);
    audioRef.current.preload = 'auto';
  }, [soundSrc]);

  const playSound = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {});
    }
  };

  const stopInterval = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  // 2. The Core Glitch Logic (Extracted for reuse)
  const runGlitch = useCallback(() => {
    stopInterval();
    
    let iterations = 0;
    const frameDuration = 1000 / glitchSpeed;
    const length = original.length;

    intervalRef.current = setInterval(() => {
      setDisplayText(() =>
        original
          .map((char, index) => {
            if (spaceRegex.test(char)) return char;
            // Reveal characters progressively from left to right
            if (index < iterations) return char;
            // Return random char otherwise
            return possibleChars[
              Math.floor(Math.random() * possibleChars.length)
            ];
          })
          .join(''),
      );

      // Increase iterations to slowly resolve the text
      iterations += 1 / 2; // Slower resolve for dramatic effect

      if (iterations > length) {
        stopInterval();
      }
    }, frameDuration);
  }, [original, spaceRegex]);

  // 3. Hover Handlers
  const handleEnter = () => {
    playSound();
    runGlitch();
  };

  const handleLeave = () => {
    stopInterval();
    setDisplayText(label); // Snap back to original immediately
  };

  // 4. "Cold Boot" Entry Animation
  useEffect(() => {
    if (!maskText) return;

    const timer = setTimeout(() => {
      setIsVisible(true); // Snap to visible
      runGlitch(); // Trigger decryption
    }, maskDelay * 1000);

    return () => {
      clearTimeout(timer);
      stopInterval();
    };
  }, [maskText, maskDelay, runGlitch]);

  // 5. Cleanup
  useEffect(() => () => stopInterval(), []);

  // --- Render Helpers ---

  const baseClasses =
    'glitch-btn relative inline-flex items-center justify-center px-4 py-2 text-xs font-terminal uppercase tracking-wide transition-opacity duration-100';
  
  const variantClasses =
    variant === 'primary' 
      ? 'bg-sentinel text-void hover:bg-sentinel/90' 
      : 'text-ghost hover:border-sentinel hover:text-sentinel bg-transparent';
  
  // Determine opacity based on load state
  const visibilityClass = isVisible ? 'opacity-100' : 'opacity-0';

  const content = (
    <span className="relative z-10 w-full text-center">
        {displayText}
    </span>
  );

  const combinedClasses = clsx(baseClasses, variantClasses, visibilityClass, className);

  // --- JSX Output ---

  if (to) {
    return (
      <Link
        to={to}
        className={combinedClasses}
        onMouseEnter={handleEnter}
        onMouseLeave={handleLeave}
      >
        {content}
      </Link>
    );
  }

  return (
    <a
      href={href}
      target={external ? '_blank' : undefined}
      rel={external ? 'noreferrer' : undefined}
      className={combinedClasses}
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
    >
      {content}
    </a>
  );
}