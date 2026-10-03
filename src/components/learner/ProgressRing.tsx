"use client";

import { motion, useReducedMotion } from "motion/react";

/** Days done out of 30, as a ring that draws itself on load, with the current streak beside it. */
export function ProgressRing({ done, total, streak }: { done: number; total: number; streak: number }) {
  const reduced = useReducedMotion();
  const r = 26;
  const c = 2 * Math.PI * r;
  const pct = total ? done / total : 0;
  return (
    <div className="flex items-center gap-4">
      <div className="relative size-16 shrink-0">
        <svg viewBox="0 0 64 64" className="size-16 -rotate-90" aria-hidden="true">
          <circle cx="32" cy="32" r={r} fill="none" stroke="rgb(255 255 255 / 0.15)" strokeWidth="6" />
          <motion.circle
            cx="32" cy="32" r={r} fill="none" stroke="var(--color-red-soft)" strokeWidth="6" strokeLinecap="round"
            strokeDasharray={c}
            initial={{ strokeDashoffset: reduced ? c * (1 - pct) : c }}
            animate={{ strokeDashoffset: c * (1 - pct) }}
            transition={{ duration: 1.2, ease: [0.2, 0.7, 0.2, 1], delay: 0.2 }}
            style={{ filter: "drop-shadow(0 0 6px rgb(240 134 139 / 0.7))" }}
          />
        </svg>
        <span className="absolute inset-0 grid place-items-center text-sm font-black nums">{Math.round(pct * 100)}%</span>
      </div>
      <div className="text-sm leading-tight">
        <p className="font-extrabold nums">{done} of {total} days</p>
        <p className="mt-0.5 text-white/65">{streak > 0 ? `🔥 ${streak}-day streak` : "Start your streak today"}</p>
      </div>
    </div>
  );
}
