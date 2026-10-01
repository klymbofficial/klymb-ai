"use client";

import clsx from "clsx";
import { motion, useReducedMotion } from "motion/react";

const EASE = [0.2, 0.7, 0.2, 1] as const;

/**
 * The old job title gets struck through, then the role that replaces it rises
 * in letter by letter: the split-text reveal on string-tune.fiddle.digital.
 * Runs once when it scrolls into view. With reduced motion both states are
 * simply shown. Screen readers hear "QA Engineer, becoming AI Test Architect".
 */
export function StrikeReveal({
  from,
  to,
  as: Tag = "h3",
  fromClassName,
  toClassName,
  className,
  delay = 0,
  id,
}: {
  from: string;
  to: string;
  as?: "h1" | "h2" | "h3";
  fromClassName?: string;
  toClassName?: string;
  className?: string;
  delay?: number;
  id?: string;
}) {
  const reduced = useReducedMotion();
  const MotionTag = motion[Tag];
  const strikeAt = delay + 0.15;
  const revealAt = strikeAt + 0.55;

  return (
    <MotionTag
      id={id}
      className={clsx("flex flex-col", className)}
      aria-label={`${from}, becoming ${to}`}
      initial={reduced ? false : "hidden"}
      whileInView="shown"
      viewport={{ once: true, amount: 0.6 }}
    >
      {/* The job as it was: struck, then faded. */}
      <span aria-hidden="true" className={clsx("relative w-fit", fromClassName)}>
        <motion.span
          className="inline-block"
          variants={{ hidden: { opacity: 1 }, shown: { opacity: 0.38, transition: { delay: strikeAt + 0.4, duration: 0.4 } } }}
        >
          {from}
        </motion.span>
        <motion.span
          className="absolute top-[54%] left-[-2%] h-[0.09em] min-h-[2px] w-[104%] origin-left rounded-full bg-red-strong"
          variants={{ hidden: { scaleX: 0 }, shown: { scaleX: 1, transition: { delay: strikeAt, duration: 0.5, ease: EASE } } }}
        />
      </span>

      {/* The role it becomes: each letter rises out of a clipped line. */}
      <span aria-hidden="true" className={clsx("block overflow-hidden pb-[0.08em]", toClassName)}>
        <span className="mr-[0.3em] inline-block text-red-strong">→</span>
        {/* Letters animate one by one, but each word stays unbroken when it wraps. */}
        {to.split(" ").map((word, w, words) => {
          const offset = words.slice(0, w).join(" ").length + (w ? 1 : 0);
          return (
            <span key={w} className="inline-block whitespace-nowrap">
              {word.split("").map((ch, i) => (
                <motion.span
                  key={i}
                  className="inline-block"
                  variants={{
                    hidden: { y: "110%", opacity: 0 },
                    shown: { y: "0%", opacity: 1, transition: { delay: revealAt + (offset + i) * 0.022, duration: 0.5, ease: EASE } },
                  }}
                >
                  {ch}
                </motion.span>
              ))}
              {w < words.length - 1 && <span className="inline-block">&nbsp;</span>}
            </span>
          );
        })}
      </span>
    </MotionTag>
  );
}
