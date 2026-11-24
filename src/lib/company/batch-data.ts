import "server-only";
import type { Db } from "@/lib/db/client";
import { companyCatalog } from "@/lib/company/catalog-data";
import { AUTO_REMIND_ATTEMPTS, AUTO_REMIND_HOURS, STALE_SEND_MINUTES, isPrepCourse, type ApprovedTest, type BatchInput, type Delivery, type MailKind, type PrepCourse } from "@/lib/company/batch-rules";

/**
 * Hiring batches (course.hiring_batches, batch_candidates, batch_mail_log;
 * 0052). The company always comes from the signed-in recruiter, never from a
 * form, and every statement filters by it.
 *
 * Sending is claim, then send, then record: a statement marks the rows it
 * will send as `sending`, so a double click or two recruiters at once can't
 * send the same email twice, and a send interrupted part way can be retried
 * after STALE_SEND_MINUTES. Nothing here sends mail; batch-send does.
 *
 * Every function returns null on a database error. A missing table (0052
 * not run) reads as nothing there.
 */

const UNDEFINED_TABLE = "42P01";
const fail = (what: string, error: { code?: string; message: string }) => {
  console.error(`hiring batch ${what} failed:`, error.code, error.message);
  return null;
};

// The last moment one candidate can start, in SQL, from the batch (b), version (v) and candidate (c):
//   coalesce(c.last_start_at, b.closes_at - make_interval(mins => v.minutes + c.extra_minutes))
// Kept in step with lastStart in batch-rules. Every claim that emails a link
// (send, retry, new link, corrected address, new time) requires it to be later
// than now(), so no link goes out that can't start the test (startPassed).

/** Each assessment's newest version this company approved, for the items given. */
export async function approvedTests(sql: Db, companyId: string, items: { slug: string; title: string }[]): Promise<ApprovedTest[] | null> {
  if (!items.length) return [];
  const { data, error } = await sql.rows<{ slug: string; id: string; version: number; minutes: number; role: string }>`
    select distinct on (v.slug) v.slug, v.id, v.version, v.minutes, v.role
      from course.assessment_versions v
      join course.company_assessment_reviews r on r.version_id = v.id and r.company_id = ${companyId}::uuid and r.decision = 'approved'
     where v.slug = any(${items.map((i) => i.slug)}::text[])
     order by v.slug, v.version desc
  `;
  if (error) return error.code === UNDEFINED_TABLE ? [] : fail("approved tests read", error);
  return (data ?? []).map((r) => ({ item: r.slug, title: items.find((i) => i.slug === r.slug)?.title ?? r.slug, versionId: r.id, version: r.version, minutes: r.minutes, role: r.role }));
}

/** The company's active reviewers. */
export async function companyReviewers(sql: Db, companyId: string): Promise<{ email: string; name: string | null }[] | null> {
  const { data, error } = await sql.rows<{ email: string; name: string | null }>`
    select m.email, m.name
      from course.company_members m
      join course.company_member_roles r on r.company_id = m.company_id and r.email = m.email and r.role = 'reviewer'
     where m.company_id = ${companyId}::uuid and m.removed_at is null
     order by lower(coalesce(m.name, m.email))
  `;
  if (error) return error.code === UNDEFINED_TABLE ? [] : fail("reviewers read", error);
  return data ?? [];
}

export type CreateBatchOutcome = { status: "created"; id: string } | { status: "repeat"; id: string } | { status: "changed" };

/**
 * Makes a draft batch and its candidates in one statement, all or nothing.
 * The version must still be the newest one this company approved for that
 * test, and the reviewer still an active reviewer; otherwise nothing is
 * written. A submit retried with the same request key finds the first batch.
 */
export async function createBatch(sql: Db, b: BatchInput & { companyId: string; requestKey: string; by: string }): Promise<CreateBatchOutcome | null> {
  const { data, error } = await sql.row<{ prior_id: string | null; id: string | null }>`
    with prior as (
      select id from course.hiring_batches where company_id = ${b.companyId}::uuid and request_key = ${b.requestKey}::uuid
    ), current_version as (
      select v.id from course.assessment_versions v
        join course.company_assessment_reviews r on r.version_id = v.id and r.company_id = ${b.companyId}::uuid and r.decision = 'approved'
       where v.slug = ${b.item}
       order by v.version desc limit 1
    ), go as (
      select exists (select 1 from current_version where id = ${b.versionId}::uuid)
         and exists (select 1 from course.company_members m
                       join course.company_member_roles r on r.company_id = m.company_id and r.email = m.email and r.role = 'reviewer'
                      where m.company_id = ${b.companyId}::uuid and m.email = ${b.reviewer} and m.removed_at is null)
         and not exists (select 1 from prior) as ok
    ), made as (
      insert into course.hiring_batches (company_id, item, version_id, role, prep_course, reviewer_email, opens_at, closes_at, time_zone, request_key, created_by)
      select ${b.companyId}::uuid, ${b.item}, ${b.versionId}::uuid, ${b.role}, ${b.prepCourse}, ${b.reviewer},
             ${b.opensAt.toISOString()}::timestamptz, ${b.closesAt.toISOString()}::timestamptz, ${b.timeZone}, ${b.requestKey}::uuid, ${b.by}
        from go where go.ok
      on conflict (company_id, request_key) do nothing
      returning id
    ), added as (
      insert into course.batch_candidates (batch_id, company_id, name, email, extra_minutes)
      select made.id, ${b.companyId}::uuid, x.name, x.email, x.extra
        from made, unnest(${b.candidates.map((c) => c.name)}::text[], ${b.candidates.map((c) => c.email)}::text[], ${b.candidates.map((c) => c.extraMinutes)}::int[]) as x(name, email, extra)
      returning 1
    )
    select (select id from prior) as prior_id, (select id from made) as id, (select count(*) from added) as added
  `;
  if (error) return fail("create", error);
  if (data?.prior_id) return { status: "repeat", id: data.prior_id };
  if (data?.id) return { status: "created", id: data.id };
  return { status: "changed" };
}

export interface BatchSummary {
  id: string;
  title: string;
  version: number;
  /** The version's time allowed, before anyone's extra minutes. */
  minutes: number;
  role: string;
  opensAt: string;
  closesAt: string;
  timeZone: string;
  status: "draft" | "sent" | "cancelled";
  createdBy: string;
  createdAt: string;
  people: number;
  active: number;
  /** Active people whose invitation the mail service accepted. Not proof it reached them. */
  sent: number;
  failed: number;
}

/** The company's batches, newest first. */
export async function listBatches(sql: Db, companyId: string): Promise<BatchSummary[] | null> {
  const { data, error } = await sql.rows<{
    id: string; title: string; version: number; minutes: number; role: string; opens_at: string; closes_at: string; time_zone: string; status: BatchSummary["status"];
    created_by: string; created_at: string; people: number; active: number; sent: number; failed: number;
  }>`
    select b.id, v.title, v.version, v.minutes, b.role, b.opens_at, b.closes_at, b.time_zone, b.status, b.created_by, b.created_at,
           count(c.id)::int as people,
           count(c.id) filter (where c.status = 'active')::int as active,
           count(c.id) filter (where c.status = 'active' and c.delivery = 'sent')::int as sent,
           count(c.id) filter (where c.status = 'active' and c.delivery in ('failed', 'skipped'))::int as failed
      from course.hiring_batches b
      join course.assessment_versions v on v.id = b.version_id
      left join course.batch_candidates c on c.batch_id = b.id
     where b.company_id = ${companyId}::uuid
     group by b.id, v.title, v.version, v.minutes
     order by b.created_at desc
     limit 100
  `;
  if (error) return error.code === UNDEFINED_TABLE ? [] : fail("list", error);
  return (data ?? []).map((r) => ({
    id: r.id, title: r.title, version: r.version, minutes: r.minutes, role: r.role, opensAt: r.opens_at, closesAt: r.closes_at, timeZone: r.time_zone, status: r.status,
    createdBy: r.created_by, createdAt: r.created_at, people: r.people, active: r.active, sent: r.sent, failed: r.failed,
  }));
}

export interface Batch {
  id: string;
  companyId: string;
  item: string;
  versionId: string;
  title: string;
  version: number;
  minutes: number;
  role: string;
  prepCourse: PrepCourse | null;
  reviewer: { email: string; name: string | null };
  opensAt: string;
  closesAt: string;
  timeZone: string;
  status: "draft" | "sent" | "cancelled";
  createdBy: string;
  createdAt: string;
  sentBy: string | null;
  sentAt: string | null;
  cancelledBy: string | null;
  cancelledAt: string | null;
}

export interface Candidate {
  id: string;
  name: string;
  email: string;
  extraMinutes: number;
  lastStartAt: string | null;
  generation: number;
  status: "active" | "cancelled";
  cancelledBy: string | null;
  cancelledAt: string | null;
  delivery: Delivery;
  deliveryError: string | null;
  claimedAt: string | null;
  deliveredAt: string | null;
  remindersSent: number;
  lastRemindedAt: string | null;
  autoRemindedAt: string | null;
}

export interface MailLogRow {
  candidateId: string;
  kind: MailKind;
  generation: number;
  outcome: "sent" | "failed" | "skipped";
  error: string | null;
  sentBy: string | null;
  at: string;
}

type BatchRow = {
  id: string; company_id: string; item: string; version_id: string; title: string; version: number; minutes: number; role: string; prep_course: PrepCourse | null;
  reviewer_email: string; reviewer_name: string | null; opens_at: string; closes_at: string; time_zone: string; status: Batch["status"];
  created_by: string; created_at: string; sent_by: string | null; sent_at: string | null; cancelled_by: string | null; cancelled_at: string | null;
};

const toBatch = (r: BatchRow): Batch => ({
  id: r.id, companyId: r.company_id, item: r.item, versionId: r.version_id, title: r.title, version: r.version, minutes: r.minutes, role: r.role,
  prepCourse: r.prep_course, reviewer: { email: r.reviewer_email, name: r.reviewer_name }, opensAt: r.opens_at, closesAt: r.closes_at, timeZone: r.time_zone,
  status: r.status, createdBy: r.created_by, createdAt: r.created_at, sentBy: r.sent_by, sentAt: r.sent_at, cancelledBy: r.cancelled_by, cancelledAt: r.cancelled_at,
});

type CandidateRow = {
  id: string; name: string; email: string; extra_minutes: number; last_start_at: string | null; link_generation: number; status: Candidate["status"];
  cancelled_by: string | null; cancelled_at: string | null; delivery: Delivery; delivery_error: string | null; delivery_claimed_at: string | null;
  delivered_at: string | null; reminders_sent: number; last_reminded_at: string | null; auto_reminded_at: string | null;
};

const toCandidate = (r: CandidateRow): Candidate => ({
  id: r.id, name: r.name, email: r.email, extraMinutes: r.extra_minutes, lastStartAt: r.last_start_at, generation: r.link_generation, status: r.status,
  cancelledBy: r.cancelled_by, cancelledAt: r.cancelled_at, delivery: r.delivery, deliveryError: r.delivery_error, claimedAt: r.delivery_claimed_at,
  deliveredAt: r.delivered_at, remindersSent: r.reminders_sent, lastRemindedAt: r.last_reminded_at, autoRemindedAt: r.auto_reminded_at,
});

/** One batch of this company, with its people and every email sent to them. Undefined when there's no such batch here. */
export async function loadBatch(sql: Db, companyId: string, batchId: string): Promise<{ batch: Batch; candidates: Candidate[]; mail: MailLogRow[] } | undefined | null> {
  const head = await sql.row<BatchRow>`
    select b.id, b.company_id, b.item, b.version_id, v.title, v.version, v.minutes, b.role, b.prep_course, b.reviewer_email, m.name as reviewer_name,
           b.opens_at, b.closes_at, b.time_zone, b.status, b.created_by, b.created_at, b.sent_by, b.sent_at, b.cancelled_by, b.cancelled_at
      from course.hiring_batches b
      join course.assessment_versions v on v.id = b.version_id
      left join course.company_members m on m.company_id = b.company_id and m.email = b.reviewer_email
     where b.id = ${batchId}::uuid and b.company_id = ${companyId}::uuid
  `;
  if (head.error) return head.error.code === UNDEFINED_TABLE ? undefined : fail("read", head.error);
  if (!head.data) return undefined;
  const [people, mail] = await Promise.all([
    sql.rows<CandidateRow>`
      select id, name, email, extra_minutes, last_start_at, link_generation, status, cancelled_by, cancelled_at, delivery, delivery_error,
             delivery_claimed_at, delivered_at, reminders_sent, last_reminded_at, auto_reminded_at
        from course.batch_candidates where batch_id = ${batchId}::uuid and company_id = ${companyId}::uuid
       order by lower(name), email
    `,
    sql.rows<{ candidate_id: string; kind: MailKind; link_generation: number; outcome: MailLogRow["outcome"]; error: string | null; sent_by: string | null; at: string }>`
      select l.candidate_id, l.kind, l.link_generation, l.outcome, l.error, l.sent_by, l.at
        from course.batch_mail_log l join course.batch_candidates c on c.id = l.candidate_id
       where c.batch_id = ${batchId}::uuid and c.company_id = ${companyId}::uuid
       order by l.at desc
       limit 2000
    `,
  ]);
  if (people.error) return fail("people read", people.error);
  if (mail.error) return fail("mail log read", mail.error);
  return {
    batch: toBatch(head.data),
    candidates: (people.data ?? []).map(toCandidate),
    mail: (mail.data ?? []).map((r) => ({ candidateId: r.candidate_id, kind: r.kind, generation: r.link_generation, outcome: r.outcome, error: r.error, sentBy: r.sent_by, at: r.at })),
  };
}

/** Who a claimed send goes to. */
export interface MailTarget {
  id: string;
  name: string;
  email: string;
  generation: number;
  extraMinutes: number;
  lastStartAt: string | null;
}

type TargetRow = { id: string; name: string; email: string; link_generation: number; extra_minutes: number; last_start_at: string | null };
const toTarget = (r: TargetRow): MailTarget => ({ id: r.id, name: r.name, email: r.email, generation: r.link_generation, extraMinutes: r.extra_minutes, lastStartAt: r.last_start_at });

/**
 * Sends a draft: marks the batch sent and claims every active person still
 * waiting for their invitation whose last start is still ahead. People whose
 * last start has passed stay `pending`, unsent. Only the first call does
 * anything; a second click finds the batch already sent and gets nobody. A
 * batch where nobody could start in time stays a draft.
 */
export async function startSending(sql: Db, companyId: string, batchId: string, by: string): Promise<MailTarget[] | null> {
  const { data, error } = await sql.rows<TargetRow>`
    with eligible as (
      select c.id
        from course.batch_candidates c
        join course.hiring_batches b on b.id = c.batch_id and b.company_id = c.company_id
        join course.assessment_versions v on v.id = b.version_id
       where b.id = ${batchId}::uuid and b.company_id = ${companyId}::uuid and b.status = 'draft'
         and c.status = 'active' and c.delivery = 'pending'
         and coalesce(c.last_start_at, b.closes_at - make_interval(mins => v.minutes + c.extra_minutes)) > now()
    ), sent as (
      update course.hiring_batches set status = 'sent', sent_at = now(), sent_by = ${by}
       where id = ${batchId}::uuid and company_id = ${companyId}::uuid and status = 'draft' and closes_at > now()
         and exists (select 1 from eligible)
      returning id
    )
    update course.batch_candidates c
       set delivery = 'sending', delivery_claimed_at = now()
      from sent
     where c.batch_id = sent.id and c.id in (select id from eligible) and c.status = 'active' and c.delivery = 'pending'
    returning c.id, c.name, c.email, c.link_generation, c.extra_minutes, c.last_start_at
  `;
  if (error) return fail("send", error);
  return (data ?? []).map(toTarget);
}

// A claim may take a person whose last send failed, was skipped, or has been
// stuck in `sending` for longer than STALE_SEND_MINUTES; never one being sent now.
const STALE = `${STALE_SEND_MINUTES} minutes`;

/**
 * Claims people in a sent batch to send their link again: those given, or
 * every one whose delivery failed. The same link goes out; nobody is added.
 * Nobody whose last start has passed (that link couldn't start the test), and
 * nobody who has already started.
 */
export async function claimRetry(sql: Db, companyId: string, batchId: string, candidateIds: string[] | null): Promise<MailTarget[] | null> {
  const { data, error } = await sql.rows<TargetRow>`
    update course.batch_candidates c
       set delivery = 'sending', delivery_claimed_at = now()
      from course.hiring_batches b
      join course.assessment_versions v on v.id = b.version_id
     where b.id = c.batch_id and b.company_id = c.company_id and b.status = 'sent'
       and c.batch_id = ${batchId}::uuid and c.company_id = ${companyId}::uuid and c.status = 'active'
       and (${candidateIds}::uuid[] is null or c.id = any(${candidateIds}::uuid[]))
       and (c.delivery in ('failed', 'skipped') or (c.delivery = 'sending' and c.delivery_claimed_at < now() - ${STALE}::interval))
       and coalesce(c.last_start_at, b.closes_at - make_interval(mins => v.minutes + c.extra_minutes)) > now()
       -- Someone who has started already has their link in use: no invitation to resend.
       and not exists (select 1 from course.candidate_attempts a where a.candidate_id = c.id)
    returning c.id, c.name, c.email, c.link_generation, c.extra_minutes, c.last_start_at
  `;
  if (error) return fail("retry claim", error);
  return (data ?? []).map(toTarget);
}

/**
 * One person's change that sends them an email with their link: a new link
 * (the old one stops working), a corrected email address (also a new link,
 * since the old one went to the wrong place), or a new time. Refused while
 * another send to them is under way, for a cancelled person, in a batch
 * that isn't sent, or when their last start (after a new time, the new one)
 * has passed. "taken" when a corrected address is already in the batch.
 */
export async function claimChange(
  sql: Db,
  companyId: string,
  batchId: string,
  candidateId: string,
  change: { kind: "new_link" } | { kind: "email"; email: string } | { kind: "extension"; extraMinutes: number; lastStartAt: Date | null },
): Promise<MailTarget | "taken" | undefined | null> {
  const newLink = change.kind !== "extension";
  const email = change.kind === "email" ? change.email : null;
  const extra = change.kind === "extension" ? change.extraMinutes : null;
  const until = change.kind === "extension" ? (change.lastStartAt?.toISOString() ?? null) : null;
  const { data, error } = await sql.row<TargetRow>`
    update course.batch_candidates c
       set delivery = 'sending', delivery_claimed_at = now(),
           link_generation = c.link_generation + ${newLink ? 1 : 0},
           email = coalesce(${email}, c.email),
           extra_minutes = coalesce(${extra}::int, c.extra_minutes),
           last_start_at = case when ${change.kind === "extension"} then ${until}::timestamptz else c.last_start_at end
      from course.hiring_batches b
      join course.assessment_versions v on v.id = b.version_id
     where b.id = c.batch_id and b.company_id = c.company_id and b.status = 'sent'
       and c.id = ${candidateId}::uuid and c.batch_id = ${batchId}::uuid and c.company_id = ${companyId}::uuid and c.status = 'active'
       and (c.delivery <> 'sending' or c.delivery_claimed_at < now() - ${STALE}::interval)
       and (${change.kind !== "email"} or c.delivery in ('failed', 'skipped'))
       and coalesce(case when ${change.kind === "extension"} then ${until}::timestamptz else c.last_start_at end,
                    b.closes_at - make_interval(mins => v.minutes + coalesce(${extra}::int, c.extra_minutes))) > now()
    returning c.id, c.name, c.email, c.link_generation, c.extra_minutes, c.last_start_at
  `;
  if (error) return error.code === "23505" ? "taken" : fail("change claim", error);
  return data ? toTarget(data) : undefined;
}

/**
 * Claims people for a reminder: active, in a sent batch that has opened or
 * opens within a day, whose last start hasn't passed, who haven't started,
 * and not reminded in the last 10 minutes (a double click). The given ones,
 * or all of them.
 */
export async function claimReminders(sql: Db, companyId: string, batchId: string, candidateIds: string[] | null): Promise<MailTarget[] | null> {
  const { data, error } = await sql.rows<TargetRow>`
    update course.batch_candidates c
       set reminders_sent = c.reminders_sent + 1, last_reminded_at = now()
      from course.hiring_batches b
      join course.assessment_versions v on v.id = b.version_id
     where b.id = c.batch_id and b.company_id = c.company_id and b.status = 'sent'
       and c.batch_id = ${batchId}::uuid and c.company_id = ${companyId}::uuid and c.status = 'active'
       and (${candidateIds}::uuid[] is null or c.id = any(${candidateIds}::uuid[]))
       and c.delivery = 'sent'
       and coalesce(c.last_start_at, b.closes_at - make_interval(mins => v.minutes + c.extra_minutes)) > now()
       and (c.last_reminded_at is null or c.last_reminded_at < now() - interval '10 minutes')
       -- Someone who has started doesn't need reminding to start (H06).
       and not exists (select 1 from course.candidate_attempts a where a.candidate_id = c.id)
    returning c.id, c.name, c.email, c.link_generation, c.extra_minutes, c.last_start_at
  `;
  if (error) return fail("reminder claim", error);
  return (data ?? []).map(toTarget);
}

/**
 * The automatic reminder: everyone in a sent batch, anywhere, whose last
 * start is within the next day and who hasn't had it. The claim stamps
 * auto_reminded_at first, so two runs at once send it once. The mail log is
 * the record of what happened:
 * - one that went out is never sent again;
 * - one that failed is released by recordMail, so a later run tries again;
 * - a claim older than STALE_SEND_MINUTES with nothing logged since (the run
 *   died part way) can be claimed again;
 * - after AUTO_REMIND_ATTEMPTS attempts on the same link, it stops trying.
 */
export async function claimAutoReminders(sql: Db): Promise<(MailTarget & { batchId: string; companyId: string })[] | null> {
  const { data, error } = await sql.rows<TargetRow & { batch_id: string; company_id: string }>`
    update course.batch_candidates c
       set auto_reminded_at = now()
      from course.hiring_batches b
      join course.assessment_versions v on v.id = b.version_id
     where b.id = c.batch_id and b.company_id = c.company_id and b.status = 'sent'
       and c.status = 'active' and c.delivery = 'sent'
       and (c.auto_reminded_at is null
            or (c.auto_reminded_at < now() - ${STALE}::interval
                and not exists (select 1 from course.batch_mail_log l
                                 where l.candidate_id = c.id and l.kind = 'auto_reminder' and l.at >= c.auto_reminded_at)))
       and not exists (select 1 from course.batch_mail_log l where l.candidate_id = c.id and l.kind = 'auto_reminder' and l.outcome = 'sent')
       and (select count(*) from course.batch_mail_log l
             where l.candidate_id = c.id and l.kind = 'auto_reminder' and l.link_generation = c.link_generation) < ${AUTO_REMIND_ATTEMPTS}
       and not exists (select 1 from course.candidate_attempts a where a.candidate_id = c.id)
       and b.opens_at <= now()
       and coalesce(c.last_start_at, b.closes_at - make_interval(mins => v.minutes + c.extra_minutes))
           between now() and now() + ${`${AUTO_REMIND_HOURS} hours`}::interval
    returning c.id, c.name, c.email, c.link_generation, c.extra_minutes, c.last_start_at, c.batch_id, c.company_id
  `;
  if (error) return error.code === UNDEFINED_TABLE ? [] : fail("auto reminder claim", error);
  return (data ?? []).map((r) => ({ ...toTarget(r), batchId: r.batch_id, companyId: r.company_id }));
}

/**
 * Writes down one email: always a log row; and for the emails that carry a
 * link (invitation, new link, new time), where that delivery now stands, but
 * only if the person's link hasn't been reissued since this send claimed them.
 * A reminder that fails leaves the delivery as it was. An automatic reminder
 * that didn't go out releases its claim, so a later run can try again.
 */
export async function recordMail(sql: Db, m: { candidateId: string; kind: MailKind; generation: number; outcome: "sent" | "failed" | "skipped"; error: string | null; by: string | null }): Promise<boolean | null> {
  const carriesLink = m.kind === "invite" || m.kind === "new_link" || m.kind === "extension";
  const releasesAuto = m.kind === "auto_reminder" && m.outcome !== "sent";
  const { error } = await sql.run`
    with logged as (
      insert into course.batch_mail_log (candidate_id, kind, link_generation, outcome, error, sent_by)
      values (${m.candidateId}::uuid, ${m.kind}, ${m.generation}, ${m.outcome}, ${m.error}, ${m.by})
      returning candidate_id
    ), released as (
      update course.batch_candidates c set auto_reminded_at = null
        from logged
       where c.id = logged.candidate_id and ${releasesAuto}
      returning c.id
    )
    update course.batch_candidates c
       set delivery = ${m.outcome},
           delivery_error = ${m.outcome === "sent" ? null : m.error},
           delivery_claimed_at = null,
           delivered_at = case when ${m.outcome === "sent"} then now() else c.delivered_at end
      from logged
     where c.id = logged.candidate_id and ${carriesLink} and c.link_generation = ${m.generation} and c.delivery = 'sending'
  `;
  if (error) return fail("mail record", error);
  return true;
}

/** Cancels one person: their link can no longer start the test. Rows changed. */
export async function cancelCandidate(sql: Db, companyId: string, batchId: string, candidateId: string, by: string): Promise<number | null> {
  const { data, error } = await sql.run`
    update course.batch_candidates set status = 'cancelled', cancelled_at = now(), cancelled_by = ${by}
     where id = ${candidateId}::uuid and batch_id = ${batchId}::uuid and company_id = ${companyId}::uuid and status = 'active'
  `;
  if (error) return fail("cancel person", error);
  return data ?? 0;
}

/** Cancels a whole batch, draft or sent: no link in it can start the test. Rows changed. */
export async function cancelBatch(sql: Db, companyId: string, batchId: string, by: string): Promise<number | null> {
  const { data, error } = await sql.run`
    update course.hiring_batches set status = 'cancelled', cancelled_at = now(), cancelled_by = ${by}
     where id = ${batchId}::uuid and company_id = ${companyId}::uuid and status <> 'cancelled'
  `;
  if (error) return fail("cancel batch", error);
  return data ?? 0;
}

/** What the email and the candidate's page need about the batch, by batch id. */
export async function batchForMail(sql: Db, batchId: string): Promise<Batch | null> {
  const { data, error } = await sql.row<BatchRow>`
    select b.id, b.company_id, b.item, b.version_id, v.title, v.version, v.minutes, b.role, b.prep_course, b.reviewer_email, null::text as reviewer_name,
           b.opens_at, b.closes_at, b.time_zone, b.status, b.created_by, b.created_at, b.sent_by, b.sent_at, b.cancelled_by, b.cancelled_at
      from course.hiring_batches b join course.assessment_versions v on v.id = b.version_id
     where b.id = ${batchId}::uuid
  `;
  if (error) return fail("mail batch read", error);
  return data ? toBatch(data) : null;
}

export interface CandidateView {
  candidate: { id: string; name: string; email: string; status: Candidate["status"]; extraMinutes: number; lastStartAt: string | null; generation: number };
  batch: Batch;
  version: { toolsAllowed: string[]; toolsNotAllowed: string[]; submission: string; instructions: string; results: "none" | "overall" | "by_area" };
}

/**
 * The person a link names, with their batch, for the candidate's page. The
 * caller has checked the link's signature; a generation that no longer
 * matches means the link was replaced.
 */
export async function candidateByLink(sql: Db, id: string): Promise<CandidateView | undefined | null> {
  const { data, error } = await sql.row<BatchRow & {
    c_id: string; c_name: string; c_email: string; c_status: Candidate["status"]; c_extra: number; c_last_start: string | null; c_generation: number;
    tools_allowed: string[]; tools_not_allowed: string[]; submission: string; instructions: string; results: "none" | "overall" | "by_area";
  }>`
    select c.id as c_id, c.name as c_name, c.email as c_email, c.status as c_status, c.extra_minutes as c_extra, c.last_start_at as c_last_start,
           c.link_generation as c_generation,
           b.id, b.company_id, b.item, b.version_id, v.title, v.version, v.minutes, b.role, b.prep_course, b.reviewer_email, null::text as reviewer_name,
           b.opens_at, b.closes_at, b.time_zone, b.status, b.created_by, b.created_at, b.sent_by, b.sent_at, b.cancelled_by, b.cancelled_at,
           v.tools_allowed, v.tools_not_allowed, v.submission, v.instructions, v.results
      from course.batch_candidates c
      join course.hiring_batches b on b.id = c.batch_id and b.company_id = c.company_id
      join course.assessment_versions v on v.id = b.version_id
     where c.id = ${id}::uuid
  `;
  if (error) return error.code === UNDEFINED_TABLE ? undefined : fail("link read", error);
  if (!data) return undefined;
  return {
    candidate: { id: data.c_id, name: data.c_name, email: data.c_email, status: data.c_status, extraMinutes: data.c_extra, lastStartAt: data.c_last_start, generation: data.c_generation },
    batch: toBatch(data),
    version: { toolsAllowed: data.tools_allowed, toolsNotAllowed: data.tools_not_allowed, submission: data.submission, instructions: data.instructions, results: data.results },
  };
}

/**
 * What a recruiter can put in a batch right now: each test in the company's
 * catalog with a version the company approved (the newest such), the
 * company's reviewers, and the prep courses its catalog includes.
 */
export async function hiringOptions(sql: Db, companyId: string): Promise<{ tests: ApprovedTest[]; reviewers: { email: string; name: string | null }[]; prepCourses: PrepCourse[] } | null> {
  const catalog = await companyCatalog(sql, companyId);
  if (!catalog) return null;
  const items = catalog.filter((e) => e.item.kind === "assessment").map((e) => ({ slug: e.item.slug, title: e.item.title }));
  const [tests, reviewers] = await Promise.all([approvedTests(sql, companyId, items), companyReviewers(sql, companyId)]);
  if (!tests || !reviewers) return null;
  const prepCourses = catalog.filter((e) => e.item.kind === "course" && isPrepCourse(e.item.slug)).map((e) => e.item.slug as PrepCourse);
  return { tests, reviewers, prepCourses };
}
