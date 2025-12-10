import { useEffect, useRef, useState } from 'react';
import { motion, useInView } from 'framer-motion';
import clsx from 'clsx';

type ScrambleTextProps = {
  text: string;
  className?: string;
  delay?: number;
  speed?: number;
  margin?: string; 
};

const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%&?<>[]{}—=+';

export function ScrambleText({
  text,
  className,
  delay = 0,
  speed = 40,
  margin = "-10%", 
}: ScrambleTextProps) {
  const [displayText, setDisplayText] = useState(text);
  const [isScrambling, setIsScrambling] = useState(false);
  const containerRef = useRef<HTMLSpanElement>(null);
  
  // FIX: Cast margin to 'any' to satisfy Framer Motion's strict typing
  const isInView = useInView(containerRef, { once: true, margin: margin as any });

  useEffect(() => {
    if (isInView) {
      const startTimeout = setTimeout(() => {
        setIsScrambling(true);
      }, delay * 1000);
      return () => clearTimeout(startTimeout);
    }
  }, [isInView, delay]);

  useEffect(() => {
    if (!isScrambling) return;

    let iteration = 0;
    const interval = setInterval(() => {
      setDisplayText(() =>
        text
          .split('')
          .map((char, index) => {
            if (char === ' ') return ' ';
            if (index < iteration) return text[index];
            return chars[Math.floor(Math.random() * chars.length)];
          })
          .join('')
      );

      if (iteration >= text.length) {
        clearInterval(interval);
      }
      
      iteration += 1 / 3;
    }, speed);

    return () => clearInterval(interval);
  }, [isScrambling, text, speed]);

  return (
    <motion.span
      ref={containerRef}
      className={clsx('inline-block whitespace-pre-wrap', className)}
      initial={{ opacity: 0 }}
      animate={isInView ? { opacity: 1 } : { opacity: 0 }}
      transition={{ duration: 0.3, delay: delay }}
    >
      <span className="sr-only">{text}</span>
      <span aria-hidden="true">{displayText}</span>
    </motion.span>
  );
}