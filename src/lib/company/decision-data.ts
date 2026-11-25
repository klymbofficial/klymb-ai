import "server-only";
import { candidateResult, type HiringDecision, type SharedResult } from "@/lib/company/review-rules";
import type { Db } from "@/lib/db/client";

/**
 * Hiring decisions and shared results (course.hiring_decisions and
 * course.result_shares, 0059). Reads take the company from the signed-in
 * member; writes go through record_decision() / share_result(), which check
 * the person's role, the company and the attempt again. Every function
 * returns null on a database error.
 */

const UNDEFINED_TABLE = "42P01";
const fail = (what: string, error: { code?: string; message: string }) => {
  console.error(`decision ${what} failed:`, error.code, error.message);
  return null;
};
const iso = (d: string) => new Date(d).toISOString();

export interface DecisionRecord {
  revision: number;
  decision: HiringDecision;
  reason: string;
  /** The newest review revision when it was made; null when it was made before any review. */
  reviewRevision: number | null;
  decidedBy: string;
  deciderName: string | null;
  decidedAt: string;
}

export interface ShareRecord {
  reviewRevision: number;
  policy: "overall" | "by_area";
  sharedBy: string;
  sharerName: string | null;
  sharedAt: string;
}

/** Every decision and share on one attempt of this company, newest first. */
export async function decisionHistory(sql: Db, companyId: string, attemptId: string): Promise<{ decisions: DecisionRecord[]; shares: ShareRecord[] } | null> {
  const [d, s] = await Promise.all([
    sql.rows<{ revision: number; decision: HiringDecision; reason: string; review_revision: number | null; decided_by: string; name: string | null; decided_at: string }>`
      select d.revision, d.decision, d.reason, d.review_revision, d.decided_by, m.name, d.decided_at
        from course.hiring_decisions d
        left join course.company_members m on m.company_id = d.company_id and m.email = d.decided_by
       where d.attempt_id = ${attemptId}::uuid and d.company_id = ${companyId}::uuid
       order by d.revision desc
    `,
    sql.rows<{ review_revision: number; policy: "overall" | "by_area"; shared_by: string; name: string | null; shared_at: string }>`
      select s.review_revision, s.policy, s.shared_by, m.name, s.shared_at
        from course.result_shares s
        left join course.company_members m on m.company_id = s.company_id and m.email = s.shared_by
       where s.attempt_id = ${attemptId}::uuid and s.company_id = ${companyId}::uuid
       order by s.review_revision desc
    `,
  ]);
  if (d.error && d.error.code !== UNDEFINED_TABLE) return fail("history", d.error);
  if (s.error && s.error.code !== UNDEFINED_TABLE) return fail("shares", s.error);
  return {
    decisions: (d.data ?? []).map((r) => ({
      revision: r.revision, decision: r.decision, reason: r.reason, reviewRevision: r.review_revision, decidedBy: r.decided_by, deciderName: r.name, decidedAt: iso(r.decided_at),
    })),
    shares: (s.data ?? []).map((r) => ({ reviewRevision: r.review_revision, policy: r.policy, sharedBy: r.shared_by, sharerName: r.name, sharedAt: iso(r.shared_at) })),
  };
}

/** The newest decision and share of each attempt in a batch, for the candidates table. */
export async function decisionsForBatch(sql: Db, companyId: string, batchId: string): Promise<Map<string, { decision: HiringDecision | null; sharedRevision: number | null }> | null> {
  const { data, error } = await sql.rows<{ attempt_id: string; decision: HiringDecision | null; shared: number | null }>`
    select a.id as attempt_id,
           (select d.decision from course.hiring_decisions d where d.attempt_id = a.id order by d.revision desc limit 1) as decision,
           (select max(s.review_revision) from course.result_shares s where s.attempt_id = a.id) as shared
      from course.candidate_attempts a
     where a.batch_id = ${batchId}::uuid and a.company_id = ${companyId}::uuid
  `;
  if (error) return error.code === UNDEFINED_TABLE ? new Map() : fail("batch read", error);
  return new Map((data ?? []).map((r) => [r.attempt_id, { decision: r.decision, sharedRevision: r.shared }]));
}

export type DecisionOutcome =
  | { status: "recorded"; revision: number }
  | { status: "conflict"; revision: number | null }
  | { status: "invalid" | "not_submitted" | "internal" | "refused" };

export async function recordDecision(
  sql: Db,
  r: { companyId: string; attemptId: string; actor: string; baseRevision: number; decision: HiringDecision; reason: string },
): Promise<DecisionOutcome | null> {
  const { data, error } = await sql.row<{ status: string; revision: number | null }>`
    select status, revision
      from course.record_decision(${r.companyId}::uuid, ${r.attemptId}::uuid, ${r.actor}, ${r.baseRevision}::int, ${r.decision}, ${r.reason})
  `;
  if (error) return fail("record", error);
  if (!data) return null;
  if (data.status === "recorded" && data.revision !== null) return { status: "recorded", revision: data.revision };
  if (data.status === "conflict") return { status: "conflict", revision: data.revision };
  if (data.status === "invalid" || data.status === "not_submitted" || data.status === "internal" || data.status === "refused") return { status: data.status };
  return null;
}

export type ShareOutcome =
  | { status: "shared" | "already"; reviewRevision: number; policy: "overall" | "by_area" }
  | { status: "not_reviewed" | "not_allowed" | "refused" };

export async function shareResult(sql: Db, r: { companyId: string; attemptId: string; actor: string }): Promise<ShareOutcome | null> {
  const { data, error } = await sql.row<{ status: string; review_revision: number | null; policy: string | null }>`
    select status, review_revision, policy from course.share_result(${r.companyId}::uuid, ${r.attemptId}::uuid, ${r.actor})
  `;
  if (error) return fail("share", error);
  if (!data) return null;
  if ((data.status === "shared" || data.status === "already") && data.review_revision !== null && (data.policy === "overall" || data.policy === "by_area")) {
    return { status: data.status, reviewRevision: data.review_revision, policy: data.policy };
  }
  if (data.status === "not_reviewed" || data.status === "not_allowed" || data.status === "refused") return { status: data.status };
  return null;
}

/**
 * What the candidate sees after a share: the newest share, with the review
 * revision it recorded (a later revision changes nothing until shared
 * again). Undefined when nothing has been shared. Never notes or summary.
 */
export async function sharedResultFor(sql: Db, attemptId: string): Promise<SharedResult | undefined | null> {
  const { data, error } = await sql.row<{ policy: "overall" | "by_area"; shared_at: string; total: number; max: number; scores: { title: string; points: number; max: number }[] }>`
    select s.policy, s.shared_at, r.total, r.max, r.scores
      from course.result_shares s
      join course.attempt_reviews r on r.attempt_id = s.attempt_id and r.revision = s.review_revision
     where s.attempt_id = ${attemptId}::uuid
     order by s.review_revision desc
     limit 1
  `;
  if (error) return error.code === UNDEFINED_TABLE ? undefined : fail("candidate read", error);
  if (!data) return undefined;
  return candidateResult({ policy: data.policy, sharedAt: iso(data.shared_at) }, { total: data.total, max: data.max, scores: data.scores });
}
