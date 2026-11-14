"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { saveCourseProgress } from "@/app/(learn)/learn/courses/actions";

/**
 * A course's progress for the signed-in learner: modules marked done and the
 * best quiz score per module. It starts from what the server holds and saves
 * each change back to their account, so it follows them to any device. The
 * page updates at once; a save that fails is simply tried again next time.
 */
export type Progress = { done: string[]; quiz: Record<string, { score: number; total: number }> };

const EMPTY: Progress = { done: [], quiz: {} };

const Ctx = createContext<{ course: string; progress: Progress; setProgress: (fn: (p: Progress) => Progress) => void } | null>(null);

export function CourseProgressProvider({ course, initial, children }: { course: string; initial: Progress; children: ReactNode }) {
  const [progress, set] = useState(initial);
  const setProgress = useCallback((fn: (p: Progress) => Progress) => set(fn), []);
  return <Ctx.Provider value={{ course, progress, setProgress }}>{children}</Ctx.Provider>;
}

/** The same shape the course components were written against: progress, setDone, recordQuiz. */
export function useCourseProgress(course: string) {
  const ctx = useContext(Ctx);
  const own = ctx?.course === course;
  const progress = own ? ctx.progress : EMPTY;

  const setDone = useCallback(
    (module: string, done: boolean) => {
      if (!own) return;
      ctx.setProgress((p) => ({ ...p, done: done ? [...new Set([...p.done, module])] : p.done.filter((m) => m !== module) }));
      void saveCourseProgress(course, module, { done }).catch(() => {});
    },
    [ctx, own, course],
  );

  const recordQuiz = useCallback(
    (module: string, score: number, total: number) => {
      if (!own) return;
      ctx.setProgress((p) => {
        const prev = p.quiz[module];
        return prev && prev.score >= score ? p : { ...p, quiz: { ...p.quiz, [module]: { score, total } } };
      });
      void saveCourseProgress(course, module, { quiz: { score, total } }).catch(() => {});
    },
    [ctx, own, course],
  );

  return { progress, setDone, recordQuiz };
}
