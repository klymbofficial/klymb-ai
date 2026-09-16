"use client";

import clsx from "clsx";
import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import type { DayEntry } from "@/lib/learn";

export function DayGrid({ days, submitted }: { days: DayEntry[]; submitted: number[] }) {
  const done = new Set(submitted);
  const reduced = useReducedMotion();

  return (
    <ol className="grid grid-cols-5 gap-1 sm:grid-cols-10">
      {days.map((d, i) => {
        const isDone = done.has(d.day);
        const label =
          d.kind === "challenge" ? d.challenge.title : d.kind === "assessment" ? `Assessment: ${d.title}` : "Mock interview";
        return (
          <motion.li
            key={d.day}
            initial={reduced ? false : { opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.25, delay: Math.min(i * 0.012, 0.36), ease: [0.2, 0.7, 0.3, 1] }}
          >
            <Link
              href={`/learn/day/${d.day}`}
              title={label}
              aria-label={`Day ${d.day}: ${label}${isDone ? " — submitted" : ""}`}
              className={clsx(
                "flex aspect-square flex-col items-center justify-center border-2 text-sm font-extrabold transition-colors",
                isDone
                  ? d.kind === "assessment" ? "border-red-strong bg-red-strong text-white" : "border-ink bg-ink text-paper"
                  : "border-line bg-paper hover:border-ink",
              )}
            >
              {d.day}
              <span className="text-[9px] font-bold uppercase tracking-wider opacity-70">
                {d.kind === "assessment" ? "Test" : d.kind === "interview" ? "Mock" : isDone ? "Done" : ""}
              </span>
            </Link>
          </motion.li>
        );
      })}
    </ol>
  );
}
