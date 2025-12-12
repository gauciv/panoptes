import { useEffect, useState } from 'react';
import { motion, useMotionValue, useSpring } from 'framer-motion';

export function CustomCursor() {
  const [isHovering, setIsHovering] = useState(false);
  
  const mouseX = useMotionValue(-100);
  const mouseY = useMotionValue(-100);

  const springConfig = { damping: 25, stiffness: 200, mass: 0.5 };
  const springX = useSpring(mouseX, springConfig);
  const springY = useSpring(mouseY, springConfig);

  useEffect(() => {
    const moveCursor = (e: MouseEvent) => {
      mouseX.set(e.clientX);
      mouseY.set(e.clientY);

      const target = e.target as HTMLElement;
      setIsHovering(
        target.tagName === 'BUTTON' || 
        target.tagName === 'A' || 
        target.closest('button') !== null ||
        target.closest('a') !== null ||
        target.style.cursor === 'pointer'
      );
    };

    window.addEventListener('mousemove', moveCursor);
    return () => window.removeEventListener('mousemove', moveCursor);
  }, []);

  return (
    <>
      <motion.div
        className="pointer-events-none fixed left-0 top-0 z-[9999] h-1.5 w-1.5 rounded-full bg-sentinel mix-blend-difference"
        style={{
          x: mouseX,
          y: mouseY,
          translateX: '-50%',
          translateY: '-50%',
        }}
      />

      <motion.div
        className="pointer-events-none fixed left-0 top-0 z-[9998] flex items-center justify-center border border-sentinel/40 rounded-full mix-blend-difference"
        style={{
          x: springX,
          y: springY,
          translateX: '-50%',
          translateY: '-50%',
        }}
        animate={{
          height: isHovering ? 48 : 24,
          width: isHovering ? 48 : 24,
          opacity: isHovering ? 0.8 : 0.4,
          rotate: isHovering ? 90 : 0,
        }}
        transition={{ duration: 0.2 }}
      >
        <div className="absolute top-1/2 left-0 w-full h-[1px] bg-sentinel/20" />
        <div className="absolute left-1/2 top-0 h-full w-[1px] bg-sentinel/20" />
      </motion.div>
    </>
  );
}
