"use client";

import { motion, useReducedMotion } from "motion/react";
import { tracks } from "@/data/tracks";

const EASE = [0.2, 0.7, 0.2, 1] as const;

/**
 * The five job titles, struck through one after another as the /tracks page
 * opens: the titles people search for are the ones being absorbed. Static and
 * already struck with reduced motion.
 */
export function EndingTitles() {
  const reduced = useReducedMotion();
  return (
    <ul aria-label="Job titles being absorbed by AI" className="mt-8 flex flex-wrap gap-x-6 gap-y-2">
      {tracks.map((t, i) => (
        <li key={t.slug} className="relative text-[clamp(1.1rem,2.4vw,1.6rem)] font-extrabold">
          <motion.span
            className="inline-block"
            initial={reduced ? false : { opacity: 1 }}
            animate={{ opacity: 0.35 }}
            transition={{ delay: 0.9 + i * 0.28, duration: 0.4 }}
          >
            {t.name}
          </motion.span>
          <motion.span
            aria-hidden="true"
            className="absolute top-[55%] left-[-3%] h-[3px] w-[106%] origin-left rounded-full bg-red-strong"
            initial={reduced ? false : { scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ delay: 0.6 + i * 0.28, duration: 0.45, ease: EASE }}
          />
        </li>
      ))}
    </ul>
  );
}
