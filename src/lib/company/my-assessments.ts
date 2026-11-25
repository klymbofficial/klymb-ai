import "server-only";
import type { Db } from "@/lib/db/client";

/**
 * "My assessments" (U11): the tests a company member was sent, matched by
 * their signed-in work email inside this company (U11_PROPOSAL D2 = A).
 * Only sent rounds; a draft isn't an invitation yet. Every query takes the
 * company and the email from the session, never from the address.
 */

const UNDEFINED_TABLE = "42P01";
const fail = (what: string, error: { code?: string; message: string }) => {
  console.error(`my assessments ${what} failed:`, error.code, error.message);
  return null;
};

export interface MyInvitation {
  id: string;
  generation: number;
  title: string;
  role: string;
  purpose: "hiring" | "internal";
  minutes: number;
  extraMinutes: number;
  lastStartAt: string | null;
  opensAt: string;
  closesAt: string;
  timeZone: string;
  status: "active" | "cancelled";
  batchStatus: "sent" | "cancelled";
  startedAt: string | null;
  deadlineAt: string | null;
  submittedAt: string | null;
  shared: boolean;
}

/** True when this member has at least one sent invitation here: the sidebar shows My assessments (D6 = A). */
export async function hasMyInvitations(sql: Db, companyId: string, email: string): Promise<boolean> {
  const { data, error } = await sql.scalar<boolean>`
    select exists (
      select 1 from course.batch_candidates c
        join course.hiring_batches b on b.id = c.batch_id and b.company_id = c.company_id
       where c.company_id = ${companyId}::uuid and c.email = lower(${email}) and b.status <> 'draft'
    )
  `;
  if (error) { if (error.code !== UNDEFINED_TABLE) fail("exists", error); return false; }
  return !!data;
}

/** Every sent invitation to this member in this company, newest first. */
export async function myInvitations(sql: Db, companyId: string, email: string): Promise<MyInvitation[] | null> {
  const { data, error } = await sql.rows<{
    id: string; link_generation: number; title: string; role: string; purpose: "hiring" | "internal" | null; minutes: number; extra_minutes: number;
    last_start_at: string | null; opens_at: string; closes_at: string; time_zone: string; status: "active" | "cancelled"; batch_status: "sent" | "cancelled";
    started_at: string | null; deadline_at: string | null; submitted_at: string | null; shared: boolean;
  }>`
    select c.id, c.link_generation, v.title, b.role, b.purpose, v.minutes, c.extra_minutes, c.last_start_at, b.opens_at, b.closes_at, b.time_zone,
           c.status, b.status as batch_status, a.started_at, a.deadline_at, a.submitted_at,
           exists (select 1 from course.result_shares s where s.attempt_id = a.id) as shared
      from course.batch_candidates c
      join course.hiring_batches b on b.id = c.batch_id and b.company_id = c.company_id
      join course.assessment_versions v on v.id = b.version_id
      left join course.candidate_attempts a on a.candidate_id = c.id and a.attempt_no = 1
     where c.company_id = ${companyId}::uuid and c.email = lower(${email}) and b.status <> 'draft'
     order by coalesce(b.sent_at, b.created_at) desc
     limit 200
  `;
  if (error) return error.code === UNDEFINED_TABLE ? [] : fail("list", error);
  const iso = (d: string | null) => (d ? new Date(d).toISOString() : null);
  return (data ?? []).map((r) => ({
    id: r.id, generation: r.link_generation, title: r.title, role: r.role, purpose: r.purpose ?? "hiring", minutes: r.minutes, extraMinutes: r.extra_minutes,
    lastStartAt: iso(r.last_start_at), opensAt: iso(r.opens_at)!, closesAt: iso(r.closes_at)!, timeZone: r.time_zone, status: r.status, batchStatus: r.batch_status,
    startedAt: iso(r.started_at), deadlineAt: iso(r.deadline_at), submittedAt: iso(r.submitted_at), shared: r.shared,
  }));
}

/** One invitation, only when it is this member's own, in this company, in a sent round. Undefined otherwise. */
export async function myInvitation(sql: Db, companyId: string, email: string, id: string): Promise<{ id: string; generation: number } | undefined | null> {
  const { data, error } = await sql.row<{ id: string; link_generation: number }>`
    select c.id, c.link_generation
      from course.batch_candidates c
      join course.hiring_batches b on b.id = c.batch_id and b.company_id = c.company_id
     where c.id = ${id}::uuid and c.company_id = ${companyId}::uuid and c.email = lower(${email}) and b.status <> 'draft'
  `;
  if (error) return fail("one", error);
  return data ? { id: data.id, generation: data.link_generation } : undefined;
}
