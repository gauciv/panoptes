import { motion } from 'framer-motion';
import clsx from 'clsx';
import { useAudio } from '@/pages/landing/context/VolumeContext'; 
export function VolumeControl() {
  // Use the shared state
  const { isPlaying, toggleAudio } = useAudio();

  return (
    <button
      onClick={toggleAudio}
      className="group relative flex h-8 w-8 items-center justify-center border border-ghost/20 bg-transparent transition-colors hover:border-sentinel hover:bg-sentinel/10"
      aria-label={isPlaying ? "Mute Sound" : "Enable Sound"}
    >
      {/* Visualizer Bars */}
      <div className="flex items-end gap-[2px] h-3">
        {[1, 2, 3].map((i) => (
          <motion.div
            key={i}
            className={clsx(
              "w-[2px] bg-ghost group-hover:bg-sentinel",
              isPlaying ? "opacity-100" : "opacity-40"
            )}
            // Only animate if the shared 'isPlaying' is true
            animate={isPlaying ? {
              height: [4, 12, 6, 12, 4], 
            } : {
              height: 2 
            }}
            transition={{
              duration: 0.6,
              repeat: Infinity,
              repeatType: "mirror",
              delay: i * 0.15,
              ease: "easeInOut"
            }}
          />
        ))}
      </div>
    </button>
  );
}