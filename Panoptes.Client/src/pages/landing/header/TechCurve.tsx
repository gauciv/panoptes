import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

export function TechCurve() {
  const [dimensions, setDimensions] = useState({ width: 0, height: 100 });

  useEffect(() => {
    function resize() {
      setDimensions({
        width: window.innerWidth,
        height: 100 // Height of the "drag" effect
      });
    }
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  // 1. INITIAL: Flat line at the top
  const initialPath = `M0 0 L${dimensions.width} 0 L${dimensions.width} 0 L0 0`;

  // 2. ENTER: The "V" Shape Drag (The Scanner Probe)
  // It draws a sharp triangle downwards in the center
  const enterPath = `M0 0 L${dimensions.width} 0 L${dimensions.width} 0 L${dimensions.width / 2} ${dimensions.height} L0 0`;

  // 3. EXIT: Snaps back to flat
  const targetPath = `M0 0 L${dimensions.width} 0 L${dimensions.width} 0 L${dimensions.width / 2} 0 L0 0`;

  const curveVariants = {
    initial: {
      d: initialPath,
    },
    enter: {
      d: enterPath,
      transition: { duration: 0.8, ease: [0.76, 0, 0.24, 1] }
    },
    exit: {
      d: targetPath,
      transition: { duration: 0.8, ease: [0.76, 0, 0.24, 1] }
    }
  };

  return (
    <svg className="absolute top-full left-0 w-full h-[100px] fill-[#050505] stroke-none pointer-events-none z-50">
       {/* We add a stroke to make it look like a laser edge 
         'vector-effect="non-scaling-stroke"' ensures the line stays crisp
       */}
      <motion.path
        variants={curveVariants}
        initial="initial"
        animate="enter"
        exit="exit"
        className="stroke-sentinel/40 stroke-2" // Green Laser Edge
      />
    </svg>
  );
}