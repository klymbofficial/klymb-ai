"use client";

import { motion, useReducedMotion } from "motion/react";

/**
 * Slow diagonal light sweep behind a solid band.
 * Adapted from the "Light Lines" idea in Vengeance UI (MIT), rebuilt on
 * motion/react with this project's tokens: transform-only, so it stays cheap.
 */
export function LightLines({ count = 7 }: { count?: number }) {
  const reduced = useReducedMotion();

  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      {Array.from({ length: count }, (_, i) => (
        <motion.span
          key={i}
          className="absolute top-[-30%] h-[160%] w-px bg-white/25"
          style={{ left: `${(i + 0.5) * (100 / count)}%`, rotate: "12deg" }}
          initial={{ opacity: 0.1, scaleY: 0.6 }}
          animate={reduced ? undefined : { opacity: [0.1, 0.4, 0.1], scaleY: [0.6, 1, 0.6] }}
          transition={{ duration: 6 + i * 0.7, repeat: Infinity, ease: "easeInOut", delay: i * 0.35 }}
        />
      ))}
    </div>
  );
}
