"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { allowCompany } from "@/lib/company/access";
import { logCompany } from "@/lib/company/audit";
import { getWorkspaceMember } from "@/lib/company/auth";
import { UUID, createOwnQuestion, removeOwnQuestion, saveOwnQuestion } from "@/lib/company/library-data";
import { canWriteQuestions, readQuestion } from "@/lib/company/library-rules";
import { db } from "@/lib/db/client";

/**
 * A company's own questions (L1): the people who write its tests add,
 * edit and remove questions in My Library. The company always comes from
 * the signed-in member; another company's question reads as gone. Audit
 * entries record the question's id and revision, never its text.
 */

export type QuestionResult = { ok: false; message: string } | null;

const UNAVAILABLE = { ok: false as const, message: "That didn't work just now. Try again in a minute." };
const NOT_ALLOWED = { ok: false as const, message: "Only an admin or a recruiter in your company can write questions. Try signing in again." };
const CHANGED = { ok: false as const, message: "Someone else saved this question since you opened it, or it was removed. Reload to see it; your edits here are not saved." };

async function writer(slug: unknown) {
  const member = typeof slug === "string" ? await getWorkspaceMember(slug) : null;
  return allowCompany(member, slug as string) && canWriteQuestions(member) ? member : null;
}

/** Adds the question (`id` null) or saves it if nobody saved since `expected`, then opens it in My Library. */
export async function saveQuestion(company: string, id: string | null, expected: number, form: Record<string, unknown>): Promise<QuestionResult> {
  const member = await writer(company);
  if (!member) return NOT_ALLOWED;
  if (id !== null && (typeof id !== "string" || !UUID.test(id))) return CHANGED;
  if (id !== null && (!Number.isInteger(expected) || expected < 1)) return CHANGED;
  const q = readQuestion(form ?? {});
  if (!q.ok) return q;

  const sql = db();
  if (!sql) return UNAVAILABLE;
  let saved: string;
  if (id === null) {
    const made = await createOwnQuestion(sql, { companyId: member.companyId, q: q.value, by: member.email });
    if (!made) return UNAVAILABLE;
    await logCompany(member, "company.question_create", { question: made, type: q.value.type });
    saved = made;
  } else {
    const out = await saveOwnQuestion(sql, { companyId: member.companyId, id, q: q.value, expected, by: member.email });
    if (!out) return UNAVAILABLE;
    if (out.status === "changed") return CHANGED;
    await logCompany(member, "company.question_save", { question: id, revision: out.revision });
    saved = id;
  }
  revalidatePath(`/org/${member.companySlug}/library`);
  redirect(`/org/${member.companySlug}/library?tab=mine&open=${saved}`);
}

/** Removes one of the company's questions from My Library. Tests that copied it keep their copy. */
export async function removeQuestion(company: string, id: string): Promise<QuestionResult> {
  const member = await writer(company);
  if (!member) return NOT_ALLOWED;
  if (typeof id !== "string" || !UUID.test(id)) return CHANGED;
  const sql = db();
  if (!sql) return UNAVAILABLE;
  const out = await removeOwnQuestion(sql, { companyId: member.companyId, id, by: member.email });
  if (out === null) return UNAVAILABLE;
  if (!out) return CHANGED;
  await logCompany(member, "company.question_remove", { question: id });
  revalidatePath(`/org/${member.companySlug}/library`);
  redirect(`/org/${member.companySlug}/library?tab=mine`);
}
