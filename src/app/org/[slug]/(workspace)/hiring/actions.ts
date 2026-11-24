"use server";

import { revalidatePath } from "next/cache";
import { allowCompany, type CompanyMember } from "@/lib/company/access";
import { logCompany } from "@/lib/company/audit";
import { getWorkspaceMember } from "@/lib/company/auth";
import {
  cancelBatch, cancelCandidate, claimChange, claimReminders, claimRetry, createBatch, hiringOptions, loadBatch, startSending, type Batch, type Candidate,
} from "@/lib/company/batch-data";
import { canRetry, canSchedule, passedNote, readBatchForm, readExtension, startPassed, type BatchField, type ListProblem } from "@/lib/company/batch-rules";
import { deliver, type SendReport } from "@/lib/company/batch-send";
import { db, type Db } from "@/lib/db/client";
import { normaliseEmail } from "@/lib/email";

export type ActionResult = { ok: true; message: string } | { ok: false; message: string };
export type CreateResult =
  | { ok: true; id: string }
  | { ok: false; message: string; errors?: Partial<Record<BatchField, string>>; problems?: ListProblem[] };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isId = (v: unknown): v is string => typeof v === "string" && UUID.test(v);
const UNAVAILABLE = { ok: false as const, message: "That didn't work just now. Try again in a minute." };
const NOT_ALLOWED = { ok: false as const, message: "Only a recruiter in your company can do this. Try signing in again." };
const GONE = { ok: false as const, message: "That batch is no longer here. Reload the page." };

/** The signed-in recruiter of this workspace, or null. The company comes from the login, never the form. */
async function recruiterFor(slug: unknown): Promise<CompanyMember | null> {
  if (typeof slug !== "string") return null;
  const member = await getWorkspaceMember(slug);
  return allowCompany(member, slug) && canSchedule(member) ? member : null;
}

/** The recruiter, the database and the batch, or the result to answer with. */
async function context(slug: unknown, batchId: unknown): Promise<{ member: CompanyMember; sql: Db; batch: Batch; candidates: Candidate[] } | ActionResult> {
  const member = await recruiterFor(slug);
  if (!member) return NOT_ALLOWED;
  if (!isId(batchId)) return GONE;
  const sql = db();
  if (!sql) return UNAVAILABLE;
  const found = await loadBatch(sql, member.companyId, batchId);
  if (found === null) return UNAVAILABLE;
  if (!found) return GONE;
  return { member, sql, batch: found.batch, candidates: found.candidates };
}

/** Every workspace page: the test's Candidates tab and rounds, the review pages, the Assessments list counts (U10). */
function refresh() {
  revalidatePath("/org/[slug]/(workspace)", "layout");
}
const people = (n: number) => (n === 1 ? "1 person" : `${n} people`);
const PASSED_ONE = "Not sent: their time to start has passed, so the link couldn't start the test. Use Change time to give them a later start, which emails a working link.";

/** What happened, plus how many were left out because their time to start had passed. */
function reportMessage(r: SendReport, done: string, passed = 0): ActionResult {
  const note = passedNote(passed);
  if (!r.sent && !r.failed) return { ok: false, message: note || "Nobody needed this. The list may have changed: reload the page." };
  const tail = note ? ` ${note}` : "";
  if (!r.failed) return { ok: true, message: `${done} to ${people(r.sent)}.${tail}` };
  return { ok: false, message: `${r.sent ? `${done} to ${people(r.sent)}. ` : ""}${people(r.failed)} didn't get it. See the reason beside each, then retry.${tail}` };
}

/** Their last start, as the batch gives it or an extension set it, is now or past. */
const passedFor = (batch: Batch, now: Date) => (c: Pick<Candidate, "extraMinutes" | "lastStartAt">) =>
  startPassed({ closesAt: batch.closesAt, minutes: batch.minutes }, c, now);

/**
 * Makes a draft batch from the form. Nothing is sent: the recruiter sees the
 * preview next. A submit retried with the same request key finds the first.
 */
export async function createHiringBatch(slug: string, form: Record<string, string>): Promise<CreateResult> {
  const member = await recruiterFor(slug);
  if (!member) return NOT_ALLOWED;
  if (!form || typeof form !== "object") return UNAVAILABLE;
  const sql = db();
  if (!sql) return UNAVAILABLE;
  const options = await hiringOptions(sql, member.companyId);
  if (!options) return UNAVAILABLE;
  const read = readBatchForm(form, { now: new Date(), tests: options.tests, reviewers: options.reviewers.map((r) => r.email), prepCourses: options.prepCourses });
  if (!read.ok) return { ok: false, message: "Check the highlighted fields.", errors: read.errors, problems: read.problems };
  if (!isId(form.requestKey)) return UNAVAILABLE;

  const made = await createBatch(sql, { ...read.value, companyId: member.companyId, requestKey: form.requestKey, by: member.email });
  if (!made) return UNAVAILABLE;
  if (made.status === "changed") return { ok: false, message: "The test's approved version or the reviewer changed while you were filling this in. Reload and check them." };
  if (made.status === "created") {
    await logCompany(member, "company.batch_create", { batch_id: made.id, item: read.value.item, version_id: read.value.versionId, people: read.value.candidates.length });
  }
  refresh();
  return { ok: true, id: made.id };
}

/** Sends a draft's invitations. A second click finds it already sent and sends nothing. */
export async function sendHiringBatch(slug: string, batchId: string): Promise<ActionResult> {
  const c = await context(slug, batchId);
  if ("ok" in c) return c;
  if (c.batch.status !== "draft") return { ok: false, message: "This batch has already been sent or cancelled." };
  const passed = passedFor(c.batch, new Date());
  const waiting = c.candidates.filter((p) => p.status === "active" && p.delivery === "pending");
  const late = waiting.filter(passed).length;
  const targets = await startSending(c.sql, c.member.companyId, c.batch.id, c.member.email);
  if (!targets) return UNAVAILABLE;
  if (!targets.length) {
    if (waiting.length && late === waiting.length) {
      return { ok: false, message: "Nothing was sent: the time to start has passed for everyone in this batch, so their links couldn't start the test. Discard this draft and make a new batch with a later closing time." };
    }
    return { ok: false, message: "Nothing was sent. The batch may have closed or been sent already: reload the page." };
  }
  // Counted from the page's own read just before the claim; the claim itself is what decided.
  const left = Math.min(late, Math.max(0, waiting.length - targets.length));
  const report = await deliver(c.sql, { ...c.batch, status: "sent" }, "invite", targets, c.member.email);
  await logCompany(c.member, "company.batch_send", { batch_id: c.batch.id, sent: report.sent, failed: report.failed, start_passed: left });
  refresh();
  return reportMessage(report, "Invitation sent", left);
}

/** Sends the same link again to one person, or to everyone whose delivery failed. */
export async function retryDelivery(slug: string, batchId: string, candidateId: string | null): Promise<ActionResult> {
  const c = await context(slug, batchId);
  if ("ok" in c) return c;
  if (candidateId !== null && !isId(candidateId)) return GONE;
  const now = new Date();
  const late = c.candidates.filter(
    (p) => p.status === "active" && (candidateId === null || p.id === candidateId) && canRetry({ delivery: p.delivery, claimedAt: p.claimedAt }, now) && passedFor(c.batch, now)(p),
  ).length;
  const targets = await claimRetry(c.sql, c.member.companyId, c.batch.id, candidateId ? [candidateId] : null);
  if (!targets) return UNAVAILABLE;
  if (!targets.length && late && candidateId) return { ok: false, message: PASSED_ONE };
  const report = await deliver(c.sql, c.batch, "invite", targets, c.member.email);
  if (targets.length) await logCompany(c.member, "company.batch_retry", { batch_id: c.batch.id, sent: report.sent, failed: report.failed, start_passed: late });
  refresh();
  return reportMessage(report, "Invitation sent again", late);
}

/** Reminds one person, or everyone who can still start. */
export async function remindCandidates(slug: string, batchId: string, candidateId: string | null): Promise<ActionResult> {
  const c = await context(slug, batchId);
  if ("ok" in c) return c;
  if (candidateId !== null && !isId(candidateId)) return GONE;
  const targets = await claimReminders(c.sql, c.member.companyId, c.batch.id, candidateId ? [candidateId] : null);
  if (!targets) return UNAVAILABLE;
  if (!targets.length) {
    return { ok: false, message: candidateId ? "No reminder sent. They were reminded in the last 10 minutes, their invitation hasn't been sent, or their last start has passed." : "Nobody to remind right now." };
  }
  const report = await deliver(c.sql, c.batch, "reminder", targets, c.member.email);
  await logCompany(c.member, "company.batch_remind", { batch_id: c.batch.id, sent: report.sent, failed: report.failed });
  refresh();
  return reportMessage(report, "Reminder sent");
}

export type CandidateChange =
  | { kind: "new_link" }
  | { kind: "email"; email: string }
  | { kind: "extension"; extraMinutes: string; lastStart: string };

/**
 * One person's change, emailed to them straight away: a new link (the old
 * one stops working), a corrected address for a failed delivery (with a new
 * link), or more time and a later last start.
 */
export async function changeCandidate(slug: string, batchId: string, candidateId: string, change: CandidateChange): Promise<ActionResult> {
  const c = await context(slug, batchId);
  if ("ok" in c) return c;
  if (!isId(candidateId) || !change || typeof change !== "object") return GONE;

  let claim: Parameters<typeof claimChange>[4];
  if (change.kind === "new_link") claim = { kind: "new_link" };
  else if (change.kind === "email") {
    const email = normaliseEmail(change.email);
    if (!email) return { ok: false, message: "Enter a valid email address." };
    claim = { kind: "email", email };
  } else if (change.kind === "extension") {
    const ext = readExtension(change, { now: new Date(), timeZone: c.batch.timeZone, closesAt: c.batch.closesAt, minutes: c.batch.minutes });
    if (!ext.ok) return ext;
    claim = { kind: "extension", ...ext.value };
  } else return GONE;

  // A new link or a corrected address still carries their old last start: if it has passed, the link would be dead on arrival.
  const person = c.candidates.find((p) => p.id === candidateId);
  if (claim.kind !== "extension" && person?.status === "active" && passedFor(c.batch, new Date())(person)) return { ok: false, message: PASSED_ONE };

  const target = await claimChange(c.sql, c.member.companyId, c.batch.id, candidateId, claim);
  if (target === null) return UNAVAILABLE;
  if (target === "taken") return { ok: false, message: "That email is already in this batch." };
  if (!target) return { ok: false, message: "That can't be changed now. They may be cancelled, an email to them may be on its way, their time to start may have passed, or the batch isn't sent. Reload the page." };

  const kind = claim.kind === "extension" ? "extension" : "new_link";
  const report = await deliver(c.sql, c.batch, kind, [target], c.member.email);
  const action = claim.kind === "extension" ? "company.candidate_extend" : claim.kind === "email" ? "company.candidate_email" : "company.candidate_new_link";
  await logCompany(c.member, action, { batch_id: c.batch.id, candidate_id: target.id, ...(claim.kind === "extension" ? { extra_minutes: claim.extraMinutes, last_start_set: !!claim.lastStartAt } : {}) });
  refresh();
  if (report.failed) return { ok: false, message: "Saved, but the email didn't go out. See the reason beside them, then retry." };
  return { ok: true, message: claim.kind === "extension" ? "New time saved and emailed." : "New link emailed. The old one no longer works." };
}

/** Cancels one person's invitation. Their link can no longer start the test. No email is sent. */
export async function cancelInvitation(slug: string, batchId: string, candidateId: string): Promise<ActionResult> {
  const c = await context(slug, batchId);
  if ("ok" in c) return c;
  if (!isId(candidateId)) return GONE;
  const n = await cancelCandidate(c.sql, c.member.companyId, c.batch.id, candidateId, c.member.email);
  if (n === null) return UNAVAILABLE;
  if (!n) return { ok: false, message: "Already cancelled." };
  await logCompany(c.member, "company.candidate_cancel", { batch_id: c.batch.id, candidate_id: candidateId });
  refresh();
  return { ok: true, message: "Invitation cancelled. Their link can't start the test." };
}

/** Cancels the whole batch, draft or sent. No link in it can start the test. No email is sent. */
export async function cancelHiringBatch(slug: string, batchId: string): Promise<ActionResult> {
  const c = await context(slug, batchId);
  if ("ok" in c) return c;
  const n = await cancelBatch(c.sql, c.member.companyId, c.batch.id, c.member.email);
  if (n === null) return UNAVAILABLE;
  if (!n) return { ok: false, message: "Already cancelled." };
  await logCompany(c.member, "company.batch_cancel", { batch_id: c.batch.id, was: c.batch.status });
  refresh();
  return { ok: true, message: c.batch.status === "draft" ? "Draft discarded." : "Batch cancelled. No link in it can start the test." };
}
