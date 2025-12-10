import { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react';

type AudioContextType = {
  isPlaying: boolean;
  toggleAudio: () => void;
  hasInteracted: boolean;
};

const AudioContext = createContext<AudioContextType | undefined>(undefined);

type AudioProviderProps = {
  children: ReactNode;
  src: string;
  shouldStart: boolean; // This comes from your Landing page loading state
};

export function AudioProvider({ children, src, shouldStart }: AudioProviderProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // 1. Initialize Audio Object once
  useEffect(() => {
    audioRef.current = new Audio(src);
    audioRef.current.loop = true;
    audioRef.current.volume = 0.4;

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [src]);

  // 2. Handle Autoplay when 'shouldStart' becomes true
  useEffect(() => {
    if (shouldStart && audioRef.current && !isPlaying && !hasInteracted) {
      const playPromise = audioRef.current.play();
      
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            setIsPlaying(true);
          })
          .catch((err) => {
            console.log("Autoplay blocked (user interaction needed):", err);
            // We stay paused (isPlaying: false) until user clicks
          });
      }
    }
  }, [shouldStart, hasInteracted]);

  // 3. The Toggle Function shared by all buttons
  const toggleAudio = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().catch((e) => console.warn("Play failed:", e));
      setIsPlaying(true);
      setHasInteracted(true); // Mark that user has manually clicked
    }
  };

  return (
    <AudioContext.Provider value={{ isPlaying, toggleAudio, hasInteracted }}>
      {children}
    </AudioContext.Provider>
  );
}

export function useAudio() {
  const context = useContext(AudioContext);
  if (!context) {
    throw new Error('useAudio must be used within an AudioProvider');
  }
  return context;
}