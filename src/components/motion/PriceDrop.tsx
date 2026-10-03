"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, animate, motion, useInView, useReducedMotion } from "motion/react";
import { formatINR } from "@/lib/format";

const EASE_OUT = [0.16, 1, 0.3, 1] as const;

/**
 * The reference value is struck through, then the price falls from it to the
 * launch price once the card is in view: quick at first, settling slowly onto
 * the real number, with the saving shown as it lands.
 *
 * The real price is always what assistive technology reads, and what reduced
 * motion shows; the falling digits are visual only.
 */
export function PriceDrop({ from, to, label, className }: { from: number; to: number; label: string; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  const reduced = useReducedMotion();
  const [shown, setShown] = useState(from);
  const [landed, setLanded] = useState(false);

  useEffect(() => {
    if (!inView || reduced) return;
    // Wait for the strike to draw across the reference value, then drop.
    const controls = animate(from, to, {
      delay: 0.55,
      duration: 1.6,
      ease: EASE_OUT,
      onUpdate: (v) => setShown(Math.round(v)),
      onComplete: () => setLanded(true),
    });
    return () => controls.stop();
  }, [inView, reduced, from, to]);

  // Reduced motion skips the fall: the final state is derived, not animated.
  const settled = reduced && inView;
  const price = settled ? to : shown;
  const done = settled || landed;

  const saving = from - to;
  const percent = Math.round((saving / from) * 100);

  return (
    <div ref={ref}>
      <p className="text-lg font-semibold text-white/85">
        Reference value{" "}
        <span className="relative inline-block font-extrabold">
          {formatINR(from)}
          <motion.span
            aria-hidden="true"
            className="absolute top-1/2 left-[-4%] h-[2px] w-[108%] origin-left rounded-full bg-white"
            initial={{ scaleX: 0 }}
            animate={{ scaleX: inView ? 1 : 0 }}
            transition={{ duration: reduced ? 0 : 0.45, ease: EASE_OUT }}
          />
          <span className="sr-only">, now {formatINR(to)}</span>
        </span>
      </p>

      <p className="mt-5 text-xs font-extrabold uppercase tracking-[0.16em] text-white/70">{label}</p>
      <div className="mt-1 flex flex-wrap items-end gap-x-4 gap-y-2">
        <motion.p
          aria-hidden="true"
          className={className}
          animate={landed && !reduced ? { scale: [1, 1.04, 1] } : undefined}
          transition={{ duration: 0.45, ease: "easeOut" }}
          style={{ transformOrigin: "left bottom" }}
        >
          {formatINR(price)}
        </motion.p>
        <p className="sr-only">{formatINR(to)}</p>

        <AnimatePresence>
          {done && (
            <motion.span
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, ease: EASE_OUT }}
              className="mb-3 rounded-full bg-white px-3 py-1 text-xs font-bold text-red-deep"
            >
              You save {formatINR(saving)} ({percent}% off)
            </motion.span>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
