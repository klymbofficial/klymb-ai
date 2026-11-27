import "server-only";
import type { Db } from "@/lib/db/client";
import { finaliseDue } from "@/lib/company/attempt-data";
import { SAVE_GRACE_SECONDS } from "@/lib/company/attempt-rules";
import type { HiringDecision } from "@/lib/company/review-rules";

/**
 * Read-only queries behind the Assessments hub: how many people each test
 * has invited and how many took it, and one test's candidates gathered
 * from every batch run on it. Always scoped to one company. Drafts are left
 * out: nobody in a draft batch has been invited yet.
 */

const UNDEFINED_TABLE = "42P01";

const fail = (what: string, error: { code?: string; message: string }) => {
  console.error(`test hub ${what} failed:`, error.code, error.message);
  return null;
};

export interface TestCounts {
  invited: number;
  taken: number;
  batches: number;
}

/** Per test (catalog slug): people invited (still active, or who started anyway), people who submitted, batches sent. */
export async function testCounts(sql: Db, companyId: string): Promise<Map<string, TestCounts> | null> {
  const { data, error } = await sql.rows<{ item: string; invited: number; taken: number; batches: number }>`
    select b.item,
           count(c.id) filter (where (c.status = 'active' and b.status = 'sent') or a.id is not null)::int as invited,
           -- A test whose time (and save grace) is over counts as taken: it is submitted the next time anyone opens it.
           count(a.id) filter (where a.submitted_at is not null or now() > a.deadline_at + make_interval(secs => ${SAVE_GRACE_SECONDS}))::int as taken,
           count(distinct b.id)::int as batches
      from course.hiring_batches b
      left join course.batch_candidates c on c.batch_id = b.id and c.company_id = b.company_id
      left join course.candidate_attempts a on a.candidate_id = c.id and a.attempt_no = 1
     where b.company_id = ${companyId}::uuid and b.status <> 'draft'
     group by b.item
  `;
  if (error) return error.code === UNDEFINED_TABLE ? new Map() : fail("counts", error);
  return new Map((data ?? []).map((r) => [r.item, { invited: r.invited, taken: r.taken, batches: r.batches }]));
}

export interface HubCandidate {
  id: string;
  batchId: string;
  batchRole: string;
  batchStatus: "sent" | "cancelled";
  opensAt: string;
  closesAt: string;
  timeZone: string;
  minutes: number;
  name: string;
  email: string;
  status: "active" | "cancelled";
  extraMinutes: number;
  lastStartAt: string | null;
  opened: boolean;
  startedAt: string | null;
  deadlineAt: string | null;
  submittedAt: string | null;
  submitKind: "candidate" | "deadline" | null;
  total: number | null;
  max: number | null;
  decision: HiringDecision | null;
  shared: boolean;
}

/** Everyone invited to this test, across its batches, newest activity first. Submits any attempt whose time ran out first, as the batch page does. */
export async function testCandidates(sql: Db, companyId: string, item: string): Promise<HubCandidate[] | null> {
  const batches = await sql.rows<{ id: string }>`
    select id from course.hiring_batches where company_id = ${companyId}::uuid and item = ${item} and status = 'sent'
  `;
  if (batches.error) return batches.error.code === UNDEFINED_TABLE ? [] : fail("batches", batches.error);
  for (const b of batches.data ?? []) await finaliseDue(sql, { companyId, batchId: b.id });

  const { data, error } = await sql.rows<{
    id: string; batch_id: string; role: string; batch_status: "sent" | "cancelled"; opens_at: string; closes_at: string; time_zone: string; minutes: number;
    name: string; email: string; status: "active" | "cancelled"; extra_minutes: number; last_start_at: string | null; opened: boolean;
    started_at: string | null; deadline_at: string | null; submitted_at: string | null; submit_kind: "candidate" | "deadline" | null; total: number | null; max: number | null;
    decision: HiringDecision | null; shared: boolean;
  }>`
    select c.id, c.batch_id, b.role, b.status as batch_status, b.opens_at, b.closes_at, b.time_zone, v.minutes,
           c.name, c.email, c.status, c.extra_minutes, c.last_start_at,
           exists (select 1 from course.hiring_events e where e.candidate_id = c.id and e.kind = 'link_opened') as opened,
           a.started_at, a.deadline_at, a.submitted_at, a.submit_kind, r.total, r.max,
           (select d.decision from course.hiring_decisions d where d.attempt_id = a.id order by d.revision desc limit 1) as decision,
           exists (select 1 from course.result_shares s where s.attempt_id = a.id) as shared
      from course.batch_candidates c
      join course.hiring_batches b on b.id = c.batch_id and b.company_id = c.company_id
      join course.assessment_versions v on v.id = b.version_id
      left join course.candidate_attempts a on a.candidate_id = c.id and a.attempt_no = 1
      left join lateral (
        select total, max from course.attempt_reviews r where r.attempt_id = a.id order by r.revision desc limit 1
      ) r on true
     where c.company_id = ${companyId}::uuid and b.item = ${item} and b.status <> 'draft'
     order by coalesce(a.submitted_at, a.started_at, c.added_at) desc
     limit 2000
  `;
  if (error) return error.code === UNDEFINED_TABLE ? [] : fail("candidates", error);
  const iso = (d: string | null) => (d ? new Date(d).toISOString() : null);
  return (data ?? []).map((r) => ({
    id: r.id, batchId: r.batch_id, batchRole: r.role, batchStatus: r.batch_status, opensAt: iso(r.opens_at)!, closesAt: iso(r.closes_at)!, timeZone: r.time_zone,
    minutes: r.minutes, name: r.name, email: r.email, status: r.status, extraMinutes: r.extra_minutes, lastStartAt: iso(r.last_start_at), opened: r.opened,
    startedAt: iso(r.started_at), deadlineAt: iso(r.deadline_at), submittedAt: iso(r.submitted_at), submitKind: r.submit_kind, total: r.total, max: r.max,
    decision: r.decision, shared: !!r.shared,
  }));
}

/** When each version was published, by version id. */
/**
 * When each version of these tests was published and by whom, with the
 * publisher's name when they're in this company (their own tests). Klymb's
 * tests are published by Klymb staff, whose names aren't shown here.
 */
export async function publishedFacts(sql: Db, companyId: string, slugs: string[]): Promise<Map<string, { at: string; by: string; name: string | null }> | null> {
  if (!slugs.length) return new Map();
  const { data, error } = await sql.rows<{ id: string; published_at: string; published_by: string; name: string | null }>`
    select v.id, v.published_at, v.published_by, m.name
      from course.assessment_versions v
      left join course.company_members m on m.company_id = ${companyId}::uuid and m.email = v.published_by
     where v.slug = any(${slugs}::text[])
  `;
  if (error) return error.code === UNDEFINED_TABLE ? new Map() : fail("dates", error);
  return new Map((data ?? []).map((r) => [r.id, { at: new Date(r.published_at).toISOString(), by: r.published_by, name: r.name }]));
}

/**
 * Automatic marks per question for one version of a test in this company
 * (P0.6), from frozen submissions. Never another company's. Null on error.
 */
export async function versionQuestionMarks(sql: Db, companyId: string, versionId: string): Promise<{ questionNo: number; points: number; max: number }[] | null> {
  const { data, error } = await sql.rows<{ question_no: number; points: number; max: number }>`
    select (m ->> 'question_no')::int as question_no, (m ->> 'points')::int as points, (m ->> 'max')::int as max
      from course.attempt_submissions s
      join course.candidate_attempts a on a.id = s.attempt_id and a.company_id = s.company_id
      cross join lateral jsonb_array_elements(case when jsonb_typeof(s.auto_scores) = 'array' then s.auto_scores else '[]'::jsonb end) as m
     where s.company_id = ${companyId}::uuid and a.version_id = ${versionId}::uuid
  `;
  if (error) {
    if (error.code === "42703" || error.code === "42P01") return [];
    console.error("version question marks failed:", error.code, error.message);
    return null;
  }
  return (data ?? []).map((r) => ({ questionNo: r.question_no, points: r.points, max: r.max }));
}
