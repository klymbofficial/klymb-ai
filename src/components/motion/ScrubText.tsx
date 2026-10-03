"use client";

import { motion, useReducedMotion, useScroll, useTransform, type MotionValue } from "motion/react";
import { useRef } from "react";

/**
 * Text that writes itself in as it scrolls through the viewport: each word
 * goes from faint to full as the reader scrolls past it, the effect on
 * string-tune.fiddle.digital, built on the Motion scroll timeline the site
 * already uses. Plain text with reduced motion. Screen readers get the
 * sentence once, not word by word.
 */
export function ScrubText({ text, className }: { text: string; className?: string }) {
  const ref = useRef<HTMLParagraphElement>(null);
  const reduced = useReducedMotion();
  // 0 when the text's top reaches the bottom of the screen, 1 when its end reaches the middle.
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 0.95", "end 0.5"] });
  const words = text.split(" ");

  if (reduced) return <p className={className}>{text}</p>;

  return (
    <p ref={ref} className={className}>
      <span className="sr-only">{text}</span>
      {words.map((w, i) => (
        <Word key={i} progress={scrollYProgress} range={[i / words.length, (i + 1) / words.length]}>
          {w}
        </Word>
      ))}
    </p>
  );
}

function Word({ children, progress, range }: { children: string; progress: MotionValue<number>; range: [number, number] }) {
  const opacity = useTransform(progress, range, [0.18, 1]);
  return (
    <>
      <motion.span aria-hidden="true" style={{ opacity }}>{children}</motion.span>{" "}
    </>
  );
}
