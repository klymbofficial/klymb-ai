import "server-only";
import type { AttemptFileKind } from "@/lib/company/attempt-files";
import { readQuestions, type Question } from "@/lib/company/assessment-rules";
import { finaliseDue } from "@/lib/company/attempt-data";
import type { RubricItem, ScoreInput } from "@/lib/company/review-rules";
import type { Db } from "@/lib/db/client";

/**
 * Reviews of submitted attempts (course.attempt_reviews, 0058). Every read
 * takes the company from the signed-in member and checks the batch and the
 * candidate belong to it; the database checks the reviewer again on write.
 * Every function returns null on a database error.
 */

const UNDEFINED_TABLE = "42P01";
const fail = (what: string, error: { code?: string; message: string }) => {
  console.error(`review ${what} failed:`, error.code, error.message);
  return null;
};

export interface ReviewRecord {
  revision: number;
  reviewerEmail: string;
  reviewerName: string | null;
  scores: { title: string; points: number; max: number; note: string }[];
  total: number;
  max: number;
  summary: string;
  completedAt: string;
}

export interface ReviewView {
  candidate: { id: string; name: string; email: string; status: "active" | "cancelled" };
  batch: { id: string; item: string; purpose: "hiring" | "internal"; role: string; title: string; version: number; timeZone: string; status: string; reviewerEmail: string; reviewerName: string | null };
  attempt: {
    id: string; startedAt: string; deadlineAt: string; allowedMinutes: number; receipt: string;
    submittedAt: string | null; submitKind: "candidate" | "deadline" | null;
  } | null;
  submission: {
    answer: string;
    /** One-task tests: the attempt's files. A test with questions: files sit under their question instead. */
    files: { id: string; name: string; kind: AttemptFileKind; bytes: number }[];
    /** A test with questions (L2): each answered question's frozen answer, picks and files. Null for a one-task test. */
    answers: { questionNo: number; answer: string; picked: number[]; files: { id: string; name: string; kind: AttemptFileKind; bytes: number }[] }[] | null;
  } | null;
  /** The pinned version's questions (L2), right options and guides included: reviewers only. Null for a one-task test. */
  questions: Question[] | null;
  /** The rubric pinned to the attempt (the batch's version before anyone starts). Guides included: reviewers only. */
  rubric: RubricItem[];
  /** What the pinned version lets the candidate see once a recruiter shares (none | overall | by_area). */
  results: "none" | "overall" | "by_area";
  /** Newest first. */
  reviews: ReviewRecord[];
}

type ReviewRow = {
  revision: number; reviewer_email: string; reviewer_name: string | null; scores: ReviewRecord["scores"];
  total: number; max: number; summary: string; completed_at: string;
};
const toReview = (r: ReviewRow): ReviewRecord => ({
  revision: r.revision, reviewerEmail: r.reviewer_email, reviewerName: r.reviewer_name, scores: r.scores,
  total: r.total, max: r.max, summary: r.summary, completedAt: r.completed_at,
});

/** One candidate of one batch of this company, with their submission, the pinned rubric and every review. Undefined when not found here. */
export async function loadReviewView(sql: Db, companyId: string, batchId: string, candidateId: string): Promise<ReviewView | undefined | null> {
  // A test whose time is over is submitted before anyone looks at it.
  await finaliseDue(sql, { candidateId });
  const head = await sql.row<{
    id: string; name: string; email: string; status: "active" | "cancelled";
    batch_id: string; item: string; purpose: "hiring" | "internal" | null; role: string; time_zone: string; batch_status: string; reviewer_email: string; reviewer_name: string | null; title: string; version: number;
    attempt_id: string | null; started_at: string | null; deadline_at: string | null; allowed_minutes: number | null; receipt: string | null;
    submitted_at: string | null; submit_kind: "candidate" | "deadline" | null;
    answer: string | null; file_ids: string[] | null; submitted: boolean; rubric: RubricItem[]; results: ReviewView["results"];
    answers: unknown; questions: unknown;
  }>`
    select c.id, c.name, c.email, c.status,
           b.id as batch_id, b.item, b.purpose, b.role, b.time_zone, b.status as batch_status, b.reviewer_email, rm.name as reviewer_name, bv.title, bv.version,
           a.id as attempt_id, a.started_at, a.deadline_at, a.allowed_minutes, a.receipt, a.submitted_at, a.submit_kind,
           s.answer, s.file_ids, s.attempt_id is not null as submitted, pv.rubric, pv.results, s.answers, pv.questions
      from course.batch_candidates c
      join course.hiring_batches b on b.id = c.batch_id and b.company_id = c.company_id
      join course.assessment_versions bv on bv.id = b.version_id
      left join course.company_members rm on rm.email = b.reviewer_email and rm.company_id = b.company_id
      left join course.candidate_attempts a on a.candidate_id = c.id and a.batch_id = c.batch_id and a.attempt_no = 1
      left join course.attempt_submissions s on s.attempt_id = a.id
      join course.assessment_versions pv on pv.id = coalesce(a.version_id, b.version_id)
     where c.id = ${candidateId}::uuid and c.batch_id = ${batchId}::uuid and c.company_id = ${companyId}::uuid
  `;
  if (head.error) return fail("view", head.error);
  const h = head.data;
  if (!h) return undefined;

  let files: (NonNullable<ReviewView["submission"]>["files"][number] & { question_no: number | null })[] = [];
  let reviews: ReviewRecord[] = [];
  if (h.attempt_id && h.submitted) {
    const [f, r] = await Promise.all([
      sql.rows<{ id: string; name: string; kind: AttemptFileKind; bytes: number; question_no: number | null }>`
        select id, name, kind, bytes, question_no from course.attempt_files
         where attempt_id = ${h.attempt_id}::uuid and id = any (${h.file_ids ?? []}::uuid[]) order by coalesce(question_no, 0), slot
      `,
      sql.rows<ReviewRow>`
        select r.revision, r.reviewer_email, m.name as reviewer_name, r.scores, r.total, r.max, r.summary, r.completed_at
          from course.attempt_reviews r
          left join course.company_members m on m.email = r.reviewer_email and m.company_id = r.company_id
         where r.attempt_id = ${h.attempt_id}::uuid and r.company_id = ${companyId}::uuid
         order by r.revision desc
      `,
    ]);
    if (f.error) return fail("files", f.error);
    if (r.error && r.error.code !== UNDEFINED_TABLE) return fail("history", r.error);
    files = f.data ?? [];
    reviews = (r.data ?? []).map(toReview);
  }

  return {
    candidate: { id: h.id, name: h.name, email: h.email, status: h.status },
    batch: { id: h.batch_id, item: h.item, purpose: h.purpose ?? "hiring", role: h.role, title: h.title, version: h.version, timeZone: h.time_zone, status: h.batch_status, reviewerEmail: h.reviewer_email, reviewerName: h.reviewer_name },
    attempt: h.attempt_id
      ? { id: h.attempt_id, startedAt: h.started_at!, deadlineAt: h.deadline_at!, allowedMinutes: h.allowed_minutes!, receipt: h.receipt!, submittedAt: h.submitted_at, submitKind: h.submit_kind }
      : null,
    submission: h.submitted
      ? {
          answer: h.answer ?? "",
          files: files.filter((f) => f.question_no === null).map(({ id, name, kind, bytes }) => ({ id, name, kind, bytes })),
          answers: Array.isArray(h.answers)
            ? (h.answers as Record<string, unknown>[]).flatMap((x) => {
                const n = Number(x.question_no);
                if (!Number.isInteger(n)) return [];
                return [{
                  questionNo: n,
                  answer: typeof x.answer === "string" ? x.answer : "",
                  picked: Array.isArray(x.picked) ? (x.picked as unknown[]).map(Number).filter(Number.isInteger) : [],
                  files: files.filter((f) => f.question_no === n).map(({ id, name, kind, bytes }) => ({ id, name, kind, bytes })),
                }];
              })
            : null,
        }
      : null,
    questions: readQuestions(h.questions),
    rubric: h.rubric,
    results: h.results,
    reviews,
  };
}

export interface LatestReview {
  attemptId: string;
  revision: number;
  total: number;
  max: number;
  reviewerEmail: string;
  completedAt: string;
}

/** The newest review of each attempt in a batch, for the candidates table. */
export async function reviewsForBatch(sql: Db, companyId: string, batchId: string): Promise<LatestReview[] | null> {
  const { data, error } = await sql.rows<{ attempt_id: string; revision: number; total: number; max: number; reviewer_email: string; completed_at: string }>`
    select distinct on (r.attempt_id) r.attempt_id, r.revision, r.total, r.max, r.reviewer_email, r.completed_at
      from course.attempt_reviews r
      join course.candidate_attempts a on a.id = r.attempt_id and a.company_id = r.company_id
     where a.batch_id = ${batchId}::uuid and r.company_id = ${companyId}::uuid
     order by r.attempt_id, r.revision desc
  `;
  if (error) return error.code === UNDEFINED_TABLE ? [] : fail("batch read", error);
  return (data ?? []).map((r) => ({ attemptId: r.attempt_id, revision: r.revision, total: r.total, max: r.max, reviewerEmail: r.reviewer_email, completedAt: r.completed_at }));
}

export type RecordOutcome =
  | { status: "recorded"; revision: number; total: number; max: number }
  /** Someone recorded a newer review meanwhile; `revision` is the newest. */
  | { status: "conflict"; revision: number | null }
  | { status: "invalid" | "not_submitted" | "refused" };

/** Records a review through course.record_review, which checks the reviewer, the rubric and the revision again. */
export async function recordReview(
  sql: Db,
  r: { companyId: string; attemptId: string; reviewer: string; baseRevision: number; scores: ScoreInput[]; summary: string },
): Promise<RecordOutcome | null> {
  const { data, error } = await sql.row<{ status: string; revision: number | null; total: number | null; max: number | null }>`
    select status, revision, total, max
      from course.record_review(${r.companyId}::uuid, ${r.attemptId}::uuid, ${r.reviewer}, ${r.baseRevision}::int,
                                ${JSON.stringify(r.scores.map((s) => ({ points: s.points, note: s.note })))}::jsonb, ${r.summary})
  `;
  if (error) return fail("record", error);
  if (!data) return null;
  if (data.status === "recorded" && data.revision !== null && data.total !== null && data.max !== null) {
    return { status: "recorded", revision: data.revision, total: data.total, max: data.max };
  }
  if (data.status === "conflict") return { status: "conflict", revision: data.revision };
  if (data.status === "invalid" || data.status === "not_submitted" || data.status === "refused") return { status: data.status };
  return null;
}

/** A file in this candidate's submission, for an authorised download. Undefined when it isn't one. */
export async function submittedFile(
  sql: Db,
  s: { companyId: string; batchId: string; candidateId: string; fileId: string },
): Promise<{ name: string; kind: AttemptFileKind; storageKey: string } | undefined | null> {
  const { data, error } = await sql.row<{ name: string; kind: AttemptFileKind; storage_key: string }>`
    select f.name, f.kind, f.storage_key
      from course.attempt_files f
      join course.candidate_attempts a on a.id = f.attempt_id and a.company_id = f.company_id
      join course.attempt_submissions s on s.attempt_id = a.id
     where f.id = ${s.fileId}::uuid and f.id = any (s.file_ids) and f.stage = 'submitted'
       and a.candidate_id = ${s.candidateId}::uuid and a.batch_id = ${s.batchId}::uuid and a.company_id = ${s.companyId}::uuid
  `;
  if (error) return fail("file", error);
  return data ? { name: data.name, kind: data.kind, storageKey: data.storage_key } : undefined;
}
