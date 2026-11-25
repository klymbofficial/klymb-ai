import "server-only";
import { cutoffResult } from "@/lib/company/test-settings";
import { loadTestSettings } from "@/lib/company/test-settings-data";
import type { CompanyMember } from "@/lib/company/access";
import { attemptsForBatch, finaliseDue } from "@/lib/company/attempt-data";
import { attemptState } from "@/lib/company/attempt-rules";
import { loadBatch, type Batch, type Candidate, type MailLogRow } from "@/lib/company/batch-data";
import {
  DELIVERY_LABEL, canRetry, canSchedule, canScore, deadlineText, durationText, allowedMinutes, formatInZone, lastStart, linkState,
  reminderSummary, startPassed, toZonedInput, type Delivery,
} from "@/lib/company/batch-rules";
import { batchStateKey, type BatchStateKey } from "@/lib/company/batch-view";
import { decisionsForBatch } from "@/lib/company/decision-data";
import { autoScoresForBatch, reviewsForBatch } from "@/lib/company/review-data";
import { DECISION_LABEL, scoreText, type HiringDecision } from "@/lib/company/review-rules";
import { hubTags, type HubFilter } from "@/lib/company/test-hub-view";
import type { Db } from "@/lib/db/client";

/**
 * Everything a test's Candidates tab shows and does (U10: the batch pages
 * are folded into the test). Each "Invite candidates" made one round — a
 * batch row with its own window — and every person sits in one round. This
 * loads every round of one test for one company, with each person's
 * invitation, attempt, review and decision, and the actions the viewer may
 * take now. The same rules as the old batch page, in one place.
 */

type Tone = "blue" | "green" | "amber" | "red" | "grey";
const DELIVERY_TONE: Record<Delivery, Tone> = { pending: "grey", sending: "grey", sent: "blue", failed: "red", skipped: "amber" };
const DECISION_TONE: Record<HiringDecision, Tone> = { shortlisted: "green", not_shortlisted: "red", on_hold: "amber" };

export type PersonFilter = HubFilter | "failed";

export interface PersonRow {
  id: string;
  batchId: string;
  name: string;
  email: string;
  /** The round they were invited in: its role and window. */
  round: string;
  /** An internal round (colleagues, U11): no hiring decision. */
  internal: boolean;
  invitation: { label: string; tone: Tone };
  why: { lead: string; text: string } | null;
  reminders: string[];
  autoFailed: string | null;
  status: { label: string; tone: Tone };
  /** "Start by …", "Started … · ends …", "Submitted …". */
  when: string;
  allowed: string;
  score: string | null;
  /** Multiple choice marked automatically at Submit, while nobody has reviewed it yet (L3). */
  autoScore: string | null;
  /** The reviewed score against this company's cut-off for the test (U06b); null without one. */
  cutoff: "cleared" | "below" | null;
  decision: { label: string; tone: Tone; shared: boolean } | null;
  open: { href: string; label: string } | null;
  actions: { retry: boolean; fixEmail: boolean; remind: boolean; newLink: boolean; copyLink: boolean; passed: boolean; extraMinutes: number; lastStartInput: string; timeZone: string } | null;
  tags: PersonFilter[];
}

export interface Round {
  batch: Batch;
  state: BatchStateKey;
  candidates: Candidate[];
  mail: MailLogRow[];
  active: number;
  sent: number;
  failed: number;
  /** Failed invitations that can still be retried (they can start in time and haven't). */
  retryable: number;
  /** Sent, not started, last start still ahead. */
  remindable: number;
  /** In a sent round, people never sent an invitation whose start has passed. */
  unsentLate: number;
  /** In a draft: how many would be sent, and how many can't start in time any more. */
  sendable: number;
  passed: number;
}

/** Every round of a test in this company, newest first. Null on a database error. */
export async function loadTestRounds(sql: Db, member: CompanyMember, item: string, now: Date): Promise<{ rounds: Round[]; people: PersonRow[] } | null> {
  // One trip for the round ids, the settings and finalising timed-out attempts, then every round's data at once (U10, P0.5).
  const [ids, settings] = await Promise.all([
    sql.rows<{ id: string }>`
      select id from course.hiring_batches where company_id = ${member.companyId}::uuid and item = ${item} order by created_at desc limit 50
    `,
    loadTestSettings(sql, member.companyId, item),
    finaliseDue(sql, { companyId: member.companyId, item }),
  ]);
  if (ids.error) return ids.error.code === "42P01" ? { rounds: [], people: [] } : null;

  const base = `/org/${member.companySlug}/assessments/${item}/candidates`;
  const cutoffPercent = settings?.cutoffPercent ?? null;
  const recruiter = canSchedule(member);
  const scorer = canScore(member);
  const rounds: Round[] = [];
  const people: PersonRow[] = [];

  // Every round at once: on a remote database, one after another adds up quickly.
  const loaded = await Promise.all((ids.data ?? []).map(async ({ id }) => {
    // A draft round has no attempts; asking anyway costs nothing extra now that it all runs at once.
    const [found, attempts, reviews, decisions, autos] = await Promise.all([
      loadBatch(sql, member.companyId, id),
      attemptsForBatch(sql, member.companyId, id, { finalised: true }),
      reviewsForBatch(sql, member.companyId, id),
      decisionsForBatch(sql, member.companyId, id),
      autoScoresForBatch(sql, member.companyId, id),
    ]);
    if (!found) return null;
    if (!attempts || !reviews || !decisions || !autos) return null;
    return { id, ...found, attempts, reviews, decisions, autos };
  }));
  if (loaded.some((l) => l === null)) return null;

  for (const l of loaded) {
    const { id, batch, candidates, mail, attempts, reviews, decisions, autos } = l!;
    const draft = batch.status === "draft";
    const attemptOf = new Map(attempts.map((a) => [a.candidateId, a]));
    const reviewOf = new Map(reviews.map((r) => [r.attemptId, r]));
    const tz = batch.timeZone;
    const window = { closesAt: batch.closesAt, minutes: batch.minutes };
    const lastOf = (c: Candidate) => lastStart(window, c);
    const passed = (c: Candidate) => startPassed(window, c, now);
    const active = candidates.filter((c) => c.status === "active");
    const live = batch.status === "sent" && recruiter;

    rounds.push({
      batch, state: batchStateKey(batch, now), candidates, mail,
      active: active.length,
      sent: active.filter((c) => c.delivery === "sent").length,
      failed: active.filter((c) => c.delivery === "failed" || c.delivery === "skipped").length,
      retryable: active.filter((c) => (c.delivery === "failed" || c.delivery === "skipped") && !passed(c) && !attemptOf.has(c.id)).length,
      remindable: batch.status === "sent" ? active.filter((c) => c.delivery === "sent" && now <= lastOf(c) && !attemptOf.has(c.id)).length : 0,
      unsentLate: batch.status === "sent" ? active.filter((c) => c.delivery !== "sent" && passed(c)).length : 0,
      sendable: active.filter((c) => !passed(c)).length,
      passed: active.filter(passed).length,
    });
    if (draft) continue; // Nobody in a draft is invited yet; the round itself lists them.

    const roundLabel = `${batch.role} · closes ${formatInZone(batch.closesAt, tz)}`;
    for (const c of candidates) {
      const attempt = attemptOf.get(c.id);
      const scored = attempt ? reviewOf.get(attempt.id) : undefined;
      const decided = attempt?.submittedAt ? decisions.get(attempt.id) : undefined;
      const link = linkState({ batchStatus: batch.status, candidateStatus: c.status, opensAt: batch.opensAt, lastStart: lastOf(c), now });
      const cancelled = link === "cancelled" || link === "batch_cancelled";
      const isPassed = passed(c) && !attempt;
      const bad = c.status === "active" && (c.delivery === "failed" || c.delivery === "skipped");
      const where = attempt ? attemptState(attempt, now) : null;
      const reminders = reminderSummary(mail.filter((m) => m.candidateId === c.id));
      const facts = { active: !cancelled, started: !!attempt, submitted: !!attempt?.submittedAt, reviewed: !!scored, passed: isPassed, decision: decided?.decision ?? null };
      const tags: PersonFilter[] = hubTags(facts);
      if (bad && !attempt) tags.push("failed");

      people.push({
        id: c.id,
        batchId: id,
        name: c.name,
        email: c.email,
        round: roundLabel,
        internal: batch.purpose === "internal",
        invitation: { label: DELIVERY_LABEL[c.delivery], tone: DELIVERY_TONE[c.delivery] },
        why: bad && c.deliveryError ? { lead: c.delivery === "skipped" ? "Why it wasn't sent" : "Why it failed", text: c.deliveryError } : null,
        reminders: [
          ...(reminders.manual ? [`Reminded ${reminders.manual === 1 ? "once" : `${reminders.manual} times`}`] : []),
          ...(reminders.autoSent ? ["Automatic reminder sent"] : []),
        ],
        autoFailed: reminders.autoFailed && c.status === "active"
          ? `Automatic reminder ${reminders.autoFailed.outcome === "skipped" ? "not sent" : "failed"}${reminders.autoFailed.error ? `: ${reminders.autoFailed.error}` : ""}.${live && c.delivery === "sent" && !isPassed ? " Use Remind." : ""}`
          : null,
        status: cancelled && !attempt ? { label: link === "batch_cancelled" ? "Round cancelled" : "Cancelled", tone: "grey" }
          : attempt?.submittedAt ? (scored ? { label: "Reviewed", tone: "green" } : { label: "Review pending", tone: "amber" })
          : where === "time_up" ? { label: "Time up", tone: "amber" }
          : attempt ? { label: "In progress", tone: "blue" }
          : isPassed ? { label: "Start passed", tone: "amber" }
          : link === "not_open" ? { label: "Opens later", tone: "grey" }
          : { label: "Not started", tone: "grey" },
        when: cancelled && !attempt ? "—"
          : attempt?.submittedAt ? `Submitted ${deadlineText(attempt.submittedAt, tz)}${attempt.submitKind === "deadline" ? " · at the time limit" : ""}`
          : attempt ? `Started ${formatInZone(attempt.startedAt, tz)} · ends ${formatInZone(attempt.deadlineAt, tz)}`
          : `Start by ${deadlineText(lastOf(c), tz)}`,
        allowed: attempt ? `${durationText(attempt.allowedMinutes)} (fixed at start)` : `${durationText(allowedMinutes(batch.minutes, c.extraMinutes))}${c.extraMinutes ? ` (${c.extraMinutes} extra)` : ""}`,
        score: scored ? scoreText(scored.total, scored.max) : null,
        autoScore: !scored && attempt && autos.get(attempt.id) ? scoreText(autos.get(attempt.id)!.total, autos.get(attempt.id)!.max) : null,
        cutoff: scored ? cutoffResult(scored.total, scored.max, cutoffPercent) : null,
        decision: decided?.decision ? { label: DECISION_LABEL[decided.decision], tone: DECISION_TONE[decided.decision], shared: !!decided.sharedRevision } : null,
        open: attempt ? { href: `${base}/${c.id}`, label: attempt.submittedAt && !scored && scorer ? "Review" : "Open" } : null,
        // Once submitted there is nothing left to do about the invitation; once started, no resend or readdress.
        actions: live && c.status === "active" && !attempt?.submittedAt
          ? {
              retry: canRetry({ delivery: c.delivery, claimedAt: c.claimedAt }, now) && !isPassed && !attempt,
              fixEmail: bad && !isPassed && !attempt,
              remind: c.delivery === "sent" && now <= lastOf(c) && !attempt,
              newLink: !isPassed,
              // Their own link still starts or resumes the test (I02).
              copyLink: !isPassed || !!attempt,
              passed: isPassed,
              extraMinutes: c.extraMinutes,
              lastStartInput: c.lastStartAt ? toZonedInput(c.lastStartAt, tz) : "",
              timeZone: tz,
            }
          : null,
        tags,
      });
    }
  }
  return { rounds, people };
}

/** Which round (batch) of this company and test a person is in, for the review page's address. Undefined when not here. */
export async function roundOfCandidate(sql: Db, companyId: string, item: string, candidateId: string): Promise<string | undefined | null> {
  const { data, error } = await sql.row<{ batch_id: string }>`
    select c.batch_id from course.batch_candidates c
      join course.hiring_batches b on b.id = c.batch_id and b.company_id = c.company_id
     where c.id = ${candidateId}::uuid and c.company_id = ${companyId}::uuid and b.item = ${item}
  `;
  if (error) return null;
  return data?.batch_id;
}
