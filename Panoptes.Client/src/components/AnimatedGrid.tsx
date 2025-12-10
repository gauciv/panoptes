// components/AnimatedGrid.tsx
import { motion } from 'framer-motion';

export function AnimatedGrid() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      
      {/* LAYER 1: The "Distant" Grid (Slower, Fainter, Smaller Cells) */}
      <motion.div
        className="absolute -inset-[100%] h-[300%] w-[300%] opacity-20"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(0, 255, 148, 0.15) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(0, 255, 148, 0.15) 1px, transparent 1px)
          `,
          backgroundSize: '30px 30px', // Small tight grid
          transform: 'perspective(500px) rotateX(60deg)',
          transformOrigin: 'top center',
        }}
        animate={{
          backgroundPosition: ['0px 0px', '0px 30px'],
        }}
        transition={{
          duration: 3, // Slow movement
          repeat: Infinity,
          ease: 'linear',
        }}
      />

      {/* LAYER 2: The "Main" Grid (Faster, Brighter, Larger Cells) */}
      <motion.div
        className="absolute -inset-[100%] h-[300%] w-[300%] opacity-30"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(0, 255, 148, 0.4) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(0, 255, 148, 0.4) 1px, transparent 1px)
          `,
          backgroundSize: '120px 120px', // Large "Sector" grid
          transform: 'perspective(500px) rotateX(60deg)',
          transformOrigin: 'top center',
        }}
        animate={{
          backgroundPosition: ['0px 0px', '0px 120px'],
        }}
        transition={{
          duration: 1.5, // Fast movement
          repeat: Infinity,
          ease: 'linear',
        }}
      />

      {/* LAYER 3: The "Scanner" Beam (Sweeping Light) */}
      <motion.div 
        className="absolute inset-0 h-full w-full bg-gradient-to-b from-transparent via-sentinel/10 to-transparent"
        style={{ transform: 'perspective(500px) rotateX(60deg)' }}
        animate={{ top: ['-100%', '200%'] }}
        transition={{
            duration: 8,
            repeat: Infinity,
            ease: "linear"
        }}
      />

      {/* Horizon Fade: Curved Horizon Effect */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center_top,transparent_0%,#006A32_70%)] opacity-90" />
      
      {/* Vignette: Heavy corners to focus attention */}
      <div className="absolute inset-0 bg-[radial-gradient(transparent_40%,#000000_100%)] opacity-80" />
    </div>
  );
}