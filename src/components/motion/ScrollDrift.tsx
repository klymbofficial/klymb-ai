"use client";

import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import { useRef } from "react";

/**
 * A photo that drifts slightly against the scroll while its frame crosses the
 * screen: the parallax on string-tune.fiddle.digital. The child is scaled up
 * a little so the drift never shows an edge. Still with reduced motion.
 */
export function ScrollDrift({ children, className }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], ["-5%", "5%"]);

  return (
    <div ref={ref} className={className}>
      <motion.div className="absolute inset-0" style={reduced ? undefined : { y, scale: 1.12 }}>
        {children}
      </motion.div>
    </div>
  );
}
