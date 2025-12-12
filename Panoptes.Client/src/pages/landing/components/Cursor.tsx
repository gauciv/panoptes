import { useEffect, useState } from 'react';
import { motion, useMotionValue, useSpring, AnimatePresence } from 'framer-motion';

export function CustomCursor() {
  const [isHovering, setIsHovering] = useState(false);
  const [isClicking, setIsClicking] = useState(false);
  
  // 1. Raw Mouse Position (Instant)
  const mouseX = useMotionValue(-100);
  const mouseY = useMotionValue(-100);

  // 2. Smooth Spring Physics (Weighted movement)
  const springConfig = { damping: 20, stiffness: 150, mass: 0.6 }; 
  const springX = useSpring(mouseX, springConfig);
  const springY = useSpring(mouseY, springConfig);

  useEffect(() => {
    const moveCursor = (e: MouseEvent) => {
      mouseX.set(e.clientX);
      mouseY.set(e.clientY);

      // Intelligent Hover Detection
      const target = e.target as HTMLElement;
      const isInteractive = 
        target.tagName === 'BUTTON' || 
        target.tagName === 'A' || 
        target.tagName === 'INPUT' ||
        target.closest('button') !== null ||
        target.closest('a') !== null ||
        window.getComputedStyle(target).cursor === 'pointer';

      setIsHovering(isInteractive);
    };

    const mouseDown = () => setIsClicking(true);
    const mouseUp = () => setIsClicking(false);

    window.addEventListener('mousemove', moveCursor);
    window.addEventListener('mousedown', mouseDown);
    window.addEventListener('mouseup', mouseUp);

    return () => {
      window.removeEventListener('mousemove', moveCursor);
      window.removeEventListener('mousedown', mouseDown);
      window.removeEventListener('mouseup', mouseUp);
    };
  }, [mouseX, mouseY]);

  return (
    <>
      {/* 1. THE CORE: Precision Diamond (The actual pointer) */}
      <motion.div
        className="pointer-events-none fixed left-0 top-0 z-[9999] h-2 w-2 bg-sentinel mix-blend-difference"
        style={{
          x: mouseX,
          y: mouseY,
          translateX: '-50%',
          translateY: '-50%',
        }}
        animate={{
          scale: isClicking ? 0.5 : 1, // Recoil on click
          rotate: isHovering ? 0 : 45, // Rotate 45deg (Diamond) normally, 0deg (Square) on hover
        }}
        transition={{ duration: 0.15 }}
      />

      {/* 2. THE RETICLE: Analyzing Frame (Follower) */}
      <motion.div
        className="pointer-events-none fixed left-0 top-0 z-[9998] border border-sentinel mix-blend-difference"
        style={{
          x: springX,
          y: springY,
          translateX: '-50%',
          translateY: '-50%',
        }}
        animate={{
          // Size changes
          height: isHovering ? 40 : 20, 
          width: isHovering ? 40 : 20,
          // Appearance changes
          opacity: isHovering ? 1 : 0.5,
          borderWidth: isHovering ? "1px" : "1px",
          rotate: isHovering ? 0 : 45, // Matches the core rotation logic
          scale: isClicking ? 0.9 : 1, // Slight recoil on frame too
        }}
        transition={{ duration: 0.2, ease: "circOut" }}
      >
        {/* CORNER ACCENTS (Only visible when locked on/hovering) */}
        <AnimatePresence>
          {isHovering && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="absolute inset-0"
            >
               {/* These simulate a HUD "Lock On" bracket */}
               <div className="absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 border-sentinel" />
               <div className="absolute top-0 right-0 w-2 h-2 border-t-2 border-r-2 border-sentinel" />
               <div className="absolute bottom-0 left-0 w-2 h-2 border-b-2 border-l-2 border-sentinel" />
               <div className="absolute bottom-0 right-0 w-2 h-2 border-b-2 border-r-2 border-sentinel" />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </>
  );
}