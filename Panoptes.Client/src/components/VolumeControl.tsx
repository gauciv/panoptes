import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';
import { Volume2, VolumeX } from 'lucide-react'; 
import { useAudio } from '@/pages/landing/context/VolumeContext';

export function VolumeControl() {
  const { isPlaying, toggleAudio } = useAudio();
  const [isHovered, setIsHovered] = useState(false);

  return (
    <button
      onClick={toggleAudio}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={clsx(
        "group relative flex h-8 items-center justify-center gap-3 overflow-hidden rounded-sm border px-3 transition-all duration-300",
        isPlaying 
          ? "border-sentinel/30 bg-sentinel/10 text-sentinel hover:border-sentinel hover:bg-sentinel/20" 
          : "border-white/10 bg-transparent text-ghost hover:border-white/30 hover:text-white"
      )}
      aria-label={isPlaying ? "Mute System Audio" : "Enable System Audio"}
    >
      <div className="relative z-10 flex items-center justify-center w-4 h-4">
        <AnimatePresence mode="wait">
          {isPlaying ? (
            <motion.div
              key="on"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
            >
              <Volume2 size={14} />
            </motion.div>
          ) : (
            <motion.div
              key="off"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
            >
              <VolumeX size={14} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="flex items-end gap-[2px] h-3">
        {[1, 2, 3, 4].map((i) => (
          <motion.div
            key={i}
            className={clsx(
              "w-[2px] rounded-t-sm",
              isPlaying ? "bg-current" : "bg-white/10"
            )}
            animate={isPlaying ? {
              height: [3, 8 + Math.random() * 6, 3], 
            } : {
              height: 2 
            }}
            transition={{
              duration: 0.5,
              repeat: Infinity,
              repeatType: "mirror",
              delay: i * 0.1,
              ease: "easeInOut"
            }}
          />
        ))}
      </div>

      {/* 3. The "Why" (Context Label on Hover) */}
      <motion.div
        initial={{ width: 0, opacity: 0 }}
        animate={{ 
          width: isHovered ? "auto" : 0, 
          opacity: isHovered ? 1 : 0 
        }}
        className="overflow-hidden whitespace-nowrap"
      >
        <span className="pl-2 font-mono text-[9px] tracking-widest uppercase">
          {isPlaying ? "SYSTEM_AUDIO" : "MUTED"}
        </span>
      </motion.div>

    </button>
  );
}