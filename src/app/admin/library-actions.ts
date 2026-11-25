"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getAdmin } from "@/lib/admin/auth";
import { logAdmin } from "@/lib/admin/audit";
import { UUID, createKlymbQuestion, saveKlymbQuestion } from "@/lib/company/library-data";
import { QUESTION_STATUSES, readQuestion, type QuestionStatus } from "@/lib/company/library-rules";
import { db } from "@/lib/db/client";

/**
 * Klymb's library (L1), for any Klymb admin: questions every company sees
 * once published. A draft or a retired question reaches no company. Logged
 * with the id and revision, never the text.
 */

export type KlymbQuestionResult = { ok: false; message: string } | null;

const UNAVAILABLE = { ok: false as const, message: "Unavailable right now. Try again in a minute." };
const CHANGED = { ok: false as const, message: "Someone else saved this question since you opened it. Reload to see their version; your edits here are not saved." };

export async function saveKlymbLibraryQuestion(id: string | null, expected: number, form: Record<string, unknown>, status: QuestionStatus): Promise<KlymbQuestionResult> {
  const admin = await getAdmin();
  if (!admin) return { ok: false, message: "Not authorised." };
  if (!QUESTION_STATUSES.includes(status)) return { ok: false, message: "Choose draft, published or retired." };
  if (id !== null && (typeof id !== "string" || !UUID.test(id) || !Number.isInteger(expected) || expected < 1)) return CHANGED;
  const q = readQuestion(form ?? {});
  if (!q.ok) return q;

  const sql = db();
  if (!sql) return UNAVAILABLE;
  let saved: string;
  if (id === null) {
    const made = await createKlymbQuestion(sql, { q: q.value, status, by: admin.email });
    if (!made) return UNAVAILABLE;
    await logAdmin(admin, "catalog.question_create", made, { type: q.value.type, status });
    saved = made;
  } else {
    const out = await saveKlymbQuestion(sql, { id, q: q.value, status, expected, by: admin.email });
    if (!out) return UNAVAILABLE;
    if (out.status === "changed") return CHANGED;
    await logAdmin(admin, "catalog.question_save", id, { revision: out.revision, status });
    saved = id;
  }
  revalidatePath("/admin/catalog/questions");
  redirect(`/admin/catalog/questions/${saved}`);
}
