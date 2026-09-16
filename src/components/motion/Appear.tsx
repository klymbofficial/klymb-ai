"use client";

import { motion, useReducedMotion } from "motion/react";

/** Fades and lifts content into place the first time it scrolls into view. */
export function Appear({
  children, delay = 0, y = 16, className,
}: { children: React.ReactNode; delay?: number; y?: number; className?: string }) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduced ? false : { opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.45, delay, ease: [0.2, 0.7, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}
