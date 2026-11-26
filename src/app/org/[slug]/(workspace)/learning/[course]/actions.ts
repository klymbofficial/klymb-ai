"use server";

import { revalidatePath } from "next/cache";
import { LESSON_RELEASES, QUESTIONS } from "@/data/system-design/course-app";
import { gradeFinal, type FinalAnswer } from "@/data/system-design/final";
import type { Lang, Question } from "@/data/system-design/types";
import { requireCompany } from "@/lib/company/auth";
import { canTakeLesson, finalOpen, lessonStates, todayIst } from "@/lib/company/learner-plan";
import { loadLearner } from "@/lib/company/learner-data";
import { SYSTEM_DESIGN } from "@/lib/company/upskill-course";
import { db } from "@/lib/db/client";
import { checkRateLimit } from "@/lib/rate-limit";
import { gradeLesson, isBuiltLesson, lessonReview } from "@/lib/sd-lessons";
import { SD_COURSE } from "@/lib/sd-offer";
import { canTake, paceOf } from "@/lib/sd-pace";
import { sdProgress } from "@/lib/sd-progress";

/**
 * Lesson checks and the final for someone learning inside the workspace
 * (user, 26 Nov). The same records as the public course (lesson_checks,
 * final_attempts), so progress is one thing wherever it was made, and the
 * Upskill pages read it. Self-paced: a lesson opens as soon as the one before
 * it is passed, not the next day. Someone who also paid for a refundable seat
 * of their own keeps one lesson a day, so the refund rule can't be skipped here.
 */

const UNAVAILABLE = "That didn't save just now. Try again in a minute.";
const ORDER = SYSTEM_DESIGN.lessons.map((l) => l.id);

export type CheckResult =
  | { ok: true; pct: number; passed: boolean; review: Record<Lang, Question[]>; nextId: string | null; finalReady: boolean }
  | { ok: false; message: string };

const picksOf = (v: unknown) => (Array.isArray(v) && v.length <= 20 && v.every((p) => p === null || Number.isInteger(p)) ? (v as (number | null)[]) : null);

function refresh(slug: string) {
  revalidatePath(`/org/${slug}/learning`, "layout");
}

export async function submitLessonCheck(slug: string, lesson: string, rawPicks: unknown): Promise<CheckResult> {
  const member = await requireCompany(slug);
  const picks = picksOf(rawPicks);
  if (!isBuiltLesson(lesson) || !picks) return { ok: false, message: "That lesson isn't in the course." };
  const sql = db();
  if (!sql) return { ok: false, message: UNAVAILABLE };
  const me = await loadLearner(sql, member);
  if (me === undefined) return { ok: false, message: UNAVAILABLE };
  if (!me) return { ok: false, message: "Your company hasn't assigned you this course." };
  if (!canTakeLesson(me.states, lesson)) return { ok: false, message: "Pass the lessons before this one first." };
  if (me.refundable) {
    const progress = await sdProgress(member.email, sql);
    if (!progress) return { ok: false, message: UNAVAILABLE };
    if (!canTake(paceOf(progress), lesson)) return { ok: false, message: "Your own paid seat keeps one lesson a day. This one opens tomorrow." };
  }

  const limit = await checkRateLimit("sd_check", { limit: 60, windowMinutes: 60, identity: member.email });
  if (!limit.allowed) return { ok: false, message: "Too many attempts. Take a break and try again later." };

  const { pct, passed } = gradeLesson(lesson, picks);
  const { error } = await sql.run`
    insert into course.lesson_checks (email, course, lesson, best_score, passed_at)
    values (${member.email}, ${SD_COURSE}, ${lesson}, ${pct}, ${passed ? new Date().toISOString() : null})
    on conflict (email, course, lesson) do update
      set best_score = greatest(lesson_checks.best_score, excluded.best_score),
          attempts = lesson_checks.attempts + 1,
          passed_at = coalesce(lesson_checks.passed_at, excluded.passed_at),
          updated_at = now()
  `;
  if (error) return { ok: false, message: UNAVAILABLE };
  refresh(slug);
  const now = new Set(me.passed);
  if (passed) now.add(lesson);
  const states = lessonStates(ORDER, now, LESSON_RELEASES, todayIst(new Date()));
  const nextId = ORDER.find((id) => states.get(id) === "open") ?? null;
  return { ok: true, pct, passed, review: lessonReview(lesson), nextId, finalReady: finalOpen(ORDER, now) };
}

export type FinalResult = { ok: true; score: number; results: number[]; attempt: number } | { ok: false; message: string };

const isAnswer = (v: unknown) => v === null || typeof v === "number" || typeof v === "string" || (Array.isArray(v) && v.length <= 20 && v.every(Number.isInteger));
const answersOf = (v: unknown) =>
  Array.isArray(v) && v.length === QUESTIONS.length && v.every(isAnswer) && !v.some((a) => typeof a === "string" && a.length > 2000)
    ? (v.map((a) => (a === null ? undefined : a)) as FinalAnswer[])
    : null;

/**
 * Grades one try of the final. `attempt` is the try the page thinks this is:
 * sent twice, the second finds the first's row, so a double click costs one try.
 * Retakes are allowed; the best score counts.
 */
export async function submitFinal(slug: string, rawAnswers: unknown, attempt: number): Promise<FinalResult> {
  const member = await requireCompany(slug);
  const answers = answersOf(rawAnswers);
  if (!answers || !Number.isInteger(attempt) || attempt < 1) return { ok: false, message: "Those answers didn't come through. Try again." };
  const sql = db();
  if (!sql) return { ok: false, message: UNAVAILABLE };
  const me = await loadLearner(sql, member);
  if (me === undefined) return { ok: false, message: UNAVAILABLE };
  if (!me) return { ok: false, message: "Your company hasn't assigned you this course." };
  if (!finalOpen(ORDER, me.passed)) return { ok: false, message: "The final opens once every lesson is passed." };
  if (me.refundable) {
    const progress = await sdProgress(member.email, sql);
    if (!progress) return { ok: false, message: UNAVAILABLE };
    if (!paceOf(progress).finalOpen) return { ok: false, message: "Your own paid seat opens the final the day after your last lesson." };
  }
  if (attempt > me.finals.length + 1) return { ok: false, message: "This page is out of date. Reload it and try again." };

  const limit = await checkRateLimit("sd_final", { limit: 20, windowMinutes: 60, identity: member.email });
  if (!limit.allowed) return { ok: false, message: "Too many attempts. Take a break and try again later." };

  const { results, score } = gradeFinal(answers);
  const { error } = await sql.run`
    insert into course.final_attempts (email, course, attempt, score, results)
    values (${member.email}, ${SD_COURSE}, ${attempt}, ${score}, ${results}::smallint[])
    on conflict (email, course, attempt) do nothing
  `;
  if (error) return { ok: false, message: UNAVAILABLE };
  const { data: kept } = await sql.row<{ score: number; results: number[] }>`
    select score, results from course.final_attempts where email = ${member.email} and course = ${SD_COURSE} and attempt = ${attempt}
  `;
  refresh(slug);
  return { ok: true, score: kept?.score ?? score, results: kept?.results ?? results, attempt };
}
