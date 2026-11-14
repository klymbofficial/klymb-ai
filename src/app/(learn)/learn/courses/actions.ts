"use server";

import { currentEmail } from "@/auth";
import { getCourse } from "@/data/courses/registry";
import { writeCourseProgress } from "@/lib/course-progress";
import { checkRateLimit } from "@/lib/rate-limit";

/**
 * Saves a module marked done or a quiz score for the signed-in learner. The
 * course and module must be real ones; the score must fit the quiz's length.
 */
export async function saveCourseProgress(course: string, module: string, patch: { done?: boolean; quiz?: { score: number; total: number } }) {
  const email = await currentEmail();
  if (!email) return { ok: false as const };
  const mod = getCourse(course)?.modules.find((m) => m.slug === module);
  if (!mod) return { ok: false as const };
  const quiz = patch.quiz;
  if (quiz && !(Number.isInteger(quiz.score) && Number.isInteger(quiz.total) && quiz.total > 0 && quiz.total <= 50 && quiz.score >= 0 && quiz.score <= quiz.total)) {
    return { ok: false as const };
  }
  if (patch.done !== undefined && typeof patch.done !== "boolean") return { ok: false as const };
  const limit = await checkRateLimit("course_progress", { limit: 120, windowMinutes: 60, identity: email });
  if (!limit.allowed) return { ok: false as const };
  const saved = await writeCourseProgress(email, course, module, { done: patch.done, quiz });
  return { ok: saved };
}
