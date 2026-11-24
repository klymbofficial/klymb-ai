"use server";

import { redirect } from "next/navigation";
import { attemptTask, saveDraft, saveQuestionAnswer, startAttempt, submitAttempt, type SaveOutcome, type SubmitOutcome } from "@/lib/company/attempt-data";
import { MAX_ANSWER_CHARS } from "@/lib/company/attempt-rules";
import { readCandidateLink } from "@/lib/company/batch-link";
import { db } from "@/lib/db/client";

export type StartResult = { message: string } | null;

/**
 * The candidate's Start. Their private link is their only key: its
 * signature and generation are checked again here (an action can be posted
 * directly), and the database decides whether this person may start now.
 * Pressing it again, or from another tab, resumes the same attempt. On
 * success it opens the attempt page.
 */
export async function startTest(_prev: StartResult, form: FormData): Promise<StartResult> {
  const token = form.get("token");
  const ref = readCandidateLink(token);
  if (!ref || typeof token !== "string") return { message: "This link doesn't work. Open the whole link from your email." };
  const sql = db();
  if (!sql) return { message: "The test can't start right now. Try again in a minute." };
  const out = await startAttempt(sql, ref.id, ref.generation);
  if (!out) return { message: "The test can't start right now. Try again in a minute." };
  if (out.status === "refused") return { message: "This link can't start the test now. Reload the page to see why." };
  redirect(`/assessment/${token}/attempt`);
}

export type SaveResult = SaveOutcome | { status: "error" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Saves the candidate's answer. Called by the answer box every few seconds
 * while they write and when they leave it. The link is checked again, and
 * the database decides whether the attempt is still open and whether this
 * save is based on the latest one (an older tab gets "conflict").
 */
export async function saveAnswer(token: unknown, attemptId: unknown, baseRevision: unknown, answer: unknown): Promise<SaveResult> {
  const ref = readCandidateLink(token);
  if (!ref) return { status: "refused" };
  if (typeof attemptId !== "string" || !UUID.test(attemptId)) return { status: "refused" };
  if (typeof baseRevision !== "number" || !Number.isInteger(baseRevision) || baseRevision < 0) return { status: "error" };
  if (typeof answer !== "string" || answer.length > MAX_ANSWER_CHARS) return { status: "error" };
  const sql = db();
  if (!sql) return { status: "error" };
  const out = await saveDraft(sql, { candidateId: ref.id, generation: ref.generation, attemptId, baseRevision, answer });
  return out ?? { status: "error" };
}

/**
 * Saves one question's answer (L2): the text of a written question, or the
 * options picked for multiple choice. The link is checked again; the
 * question must be one of this attempt's, of the right kind, and the picks
 * real options. The database decides the rest, as for saveAnswer.
 */
export async function saveQuestion(
  token: unknown, attemptId: unknown, questionNo: unknown, baseRevision: unknown, answer: unknown, picked: unknown,
): Promise<SaveResult> {
  const ref = readCandidateLink(token);
  if (!ref) return { status: "refused" };
  if (typeof attemptId !== "string" || !UUID.test(attemptId)) return { status: "refused" };
  if (typeof questionNo !== "number" || !Number.isInteger(questionNo) || questionNo < 1 || questionNo > 20) return { status: "error" };
  if (typeof baseRevision !== "number" || !Number.isInteger(baseRevision) || baseRevision < 0) return { status: "error" };
  if (typeof answer !== "string" || answer.length > MAX_ANSWER_CHARS) return { status: "error" };
  if (!Array.isArray(picked) || picked.some((p) => typeof p !== "number" || !Number.isInteger(p) || p < 0)) return { status: "error" };
  const sql = db();
  if (!sql) return { status: "error" };
  const task = await attemptTask(sql, attemptId);
  const q = task?.questions?.find((x) => x.no === questionNo);
  if (!q) return { status: "error" };
  const picks = [...new Set(picked as number[])].sort((a, b) => a - b);
  if (q.kind === "mcq") {
    if (answer !== "" || picks.some((p) => p >= q.options.length) || (!q.multi && picks.length > 1)) return { status: "error" };
  } else if (picks.length) {
    return { status: "error" };
  }
  const out = await saveQuestionAnswer(sql, { candidateId: ref.id, generation: ref.generation, attemptId, questionNo, baseRevision, answer, picked: picks });
  return out ?? { status: "error" };
}

export type SubmitResult = Exclude<SubmitOutcome, { status: "submitted" | "already" }> | { status: "error" };

/**
 * The candidate's Submit. The page saves the answer first and passes the
 * revision it shows; the database copies that answer and the attached files
 * into a frozen submission, once (a second press, or another tab, gets the
 * same receipt). On success, or if it was already submitted, it opens the
 * link's page, which shows the receipt.
 */
export async function submitTest(token: unknown, attemptId: unknown, revision: unknown): Promise<SubmitResult> {
  const ref = readCandidateLink(token);
  if (!ref || typeof token !== "string") return { status: "refused" };
  if (typeof attemptId !== "string" || !UUID.test(attemptId)) return { status: "refused" };
  // Null for a test with questions: each question saves on its own, and what is saved is submitted.
  if (revision !== null && (typeof revision !== "number" || !Number.isInteger(revision) || revision < 0)) return { status: "error" };
  const sql = db();
  if (!sql) return { status: "error" };
  const out = await submitAttempt(sql, { candidateId: ref.id, generation: ref.generation, attemptId, revision });
  if (!out) return { status: "error" };
  if (out.status === "stale" || out.status === "closed" || out.status === "refused") return out;
  redirect(`/assessment/${token}`);
}
