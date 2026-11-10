"use server";

import { revalidatePath } from "next/cache";
import { assignEveryoneWithout, assignOne, loadAssignState, unassignOne } from "@/lib/company/assignments";
import { logCompany } from "@/lib/company/audit";
import { hrFor } from "@/lib/company/auth";
import { db } from "@/lib/db/client";
import { normaliseEmail } from "@/lib/email";

export type AssignResult = { ok: true; message: string } | { ok: false; message: string };

const NOT_ALLOWED: AssignResult = { ok: false, message: "Only your company's HR can do this. Try signing in again." };
const UNAVAILABLE: AssignResult = { ok: false, message: "That didn't work just now. Please try again in a minute." };
const NOT_MEMBER: AssignResult = { ok: false, message: "That person isn't in your company." };
const FULL = (seats: number): AssignResult => ({
  ok: false,
  message: `All ${seats} of your seats already have the course. Remove someone's assignment, or ask Klymb for more seats.`,
});

function refresh(slug: string) {
  revalidatePath(`/org/${slug}/learning`);
  revalidatePath(`/org/${slug}`);
}

/** Assigns System Design to one active member of the HR person's own company. */
export async function assignCourse(slug: string, rawEmail: string): Promise<AssignResult> {
  const hr = await hrFor(slug);
  if (!hr) return NOT_ALLOWED;
  const email = normaliseEmail(rawEmail);
  if (!email) return NOT_MEMBER;
  const sql = db();
  if (!sql) return UNAVAILABLE;

  const state = await loadAssignState(sql, hr.companyId, email);
  if (!state) return UNAVAILABLE;
  if (!state.member) return NOT_MEMBER;
  if (state.ownAccess) return { ok: false, message: `${email} already has the course of their own. Nothing to assign.` };
  if (state.assigned) return { ok: false, message: `${email} already has the course assigned.` };
  if (state.used >= state.seats) return FULL(state.seats);

  const written = await assignOne(sql, hr.companyId, email, hr.email);
  if (written === null) return UNAVAILABLE;
  if (!written) return { ok: false, message: "That couldn't be done: something changed meanwhile. Reload and try again." };
  await logCompany(hr, "company.course_assign", { email, course: "system-design" });
  refresh(slug);
  return { ok: true, message: `System Design is assigned to ${email}. They open it by signing in to the course with Google, using that email.` };
}

/** Takes the course back from one person. Their lesson record is kept. */
export async function unassignCourse(slug: string, rawEmail: string): Promise<AssignResult> {
  const hr = await hrFor(slug);
  if (!hr) return NOT_ALLOWED;
  const email = normaliseEmail(rawEmail);
  if (!email) return NOT_MEMBER;
  const sql = db();
  if (!sql) return UNAVAILABLE;

  const changed = await unassignOne(sql, hr.companyId, email, hr.email);
  if (changed === null) return UNAVAILABLE;
  if (!changed) return { ok: false, message: `${email} doesn't have the course assigned.` };
  await logCompany(hr, "company.course_unassign", { email, course: "system-design" });
  refresh(slug);
  return { ok: true, message: `The assignment for ${email} was removed. They can no longer open the course; what they did is kept.` };
}

/**
 * Assigns everyone who has no assignment and no course of their own. `expected`
 * is the number the HR person was shown and confirmed; if it isn't the real
 * number any more, or it would pass the seat count, nobody is assigned.
 * The audit entry records the count, never the list.
 */
export async function assignAllWithout(slug: string, expected: number): Promise<AssignResult> {
  const hr = await hrFor(slug);
  if (!hr) return NOT_ALLOWED;
  if (!Number.isInteger(expected) || expected < 1) return { ok: false, message: "There is nobody to assign." };
  const sql = db();
  if (!sql) return UNAVAILABLE;

  const me = await loadAssignState(sql, hr.companyId, hr.email);
  if (!me) return UNAVAILABLE;
  if (me.used + expected > me.seats) {
    return { ok: false, message: `That would be ${me.used + expected} people on ${me.seats} seats. Nobody was assigned.` };
  }

  const written = await assignEveryoneWithout(sql, hr.companyId, expected, hr.email);
  if (written === null) return UNAVAILABLE;
  if (written !== expected) {
    return { ok: false, message: "Nobody was assigned: the people or seats changed since you confirmed. Reload and try again." };
  }
  await logCompany(hr, "company.course_assign_all", { assigned: written, course: "system-design" });
  refresh(slug);
  return { ok: true, message: `System Design is assigned to ${written} ${written === 1 ? "person" : "people"}. Each opens it by signing in to the course with Google, using their work email.` };
}
