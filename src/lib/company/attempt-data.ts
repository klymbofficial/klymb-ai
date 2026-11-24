import "server-only";
import type { Db } from "@/lib/db/client";

/**
 * Candidate attempts and hiring events (course.candidate_attempts,
 * course.hiring_events; 0053). A candidate is known only by their private
 * link: the caller has checked its signature, and every statement here also
 * requires the link's generation to be the current one, the person active
 * and the batch sent, so a replaced or cancelled link can't start or open a
 * test. Every function returns null on a database error.
 */

const UNDEFINED_TABLE = "42P01";
const fail = (what: string, error: { code?: string; message: string }) => {
  console.error(`candidate attempt ${what} failed:`, error.code, error.message);
  return null;
};

export interface Attempt {
  id: string;
  candidateId: string;
  attemptNo: number;
  versionId: string;
  allowedMinutes: number;
  startedAt: string;
  deadlineAt: string;
  receipt: string;
  submittedAt: string | null;
  submitKind: "candidate" | "deadline" | null;
}

type AttemptRow = {
  id: string; candidate_id: string; attempt_no: number; version_id: string; allowed_minutes: number; started_at: string; deadline_at: string;
  receipt: string; submitted_at: string | null; submit_kind: Attempt["submitKind"];
};
const toAttempt = (r: AttemptRow): Attempt => ({
  id: r.id, candidateId: r.candidate_id, attemptNo: r.attempt_no, versionId: r.version_id, allowedMinutes: r.allowed_minutes,
  startedAt: r.started_at, deadlineAt: r.deadline_at, receipt: r.receipt, submittedAt: r.submitted_at, submitKind: r.submit_kind,
});

export type StartOutcome = { status: "started" | "resumed"; attempt: Attempt } | { status: "refused" };

/**
 * Starts this person's test, or finds the one they already started. One
 * statement: the link's generation must be current, the person active, the
 * batch sent and open, and, for a new start, their last start still ahead.
 * The deadline is set here from the version's minutes plus their extra
 * minutes. Two presses at once make one attempt: the loser of the race finds
 * nothing to insert, and reads the winner's.
 */
export async function startAttempt(sql: Db, candidateId: string, generation: number): Promise<StartOutcome | null> {
  const { data, error } = await sql.row<AttemptRow & { made: boolean }>`
    with me as (
      select c.id, c.batch_id, c.company_id, c.link_generation, c.extra_minutes, c.last_start_at, b.version_id, b.closes_at, v.minutes
        from course.batch_candidates c
        join course.hiring_batches b on b.id = c.batch_id and b.company_id = c.company_id
        join course.assessment_versions v on v.id = b.version_id
       where c.id = ${candidateId}::uuid and c.link_generation = ${generation} and c.status = 'active'
         and b.status = 'sent' and b.opens_at <= now()
    ), existing as (
      select a.* from course.candidate_attempts a join me on a.candidate_id = me.id where a.attempt_no = 1
    ), made as (
      insert into course.candidate_attempts (company_id, batch_id, candidate_id, attempt_no, version_id, allowed_minutes, deadline_at, started_link_generation)
      select me.company_id, me.batch_id, me.id, 1, me.version_id, me.minutes + me.extra_minutes,
             now() + make_interval(mins => me.minutes + me.extra_minutes), me.link_generation
        from me
       where not exists (select 1 from existing)
         and coalesce(me.last_start_at, me.closes_at - make_interval(mins => me.minutes + me.extra_minutes)) > now()
      on conflict (candidate_id, attempt_no) do nothing
      returning *
    ), logged as (
      insert into course.hiring_events (company_id, batch_id, candidate_id, attempt_id, kind, actor_kind, detail, op_key)
      select made.company_id, made.batch_id, made.candidate_id, made.id, 'attempt_started', 'candidate',
             jsonb_build_object('link_generation', made.started_link_generation, 'allowed_minutes', made.allowed_minutes), 'start:' || made.id
        from made
      union all
      select e.company_id, e.batch_id, e.candidate_id, e.id, 'attempt_resumed', 'candidate',
             jsonb_build_object('link_generation', me.link_generation), 'resume:' || e.id || ':' || me.link_generation
        from existing e, me
      on conflict (op_key) do nothing
      returning 1
    )
    select made.*, true as made from made
    union all
    select existing.*, false as made from existing
    limit 1
  `;
  if (error) return fail("start", error);
  if (data) return { status: data.made ? "started" : "resumed", attempt: toAttempt(data) };
  // Nothing made and nothing found: refused, or another press won the race a moment ago.
  // Read again under the same conditions as Start, so a cancelled invitation never resumes.
  const raced = await sql.row<AttemptRow>`
    select a.id, a.candidate_id, a.attempt_no, a.version_id, a.allowed_minutes, a.started_at, a.deadline_at, a.receipt, a.submitted_at, a.submit_kind
      from course.candidate_attempts a
      join course.batch_candidates c on c.id = a.candidate_id and c.batch_id = a.batch_id
      join course.hiring_batches b on b.id = c.batch_id and b.company_id = c.company_id
     where a.candidate_id = ${candidateId}::uuid and a.attempt_no = 1
       and c.link_generation = ${generation} and c.status = 'active' and b.status = 'sent'
  `;
  if (raced.error) return fail("start reread", raced.error);
  if (!raced.data) return { status: "refused" };
  // This press lost a race to another and so resumed: note it like any resume (once per link).
  const logged = await sql.run`
    insert into course.hiring_events (company_id, batch_id, candidate_id, attempt_id, kind, actor_kind, detail, op_key)
    select a.company_id, a.batch_id, a.candidate_id, a.id, 'attempt_resumed', 'candidate',
           jsonb_build_object('link_generation', ${generation}::int), 'resume:' || a.id || ':' || ${generation}::int
      from course.candidate_attempts a where a.id = ${raced.data.id}::uuid
    on conflict (op_key) do nothing
  `;
  if (logged.error) fail("resume record", logged.error);
  return { status: "resumed", attempt: toAttempt(raced.data) };
}

/** This person's attempt, read through their current link. Undefined when there is none, or the link isn't current. */
export async function attemptByLink(sql: Db, candidateId: string, generation: number): Promise<Attempt | undefined | null> {
  const { data, error } = await sql.row<AttemptRow>`
    select a.id, a.candidate_id, a.attempt_no, a.version_id, a.allowed_minutes, a.started_at, a.deadline_at, a.receipt, a.submitted_at, a.submit_kind
      from course.candidate_attempts a
      join course.batch_candidates c on c.id = a.candidate_id and c.batch_id = a.batch_id
     where a.candidate_id = ${candidateId}::uuid and a.attempt_no = 1 and c.link_generation = ${generation}
  `;
  if (error) return error.code === UNDEFINED_TABLE ? undefined : fail("read", error);
  return data ? toAttempt(data) : undefined;
}

/** What the candidate works on once started: the task from the attempt's pinned version. Never the rubric. */
export async function attemptTask(sql: Db, attemptId: string): Promise<{ taskTitle: string; taskBrief: string; submission: "written" | "written_file" } | null> {
  const { data, error } = await sql.row<{ task_title: string; task_brief: string; submission: "written" | "written_file" }>`
    select v.task_title, v.task_brief, v.submission
      from course.candidate_attempts a join course.assessment_versions v on v.id = a.version_id
     where a.id = ${attemptId}::uuid
  `;
  if (error) return fail("task read", error);
  return data ? { taskTitle: data.task_title, taskBrief: data.task_brief, submission: data.submission } : null;
}

/**
 * Notes the first time a link is opened, once per link generation. A mail
 * provider's link scanner can open it too, so this means "the link was
 * opened", not "the candidate read it".
 */
export async function recordLinkOpened(sql: Db, candidateId: string, generation: number): Promise<boolean | null> {
  const { error } = await sql.run`
    insert into course.hiring_events (company_id, batch_id, candidate_id, kind, actor_kind, detail, op_key)
    select c.company_id, c.batch_id, c.id, 'link_opened', 'candidate', jsonb_build_object('link_generation', c.link_generation), 'open:' || c.id || ':' || c.link_generation
      from course.batch_candidates c join course.hiring_batches b on b.id = c.batch_id and b.company_id = c.company_id
     where c.id = ${candidateId}::uuid and c.link_generation = ${generation} and c.status = 'active' and b.status = 'sent'
    on conflict (op_key) do nothing
  `;
  if (error) return error.code === UNDEFINED_TABLE ? true : fail("open record", error);
  return true;
}

/** A batch's attempts, for the recruiter's table. The company comes from the signed-in recruiter. */
export async function attemptsForBatch(sql: Db, companyId: string, batchId: string): Promise<Attempt[] | null> {
  const { data, error } = await sql.rows<AttemptRow>`
    select id, candidate_id, attempt_no, version_id, allowed_minutes, started_at, deadline_at, receipt, submitted_at, submit_kind
      from course.candidate_attempts
     where batch_id = ${batchId}::uuid and company_id = ${companyId}::uuid and attempt_no = 1
  `;
  if (error) return error.code === UNDEFINED_TABLE ? [] : fail("batch read", error);
  return (data ?? []).map(toAttempt);
}
