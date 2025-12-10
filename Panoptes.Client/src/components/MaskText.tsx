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
  const lines = useMemo(() => {
    return Array.isArray(text) 
      ? text 
      : text.split('\n');
  }, [text]);

  const fullText = Array.isArray(text) ? text.join(' ') : text;

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

  // FIX: Cast 'motion' to any BEFORE indexing it with 'Tag'
  const MotionTag = (motion as any)[Tag];

  return (
    <MotionTag
      initial="hidden"
      whileInView="show"
      viewport={{ once, margin }}
      variants={containerVariants}
      className={clsx('inline-block', className)}
      aria-label={fullText} 
      {...props}
    >
      {lines.map((line, index) => (
        <span 
          key={index} 
          className="block overflow-hidden" 
          aria-hidden="true"
        >
          <motion.span
            className="block will-change-transform"
            variants={lineVariants}
          >
            {line === '' ? '\u00A0' : line} 
          </motion.span>
        </span>
      ))}
    </MotionTag>
  );
}