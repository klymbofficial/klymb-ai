"use server";

import { redirect } from "next/navigation";
import { startAttempt } from "@/lib/company/attempt-data";
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
