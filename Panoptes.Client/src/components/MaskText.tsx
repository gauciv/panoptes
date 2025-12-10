import { useMemo } from 'react';
import { motion, type HTMLMotionProps, type Variants } from 'framer-motion';
import clsx from 'clsx';

interface MaskTextProps extends HTMLMotionProps<'div'> {
  text: string | string[];
  /** Render as a different HTML tag (e.g., h1, p) */
  as?: keyof JSX.IntrinsicElements;
  delay?: number;
  stagger?: number;
  duration?: number;
  /** Custom ease. Default is a smooth sleek ease. */
  ease?: number[]; 
  /** Trigger animation only once */
  once?: boolean;
  /** Viewport margin trigger */
  margin?: string;
}

// The "Industrial" ease we used in previous concepts (sharper, more mechanical)
// const INDUSTRIAL_EASE = [0.76, 0, 0.24, 1]; 

const DEFAULT_EASE = [0.25, 0.8, 0.4, 1];

export function MaskText({
  text,
  as: Tag = 'div',
  delay = 0,
  stagger = 0.08,
  duration = 0.8,
  ease = DEFAULT_EASE,
  className,
  once = true,
  margin = '-10% 0px -10% 0px',
  ...props
}: MaskTextProps) {
  // 1. Memoize splitting to avoid expensive operations on every render
  const lines = useMemo(() => {
    return Array.isArray(text) 
      ? text 
      : text.split('\n');
  }, [text]);

  // 2. Accessibility: Reconstruct full string for screen readers
  const fullText = Array.isArray(text) ? text.join(' ') : text;

  // 3. Dynamic Variants based on props
  const containerVariants: Variants = {
    hidden: {},
    show: {
      transition: {
        staggerChildren: stagger,
        delayChildren: delay,
      },
    },
  };

  const lineVariants: Variants = {
    hidden: { y: '110%', opacity: 0 },
    show: {
      y: '0%',
      opacity: 1,
      transition: { duration, ease },
    },
  };

  // 4. Dynamic Motion Component
  const MotionTag = motion[Tag] as any;

  return (
    <MotionTag
      initial="hidden"
      whileInView="show"
      viewport={{ once, margin }}
      variants={containerVariants}
      className={clsx('inline-block', className)}
      aria-label={fullText} // Screen reader reads this...
      {...props}
    >
      {lines.map((line, index) => (
        <span 
          key={index} 
          className="block overflow-hidden" 
          aria-hidden="true" // ...and ignores these fragments
        >
          <motion.span
            className="block will-change-transform"
            variants={lineVariants}
          >
            {/* Handle empty lines so they maintain height */}
            {line === '' ? '\u00A0' : line} 
          </motion.span>
        </span>
      ))}
    </MotionTag>
  );
}