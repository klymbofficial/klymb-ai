"use server";

import { redirect } from "next/navigation";
import { saveDraft, startAttempt, type SaveOutcome } from "@/lib/company/attempt-data";
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
