import "server-only";
import type { Db } from "@/lib/db/client";

/**
 * Proctoring records (0070). Candidates write only through their own link
 * and only while their attempt is open; the database decides both and, at
 * the company's limit, submits the test. Reviewers read through their
 * company. Null on a database error.
 */

export const EVENT_KINDS = [
  "fullscreen_exit", "tab_hidden", "window_blur", "copy_blocked", "paste_blocked", "context_blocked",
  "webcam_consent", "webcam_denied", "webcam_lost", "limit_submitted",
] as const;
export type EventKind = (typeof EVENT_KINDS)[number];
/** Events a candidate's page may send (limit_submitted is the database's own). */
export const CLIENT_EVENTS: readonly EventKind[] = EVENT_KINDS.filter((k) => k !== "limit_submitted");
export const WARNING_KINDS: readonly EventKind[] = ["fullscreen_exit", "tab_hidden", "window_blur"];

export const EVENT_LABEL: Record<EventKind, string> = {
  fullscreen_exit: "Left full screen",
  tab_hidden: "Switched tab or minimised",
  window_blur: "Switched to another window",
  copy_blocked: "Tried to copy",
  paste_blocked: "Tried to paste",
  context_blocked: "Tried to right-click",
  webcam_consent: "Agreed to webcam snapshots",
  webcam_denied: "Camera not allowed",
  webcam_lost: "Camera stopped",
  limit_submitted: "Submitted automatically at the warning limit",
};

const UNDEFINED = new Set(["42P01", "42703", "42883"]);
const fail = (what: string, error: { code?: string; message: string }) => {
  console.error(`proctoring ${what} failed:`, error.code, error.message);
  return null;
};

export type EventOutcome =
  | { status: "recorded"; warnings: number; limit: number | null; submitted: boolean }
  | { status: "refused" | "closed" | "too_many" };

export async function recordAttemptEvent(sql: Db, e: { attemptId: string; candidateId: string; generation: number; kind: EventKind }): Promise<EventOutcome | null> {
  const { data, error } = await sql.row<{ status: string; warnings: number | null; warn_limit: number | null; submitted: boolean }>`
    select status, warnings, warn_limit, submitted
      from course.record_attempt_event(${e.attemptId}::uuid, ${e.candidateId}::uuid, ${e.generation}::int, ${e.kind})
  `;
  if (error) return fail("event", error);
  if (!data) return null;
  if (data.status === "recorded") return { status: "recorded", warnings: data.warnings ?? 0, limit: data.warn_limit, submitted: data.submitted };
  if (data.status === "refused" || data.status === "closed" || data.status === "too_many") return { status: data.status };
  return null;
}

export const SNAPSHOT_MAX = 120;
export const SNAPSHOT_BYTES = 400_000;

/**
 * Records a stored snapshot for this link's open attempt, when the company
 * has webcam snapshots on and the attempt has room. False when refused.
 */
export async function addSnapshot(sql: Db, s: { attemptId: string; candidateId: string; generation: number; key: string; bytes: number }): Promise<boolean | null> {
  const { data, error } = await sql.row<{ id: string }>`
    insert into course.attempt_snapshots (attempt_id, company_id, storage_key, bytes)
    select t.id, t.company_id, ${s.key}, ${s.bytes}::int
      from course.candidate_attempts t
      join course.batch_candidates c on c.id = t.candidate_id and c.batch_id = t.batch_id
      join course.hiring_batches b on b.id = t.batch_id and b.company_id = t.company_id
      join course.company_test_settings x on x.company_id = t.company_id and x.item_slug = b.item and x.proctor_webcam
     where t.id = ${s.attemptId}::uuid and t.candidate_id = ${s.candidateId}::uuid and c.link_generation = ${s.generation}::int
       and c.status = 'active' and b.status = 'sent' and t.submitted_at is null and now() <= t.deadline_at + interval '30 seconds'
       and (select count(*) from course.attempt_snapshots n where n.attempt_id = t.id) < ${SNAPSHOT_MAX}
    on conflict (storage_key) do nothing
    returning id
  `;
  if (error) return fail("snapshot", error);
  return !!data;
}

export interface AttemptProctoring {
  events: { kind: EventKind; at: string }[];
  snapshots: { id: string; at: string }[];
}

/** One attempt's events and snapshots, for this company's reviewers. Empty before 0070. */
export async function attemptProctoring(sql: Db, companyId: string, attemptId: string): Promise<AttemptProctoring | null> {
  const [e, s] = await Promise.all([
    sql.rows<{ kind: EventKind; at: string }>`
      select kind, at from course.attempt_events where attempt_id = ${attemptId}::uuid and company_id = ${companyId}::uuid order by at
    `,
    sql.rows<{ id: string; taken_at: string }>`
      select id, taken_at from course.attempt_snapshots where attempt_id = ${attemptId}::uuid and company_id = ${companyId}::uuid order by taken_at
    `,
  ]);
  if (e.error) return UNDEFINED.has(e.error.code ?? "") ? { events: [], snapshots: [] } : fail("read", e.error);
  if (s.error) return UNDEFINED.has(s.error.code ?? "") ? { events: e.data ?? [], snapshots: [] } : fail("snapshots read", s.error);
  return { events: e.data ?? [], snapshots: (s.data ?? []).map((r) => ({ id: r.id, at: r.taken_at })) };
}

/** Warnings per attempt across a batch, for the candidates table. */
export async function warningsForBatch(sql: Db, companyId: string, batchId: string): Promise<Map<string, number> | null> {
  const { data, error } = await sql.rows<{ attempt_id: string; n: number }>`
    select e.attempt_id, count(*)::int as n
      from course.attempt_events e
      join course.candidate_attempts a on a.id = e.attempt_id and a.company_id = e.company_id
     where a.batch_id = ${batchId}::uuid and e.company_id = ${companyId}::uuid and e.kind in ('fullscreen_exit', 'tab_hidden', 'window_blur')
     group by e.attempt_id
  `;
  if (error) return UNDEFINED.has(error.code ?? "") ? new Map() : fail("batch warnings", error);
  return new Map((data ?? []).map((r) => [r.attempt_id, r.n]));
}

/** A snapshot of this company's candidate, for an authorised view. Undefined when it isn't one. */
export async function snapshotFor(sql: Db, s: { companyId: string; batchId: string; candidateId: string; id: string }): Promise<string | undefined | null> {
  const { data, error } = await sql.row<{ storage_key: string }>`
    select n.storage_key
      from course.attempt_snapshots n
      join course.candidate_attempts a on a.id = n.attempt_id and a.company_id = n.company_id
     where n.id = ${s.id}::uuid and a.company_id = ${s.companyId}::uuid and a.batch_id = ${s.batchId}::uuid and a.candidate_id = ${s.candidateId}::uuid
  `;
  if (error) return fail("snapshot read", error);
  return data?.storage_key ?? undefined;
}
