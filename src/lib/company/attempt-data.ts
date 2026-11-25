import "server-only";
import { ATTEMPT_FILE_LIMITS, type AttemptFileKind } from "@/lib/company/attempt-files";
import { candidateQuestions, readQuestions, type CandidateQuestion } from "@/lib/company/assessment-rules";
import { SAVE_GRACE_SECONDS } from "@/lib/company/attempt-rules";
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

/** The database refused a write because the attempt was submitted a moment ago (0056's attempt_work_open). */
const submittedMeanwhile = (error: { code?: string; message: string }) => error.code === "P0001" && error.message === "this attempt is submitted";

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
/** `details` (U06b): what the person gave before Start, kept with a new attempt only; null when nothing was asked. */
export async function startAttempt(sql: Db, candidateId: string, generation: number, details: Record<string, string> | null = null): Promise<StartOutcome | null> {
  const { data, error } = await sql.row<AttemptRow & { made: boolean }>`
    with me as (
      select c.id, c.batch_id, c.company_id, c.link_generation, c.extra_minutes, c.last_start_at, b.version_id, b.closes_at, v.minutes, b.item
        from course.batch_candidates c
        join course.hiring_batches b on b.id = c.batch_id and b.company_id = c.company_id
        join course.assessment_versions v on v.id = b.version_id
       where c.id = ${candidateId}::uuid and c.link_generation = ${generation} and c.status = 'active'
         and b.status = 'sent' and b.opens_at <= now()
    ), existing as (
      select a.* from course.candidate_attempts a join me on a.candidate_id = me.id where a.attempt_no = 1
    ), made as (
      insert into course.candidate_attempts (company_id, batch_id, candidate_id, attempt_no, version_id, allowed_minutes, deadline_at, started_link_generation, details)
      select me.company_id, me.batch_id, me.id, 1, me.version_id, me.minutes + me.extra_minutes,
             now() + make_interval(mins => me.minutes + me.extra_minutes), me.link_generation, ${details ? JSON.stringify(details) : null}::jsonb
        from me
       where not exists (select 1 from existing)
         and coalesce(me.last_start_at, me.closes_at - make_interval(mins => me.minutes + me.extra_minutes)) > now()
         -- The company's settings for this test (U06a): access off, or past its end date, stops new starts.
         and not exists (select 1 from course.company_test_settings s
                          where s.company_id = me.company_id and s.item_slug = me.item
                            and (not s.access_open or s.ends_on <= now()))
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

/**
 * This person's attempt, read through their current link. Undefined when
 * there is none, or the link isn't current. An attempt whose time and grace
 * are over is submitted first (finaliseDue), so it reads as submitted.
 */
export async function attemptByLink(sql: Db, candidateId: string, generation: number): Promise<Attempt | undefined | null> {
  await finaliseDue(sql, { candidateId });
  const { data, error } = await sql.row<AttemptRow>`
    select a.id, a.candidate_id, a.attempt_no, a.version_id, a.allowed_minutes, a.started_at, a.deadline_at, a.receipt, a.submitted_at, a.submit_kind
      from course.candidate_attempts a
      join course.batch_candidates c on c.id = a.candidate_id and c.batch_id = a.batch_id
     where a.candidate_id = ${candidateId}::uuid and a.attempt_no = 1 and c.link_generation = ${generation}
  `;
  if (error) return error.code === UNDEFINED_TABLE ? undefined : fail("read", error);
  return data ? toAttempt(data) : undefined;
}

/**
 * What the candidate works on once started: the task from the attempt's
 * pinned version, or its questions (L2) as a candidate sees them. Never the
 * rubric's guides, never which options are right.
 */
export async function attemptTask(sql: Db, attemptId: string): Promise<{
  taskTitle: string; taskBrief: string; submission: "written" | "written_file"; questions: CandidateQuestion[] | null;
} | null> {
  const { data, error } = await sql.row<{ task_title: string; task_brief: string; submission: "written" | "written_file"; questions: unknown }>`
    select v.task_title, v.task_brief, v.submission, v.questions
      from course.candidate_attempts a join course.assessment_versions v on v.id = a.version_id
     where a.id = ${attemptId}::uuid
  `;
  if (error) return fail("task read", error);
  if (!data) return null;
  const qs = readQuestions(data.questions);
  return { taskTitle: data.task_title, taskBrief: data.task_brief, submission: data.submission, questions: qs ? candidateQuestions(qs) : null };
}

export interface QuestionAnswer {
  revision: number;
  answer: string;
  /** Multiple choice: the options picked, by index from 0. */
  picked: number[];
  savedAt: string;
}

/** The attempt's saved answers by question number (L2). Empty before the first save. */
export async function loadAnswers(sql: Db, attemptId: string): Promise<Map<number, QuestionAnswer> | null> {
  const { data, error } = await sql.rows<{ question_no: number; revision: number; answer: string; picked: number[]; saved_at: string }>`
    select question_no, revision, answer, picked, saved_at from course.attempt_answers where attempt_id = ${attemptId}::uuid
  `;
  if (error) return error.code === UNDEFINED_TABLE ? new Map() : fail("answers read", error);
  return new Map((data ?? []).map((r) => [r.question_no, { revision: r.revision, answer: r.answer, picked: (r.picked ?? []).map(Number), savedAt: r.saved_at }]));
}

/**
 * Saves one question's answer (L2): text, or the options picked. The same
 * checks as saveDraft — this person's attempt, current link, still invited,
 * open — and the same revision rule, per question, so two tabs on different
 * questions never clash and an older tab on the same question can't
 * overwrite newer work.
 */
export async function saveQuestionAnswer(
  sql: Db,
  s: { candidateId: string; generation: number; attemptId: string; questionNo: number; baseRevision: number; answer: string; picked: number[] },
): Promise<SaveOutcome | null> {
  const { data, error } = await sql.row<{ live: boolean; open: boolean; submitted: boolean; revision: number | null; saved_at: string | null; current: number | null }>`
    with live as (
      select a.id, a.deadline_at, a.submitted_at
        from course.candidate_attempts a
        join course.batch_candidates c on c.id = a.candidate_id and c.batch_id = a.batch_id
        join course.hiring_batches b on b.id = c.batch_id and b.company_id = c.company_id
       where a.id = ${s.attemptId}::uuid and a.candidate_id = ${s.candidateId}::uuid
         and c.link_generation = ${s.generation} and c.status = 'active' and b.status = 'sent'
    ), open as (
      select id from live
       where submitted_at is null and now() <= deadline_at + make_interval(secs => ${SAVE_GRACE_SECONDS})
    ), first as (
      insert into course.attempt_answers (attempt_id, question_no, revision, answer, picked)
      select id, ${s.questionNo}::smallint, 1, ${s.answer}, ${s.picked}::smallint[] from open where ${s.baseRevision}::int = 0
      on conflict (attempt_id, question_no) do nothing
      returning revision, saved_at
    ), next as (
      update course.attempt_answers d set revision = d.revision + 1, answer = ${s.answer}, picked = ${s.picked}::smallint[], saved_at = now()
        from open
       where d.attempt_id = open.id and d.question_no = ${s.questionNo}::smallint
         and ${s.baseRevision}::int > 0 and d.revision = ${s.baseRevision}::int
      returning d.revision, d.saved_at
    )
    select exists (select 1 from live) as live,
           exists (select 1 from open) as open,
           exists (select 1 from live where submitted_at is not null) as submitted,
           coalesce((select revision from first), (select revision from next)) as revision,
           coalesce((select saved_at from first), (select saved_at from next)) as saved_at,
           (select revision from course.attempt_answers where attempt_id = ${s.attemptId}::uuid and question_no = ${s.questionNo}::smallint) as current
  `;
  if (error) return submittedMeanwhile(error) ? { status: "submitted" } : fail("answer save", error);
  if (!data?.live) return { status: "refused" };
  if (data.submitted) return { status: "submitted" };
  if (!data.open) return { status: "closed" };
  if (data.revision && data.saved_at) return { status: "saved", revision: data.revision, savedAt: data.saved_at };
  return { status: "conflict", revision: data.current };
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

export interface Draft {
  revision: number;
  answer: string;
  savedAt: string;
}

/** The attempt's saved answer, or undefined before the first save. */
export async function loadDraft(sql: Db, attemptId: string): Promise<Draft | undefined | null> {
  const { data, error } = await sql.row<{ revision: number; answer: string; saved_at: string }>`
    select revision, answer, saved_at from course.attempt_drafts where attempt_id = ${attemptId}::uuid
  `;
  if (error) return error.code === UNDEFINED_TABLE ? undefined : fail("draft read", error);
  return data ? { revision: data.revision, answer: data.answer, savedAt: data.saved_at } : undefined;
}

export type SaveOutcome =
  | { status: "saved"; revision: number; savedAt: string }
  /** A newer save came from somewhere else (another tab or device): this one didn't land. */
  | { status: "conflict"; revision: number | null }
  /** The time and its grace are over. */
  | { status: "closed" }
  /** The test was submitted (here or in another tab), so the answer is final. */
  | { status: "submitted" }
  /** Not this link's attempt, a replaced link, or a cancelled invitation. */
  | { status: "refused" };

/**
 * Saves the answer, in one statement. The attempt must be this person's,
 * through their current link, still invited, in a sent batch, not submitted,
 * and within its deadline plus SAVE_GRACE_SECONDS. The save names the
 * revision it was based on (0 for the first): it lands only if that is still
 * the latest, so an older tab can't overwrite newer work.
 */
export async function saveDraft(
  sql: Db,
  s: { candidateId: string; generation: number; attemptId: string; baseRevision: number; answer: string },
): Promise<SaveOutcome | null> {
  const { data, error } = await sql.row<{ live: boolean; open: boolean; submitted: boolean; revision: number | null; saved_at: string | null; current: number | null }>`
    with live as (
      select a.id, a.deadline_at, a.submitted_at
        from course.candidate_attempts a
        join course.batch_candidates c on c.id = a.candidate_id and c.batch_id = a.batch_id
        join course.hiring_batches b on b.id = c.batch_id and b.company_id = c.company_id
       where a.id = ${s.attemptId}::uuid and a.candidate_id = ${s.candidateId}::uuid
         and c.link_generation = ${s.generation} and c.status = 'active' and b.status = 'sent'
    ), open as (
      select id from live
       where submitted_at is null and now() <= deadline_at + make_interval(secs => ${SAVE_GRACE_SECONDS})
    ), first as (
      insert into course.attempt_drafts (attempt_id, revision, answer)
      select id, 1, ${s.answer} from open where ${s.baseRevision}::int = 0
      on conflict (attempt_id) do nothing
      returning revision, saved_at
    ), next as (
      update course.attempt_drafts d set revision = d.revision + 1, answer = ${s.answer}, saved_at = now()
        from open
       where d.attempt_id = open.id and ${s.baseRevision}::int > 0 and d.revision = ${s.baseRevision}::int
      returning d.revision, d.saved_at
    )
    select exists (select 1 from live) as live,
           exists (select 1 from open) as open,
           exists (select 1 from live where submitted_at is not null) as submitted,
           coalesce((select revision from first), (select revision from next)) as revision,
           coalesce((select saved_at from first), (select saved_at from next)) as saved_at,
           (select revision from course.attempt_drafts where attempt_id = ${s.attemptId}::uuid) as current
  `;
  if (error) return submittedMeanwhile(error) ? { status: "submitted" } : fail("draft save", error);
  if (!data?.live) return { status: "refused" };
  if (data.submitted) return { status: "submitted" };
  if (!data.open) return { status: "closed" };
  if (data.revision && data.saved_at) return { status: "saved", revision: data.revision, savedAt: data.saved_at };
  return { status: "conflict", revision: data.current };
}

export interface AttemptFile {
  id: string;
  name: string;
  kind: AttemptFileKind;
  bytes: number;
  stage: "draft" | "submitted";
  addedAt: string;
  /** The question it belongs to (L2); null for a one-task test. */
  questionNo: number | null;
}

type FileRow = { id: string; name: string; kind: AttemptFileKind; bytes: number; stage: AttemptFile["stage"]; added_at: string; question_no?: number | null };
const toFile = (r: FileRow): AttemptFile => ({ id: r.id, name: r.name, kind: r.kind, bytes: r.bytes, stage: r.stage, addedAt: r.added_at, questionNo: r.question_no ?? null });

/** An attempt's files, oldest first. */
export async function listAttemptFiles(sql: Db, attemptId: string): Promise<AttemptFile[] | null> {
  const { data, error } = await sql.rows<FileRow>`
    select id, name, kind, bytes, stage, added_at, question_no from course.attempt_files where attempt_id = ${attemptId}::uuid order by added_at, id
  `;
  if (error) return error.code === UNDEFINED_TABLE ? [] : fail("files read", error);
  return (data ?? []).map(toFile);
}

/**
 * Whether this person can attach a file to this attempt right now, read
 * before the bytes are stored: their attempt through their current link,
 * still invited, open (deadline plus grace), and how many files it has.
 */
export async function fileSlot(sql: Db, s: { candidateId: string; generation: number; attemptId: string; questionNo?: number | null }): Promise<
  { status: "open"; companyId: string; count: number } | { status: "closed" } | { status: "submitted" } | { status: "refused" } | null
> {
  const { data, error } = await sql.row<{ company_id: string; open: boolean; submitted: boolean; count: number }>`
    select a.company_id, a.submitted_at is not null as submitted,
           (a.submitted_at is null and now() <= a.deadline_at + make_interval(secs => ${SAVE_GRACE_SECONDS})) as open,
           (select count(*)::int from course.attempt_files f where f.attempt_id = a.id and coalesce(f.question_no, 0) = ${s.questionNo ?? 0}::int) as count
      from course.candidate_attempts a
      join course.batch_candidates c on c.id = a.candidate_id and c.batch_id = a.batch_id
      join course.hiring_batches b on b.id = c.batch_id and b.company_id = c.company_id
     where a.id = ${s.attemptId}::uuid and a.candidate_id = ${s.candidateId}::uuid
       and c.link_generation = ${s.generation} and c.status = 'active' and b.status = 'sent'
  `;
  if (error) return fail("file slot", error);
  if (!data) return { status: "refused" };
  if (data.submitted) return { status: "submitted" };
  if (!data.open) return { status: "closed" };
  return { status: "open", companyId: data.company_id, count: data.count };
}

export type AddFileOutcome =
  | { status: "added"; file: AttemptFile }
  | { status: "duplicate" }
  | { status: "full" }
  | { status: "closed" }
  | { status: "submitted" }
  | { status: "refused" };

/**
 * Records a stored file against the attempt, in one statement that checks
 * everything again: this person's attempt, current link, still invited,
 * still open, and a free slot (one of ATTEMPT_FILE_LIMITS.count, unique per
 * attempt). The same bytes twice are refused as a duplicate. "full" can also
 * mean another upload took the same slot a moment ago: the caller retries
 * once.
 */
export async function addAttemptFile(
  sql: Db,
  f: { candidateId: string; generation: number; attemptId: string; name: string; kind: AttemptFileKind; bytes: number; sha256: string; storageKey: string; questionNo?: number | null },
): Promise<AddFileOutcome | null> {
  const q = f.questionNo ?? 0;
  const { data, error } = await sql.row<{ live: boolean; open: boolean; submitted: boolean; count: number; dup: boolean } & Partial<FileRow>>`
    with live as (
      select a.id, a.company_id, a.deadline_at, a.submitted_at
        from course.candidate_attempts a
        join course.batch_candidates c on c.id = a.candidate_id and c.batch_id = a.batch_id
        join course.hiring_batches b on b.id = c.batch_id and b.company_id = c.company_id
       where a.id = ${f.attemptId}::uuid and a.candidate_id = ${f.candidateId}::uuid
         and c.link_generation = ${f.generation} and c.status = 'active' and b.status = 'sent'
    ), open as (
      select id, company_id from live where submitted_at is null and now() <= deadline_at + make_interval(secs => ${SAVE_GRACE_SECONDS})
    ), slot as (
      -- The lowest free slot; none when all are taken. Slots are unique per attempt, so a race can't make a fourth file.
      select open.id, open.company_id,
             (select min(n) from generate_series(1, ${ATTEMPT_FILE_LIMITS.count}::int) n
               where n not in (select x.slot from course.attempt_files x where x.attempt_id = open.id and coalesce(x.question_no, 0) = ${q}::int)) as n
        from open
    ), made as (
      insert into course.attempt_files (company_id, attempt_id, slot, name, kind, bytes, sha256, storage_key, question_no)
      select slot.company_id, slot.id, slot.n, ${f.name}, ${f.kind}, ${f.bytes}, ${f.sha256}, ${f.storageKey}, nullif(${q}::int, 0)::smallint
        from slot
       where slot.n is not null
      on conflict do nothing
      returning id, name, kind, bytes, stage, added_at, question_no
    )
    select exists (select 1 from live) as live,
           exists (select 1 from open) as open,
           exists (select 1 from live where submitted_at is not null) as submitted,
           (select count(*)::int from course.attempt_files x where x.attempt_id = ${f.attemptId}::uuid) as count,
           exists (select 1 from course.attempt_files x where x.attempt_id = ${f.attemptId}::uuid and x.sha256 = ${f.sha256}) as dup,
           made.id, made.name, made.kind, made.bytes, made.stage, made.added_at, made.question_no
      from (select 1) one left join made on true
  `;
  if (error) return submittedMeanwhile(error) ? { status: "submitted" } : fail("file add", error);
  if (!data?.live) return { status: "refused" };
  if (data.submitted) return { status: "submitted" };
  if (!data.open) return { status: "closed" };
  if (data.id) return { status: "added", file: toFile(data as FileRow) };
  if (data.dup) return { status: "duplicate" };
  return { status: "full" };
}

/** Removes a file the candidate attached, while the attempt is open and before it is submitted. True when one went. */
export async function removeAttemptFile(sql: Db, f: { candidateId: string; generation: number; attemptId: string; fileId: string }): Promise<boolean | null> {
  const { data, error } = await sql.run`
    delete from course.attempt_files x
     using course.candidate_attempts a, course.batch_candidates c, course.hiring_batches b
     where x.id = ${f.fileId}::uuid and x.attempt_id = a.id and x.stage = 'draft'
       and a.id = ${f.attemptId}::uuid and a.candidate_id = ${f.candidateId}::uuid
       and c.id = a.candidate_id and c.batch_id = a.batch_id and c.link_generation = ${f.generation} and c.status = 'active'
       and b.id = c.batch_id and b.company_id = c.company_id and b.status = 'sent'
       and a.submitted_at is null and now() <= a.deadline_at + make_interval(secs => ${SAVE_GRACE_SECONDS})
  `;
  if (error) return submittedMeanwhile(error) ? false : fail("file remove", error);
  return (data ?? 0) > 0;
}

/**
 * A batch's attempts, for the recruiter's table. The company comes from the
 * signed-in recruiter. Attempts whose time and grace are over are submitted
 * first (finaliseDue).
 */
export async function attemptsForBatch(sql: Db, companyId: string, batchId: string, opts: { finalised?: boolean } = {}): Promise<Attempt[] | null> {
  // The caller may have finalised the whole test already (P0.5).
  if (!opts.finalised) await finaliseDue(sql, { companyId, batchId });
  const { data, error } = await sql.rows<AttemptRow>`
    select id, candidate_id, attempt_no, version_id, allowed_minutes, started_at, deadline_at, receipt, submitted_at, submit_kind
      from course.candidate_attempts
     where batch_id = ${batchId}::uuid and company_id = ${companyId}::uuid and attempt_no = 1
  `;
  if (error) return error.code === UNDEFINED_TABLE ? [] : fail("batch read", error);
  return (data ?? []).map(toAttempt);
}

export type SubmitOutcome =
  /** This call submitted it, or it was submitted before (a repeated press): either way, here is the receipt. */
  | { status: "submitted" | "already"; receipt: string; submittedAt: string; kind: "candidate" | "deadline" }
  /** The answer saved on the server is newer than the one this page shows (saved from another tab). */
  | { status: "stale" }
  /** The time and its grace are over. */
  | { status: "closed" }
  /** Not this link's attempt, a replaced link, or a cancelled invitation. */
  | { status: "refused" };

const UNDEFINED_FUNCTION = "42883";

/**
 * The candidate's Submit (course.submit_attempt, 0056). The database checks
 * the link, the person and the time, copies the saved answer and the files
 * into a frozen submission, and records it once: pressing Submit again, or
 * in a second tab, returns the same receipt. `revision` is the saved answer
 * the page shows; a newer one saved elsewhere makes it "stale", so what is
 * submitted is what the candidate last saw.
 */
export async function submitAttempt(
  sql: Db,
  /** `revision` is null for a test with questions: each question saved on its own, and what is saved is submitted. */
  s: { candidateId: string; generation: number; attemptId: string; revision: number | null },
): Promise<SubmitOutcome | null> {
  const { data, error } = await sql.row<{ status: string; receipt: string | null; submitted_at: string | null; submit_kind: "candidate" | "deadline" | null }>`
    select status, receipt, submitted_at, submit_kind
      from course.submit_attempt(${s.attemptId}::uuid, 'candidate', ${s.candidateId}::uuid, ${s.generation}::int, ${s.revision}::int, ${SAVE_GRACE_SECONDS}::int)
  `;
  if (error) return fail("submit", error);
  if (!data) return null;
  if ((data.status === "submitted" || data.status === "already") && data.receipt && data.submitted_at && data.submit_kind) {
    return { status: data.status, receipt: data.receipt, submittedAt: data.submitted_at, kind: data.submit_kind };
  }
  if (data.status === "stale" || data.status === "closed" || data.status === "refused") return { status: data.status };
  return null;
}

/**
 * Submits, at the time limit, whatever was saved for attempts whose time and
 * save grace are over (D2: A). There is no cron: this runs when anyone next
 * looks, the candidate opening their link or a recruiter opening the batch,
 * just before the attempts are read. Only people still invited, in a sent
 * batch. Returns how many it submitted; a failure here never stops the page.
 */
export async function finaliseDue(sql: Db, scope: { companyId: string; batchId: string } | { candidateId: string } | { companyId: string; item: string }): Promise<number | null> {
  if ("item" in scope) {
    // Every round of one test at once (P0.5), so the Candidates tab finalises in one trip.
    const { data, error } = await sql.scalar<number>`
      select count(*) filter (where s.status = 'submitted')::int
        from (
          select a.id from course.candidate_attempts a
            join course.hiring_batches b on b.id = a.batch_id and b.company_id = a.company_id
           where a.submitted_at is null and now() > a.deadline_at + make_interval(secs => ${SAVE_GRACE_SECONDS})
             and b.company_id = ${scope.companyId}::uuid and b.item = ${scope.item}
           order by a.id
        ) due
        cross join lateral course.submit_attempt(due.id, 'deadline', null, null, null, ${SAVE_GRACE_SECONDS}::int) s
    `;
    if (error) return error.code === UNDEFINED_FUNCTION || error.code === UNDEFINED_TABLE ? 0 : fail("finalise", error);
    return data ?? 0;
  }
  const byBatch = "batchId" in scope;
  const { data, error } = await sql.scalar<number>`
    select count(*) filter (where s.status = 'submitted')::int
      from (
        select a.id from course.candidate_attempts a
         where a.submitted_at is null and now() > a.deadline_at + make_interval(secs => ${SAVE_GRACE_SECONDS})
           and case when ${byBatch}::boolean
                    then a.batch_id = ${byBatch ? scope.batchId : null}::uuid and a.company_id = ${byBatch ? scope.companyId : null}::uuid
                    else a.candidate_id = ${byBatch ? null : scope.candidateId}::uuid end
         order by a.id
      ) due
      cross join lateral course.submit_attempt(due.id, 'deadline', null, null, null, ${SAVE_GRACE_SECONDS}::int) s
  `;
  if (error) return error.code === UNDEFINED_FUNCTION || error.code === UNDEFINED_TABLE ? 0 : fail("finalise", error);
  return data ?? 0;
}

export interface SubmittedAnswer {
  questionNo: number;
  answer: string;
  picked: number[];
  files: { name: string; kind: AttemptFileKind; bytes: number }[];
}

export interface Submission {
  answer: string;
  /** A test with questions (L2): each answered question's frozen answer, picks and files. Null for a one-task test. */
  answers: SubmittedAnswer[] | null;
  kind: "candidate" | "deadline";
  submittedAt: string;
  files: { name: string; kind: AttemptFileKind; bytes: number }[];
}

/** What an attempt's submission holds: the frozen answer and the files it lists. Undefined when it isn't submitted. */
export async function loadSubmission(sql: Db, attemptId: string): Promise<Submission | undefined | null> {
  const { data, error } = await sql.row<{ answer: string; kind: Submission["kind"]; submitted_at: string; files: (Submission["files"][number] & { q: number | null })[]; answers: unknown }>`
    select s.answer, s.kind, s.submitted_at, s.answers,
           coalesce((select jsonb_agg(jsonb_build_object('name', f.name, 'kind', f.kind, 'bytes', f.bytes, 'q', f.question_no) order by coalesce(f.question_no, 0), f.slot)
                       from course.attempt_files f where f.attempt_id = s.attempt_id and f.id = any (s.file_ids)), '[]'::jsonb) as files
      from course.attempt_submissions s
     where s.attempt_id = ${attemptId}::uuid
  `;
  if (error) return error.code === UNDEFINED_TABLE ? undefined : fail("submission read", error);
  if (!data) return undefined;
  const strip = (f: Submission["files"][number] & { q: number | null }) => ({ name: f.name, kind: f.kind, bytes: f.bytes });
  const answers = Array.isArray(data.answers)
    ? (data.answers as Record<string, unknown>[]).flatMap((a) => {
        const n = Number(a.question_no);
        if (!Number.isInteger(n)) return [];
        return [{
          questionNo: n,
          answer: typeof a.answer === "string" ? a.answer : "",
          picked: Array.isArray(a.picked) ? (a.picked as unknown[]).map(Number).filter(Number.isInteger) : [],
          files: data.files.filter((f) => f.q === n).map(strip),
        }];
      })
    : null;
  return { answer: data.answer, answers, kind: data.kind, submittedAt: data.submitted_at, files: data.files.filter((f) => f.q === null).map(strip) };
}
