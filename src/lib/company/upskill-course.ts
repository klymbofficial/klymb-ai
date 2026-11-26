import { BUILT_LESSONS, MODULES } from "@/data/system-design/course-app";
import { FINAL_MARK, FINAL_TRIES } from "@/lib/sd-pace";
import { SD_COURSE } from "@/lib/sd-offer";

/**
 * The courses Upskill tracks (user, 26 Nov: tracked courses only). Today
 * that is System Design Essentials, the one course whose progress Klymb
 * records per person. Lesson ids are "module-lesson", zero-based.
 */

export interface TrackedLesson { id: string; no: number; title: string; minutes: number; module: number }
export interface TrackedCourse {
  slug: string;
  title: string;
  summary: string;
  modules: { title: string; lessons: TrackedLesson[] }[];
  lessons: TrackedLesson[];
  videoMinutes: number;
  finalMark: number;
  finalTries: number;
}

const minutes = (d: string) => { const [m, s] = d.split(":").map(Number); return m + (s || 0) / 60; };
const moduleName = (title: string) => title.replace(/^Days?\s+[\d–-]+\s*·\s*/, "");

const built = new Set(BUILT_LESSONS);
let n = 0;
const modules = MODULES.map((m, mi) => ({
  title: moduleName(m.title),
  lessons: m.lessons
    .map(([title, d], li) => ({ id: `${mi}-${li}`, title, minutes: minutes(d), module: mi }))
    .filter((l) => built.has(l.id))
    .map((l) => ({ ...l, no: ++n })),
}));
const lessons = modules.flatMap((m) => m.lessons);

export const SYSTEM_DESIGN: TrackedCourse = {
  slug: SD_COURSE,
  title: "System Design Essentials",
  summary: "Short video lessons with a quick check after each, then a final assessment.",
  modules,
  lessons,
  videoMinutes: Math.round(lessons.reduce((s, l) => s + l.minutes, 0)),
  finalMark: FINAL_MARK,
  finalTries: FINAL_TRIES,
};

export const TRACKED_COURSES: readonly TrackedCourse[] = [SYSTEM_DESIGN];
export const trackedCourse = (slug: string) => TRACKED_COURSES.find((c) => c.slug === slug) ?? null;

/** The first lesson this person hasn't passed, for "pick up where you left off". */
export function nextLesson(course: TrackedCourse, passed: ReadonlySet<string>): TrackedLesson | null {
  return course.lessons.find((l) => !passed.has(l.id)) ?? null;
}
