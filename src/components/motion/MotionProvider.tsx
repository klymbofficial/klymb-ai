"use client";

import { MotionConfig } from "motion/react";

/**
 * Reduced motion, handled once. The library skips movement for visitors who
 * ask for less motion, while the server and the first client render stay
 * identical — branching `initial` on the preference made them disagree,
 * because the server cannot know it.
 */
export function MotionProvider({ children }: { children: React.ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
