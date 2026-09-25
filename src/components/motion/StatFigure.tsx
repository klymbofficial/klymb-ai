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
  const hasNumber = match !== null;
  const target = match ? Number(match[2]) : 0;
  // Server and first client render must agree, and the server cannot know
  // the motion preference — so everyone starts at 0 and the effect settles it.
  const [shown, setShown] = useState(hasNumber ? 0 : target);

  // Depend on primitives only. `match` is a fresh array every render, and
  // listing it here restarted the count from zero on every animation frame.
  useEffect(() => {
    if (!hasNumber || !inView) return;
    // Reduced motion lands on the final value at once, through the same path.
    const controls = animate(0, target, {
      duration: reduced ? 0 : 1.2,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => setShown(Math.round(v)),
    });
    return () => controls.stop();
  }, [inView, reduced, target, hasNumber]);

  if (!match) return <span className={className}>{value}</span>;
  return (
    <span ref={ref} className={className} aria-label={value}>
      <span aria-hidden="true">{match[1]}{shown}{match[3]}</span>
    </span>
  );
}
