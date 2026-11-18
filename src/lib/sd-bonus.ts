import { MODULES } from "@/data/system-design/course-app";

/**
 * The System Design bonus: the Top 50 tech interview questions, as a PDF.
 * It unlocks once the learner passes the last lesson (Day 21). The file lives
 * outside public/ (src/data/system-design/bonus) so only /api/sd/bonus can hand
 * it out, after checking the seat and the pass on the server.
 */
export const SD_BONUS = {
  title: "Top 50 most-asked tech interview questions",
  sub: "With model answers, what the interviewer checks and the mistake to avoid",
  file: "top-50-tech-interview-questions.pdf",
  /** The Day 21 lesson id ("module-lesson"): the last lesson of the course. */
  unlockLesson: (() => { const mi = MODULES.length - 1; return `${mi}-${MODULES[mi].lessons.length - 1}`; })(),
  unlockLabel: "Day 21",
} as const;

export const SD_BONUS_URL = "/api/sd/bonus";
