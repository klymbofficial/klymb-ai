"use client";

import { motion, useReducedMotion } from "motion/react";

const COLORS = ["#83050b", "#f0868b", "#201e1d", "#e2a23b", "#ffffff"];

/** A short burst of confetti from a point, for finishing a day. Nothing with reduced motion. */
export function Celebrate({ burstKey }: { burstKey: number }) {
  const reduced = useReducedMotion();
  if (reduced || !burstKey) return null;
  return (
    <span aria-hidden="true" className="pointer-events-none absolute top-1/2 left-1/2 z-20">
      {Array.from({ length: 26 }, (_, i) => {
        const angle = (i / 26) * Math.PI * 2;
        const dist = 70 + ((i * 37) % 60);
        return (
          <motion.span
            key={`${burstKey}-${i}`}
            className="absolute block size-2 rounded-[2px]"
            style={{ background: COLORS[i % COLORS.length] }}
            initial={{ x: 0, y: 0, opacity: 1, rotate: 0, scale: 1 }}
            animate={{ x: Math.cos(angle) * dist, y: Math.sin(angle) * dist + 40, opacity: 0, rotate: 360 + i * 20, scale: 0.6 }}
            transition={{ duration: 0.9 + (i % 5) * 0.08, ease: [0.15, 0.7, 0.3, 1] }}
          />
        );
      })}
    </span>
  );
}
