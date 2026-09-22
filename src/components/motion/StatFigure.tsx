"use client";

import { animate, useInView, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";

/**
 * Counts a display figure like "92M", "56%" or "3x" up from zero the first
 * time it scrolls into view. The prefix and suffix stay put; only the number
 * moves. Figures with no leading number render as-is.
 */
export function StatFigure({ value, className }: { value: string; className?: string }) {
  const match = value.match(/^(\D*)(\d+(?:\.\d+)?)(.*)$/);
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  const reduced = useReducedMotion();
  const target = match ? Number(match[2]) : 0;
  const [shown, setShown] = useState(reduced || !match ? target : 0);

  useEffect(() => {
    if (!match || !inView || reduced) return;
    const controls = animate(0, target, {
      duration: 1.2,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => setShown(Math.round(v)),
    });
    return () => controls.stop();
  }, [inView, reduced, target, match]);

  if (!match) return <span className={className}>{value}</span>;
  return (
    <span ref={ref} className={className} aria-label={value}>
      <span aria-hidden="true">{match[1]}{shown}{match[3]}</span>
    </span>
  );
}
