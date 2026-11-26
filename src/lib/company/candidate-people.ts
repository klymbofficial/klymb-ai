import "server-only";
import type { CompanyMember } from "@/lib/company/access";
import type { Tone } from "@/components/company/HiringParts";
import { DELIVERY_LABEL, formatInZone, type Delivery } from "@/lib/company/batch-rules";
import { DECISION_LABEL, scoreText, type HiringDecision } from "@/lib/company/review-rules";
import type { Db } from "@/lib/db/client";

/**
 * The People page (user, 26 Nov): everyone this company has invited to an
 * external test, so people outside the company. One row per email, with
 * every test they were sent. Internal rounds (colleagues) and drafts are left
 * out. One read for the whole company, so it stays quick however many tests
 * there are; the test's own Candidates tab still has the full detail and the
 * actions. No new tables.
 */

export interface CandidateTest {
  item: string;
  title: string;
  round: string;
  invitation: { label: string; tone: Tone };
  status: { label: string; tone: Tone };
  when: string;
  score: string | null;
  decision: { label: string; tone: Tone } | null;
  /** The attempt's page, once they've started; otherwise the test's Candidates tab. */
  href: string;
}

export interface CandidatePerson {
  email: string;
  name: string;
  /** Newest invitation first. */
  tests: CandidateTest[];
}

interface Row {
  id: string;
  name: string;
  email: string;
  item: string;
  title: string;
  role: string;
  time_zone: string;
  closes_at: string;
  batch_status: "sent" | "cancelled";
  status: "active" | "cancelled";
  delivery: Delivery;
  started_at: string | null;
  submitted_at: string | null;
  total: number | null;
  max: number | null;
  decision: HiringDecision | null;
}

const DELIVERY_TONE: Record<Delivery, Tone> = { pending: "grey", sending: "grey", sent: "blue", failed: "red", skipped: "amber" };
const DECISION_TONE: Record<HiringDecision, Tone> = { shortlisted: "green", not_shortlisted: "red", on_hold: "amber" };

export async function loadCandidatePeople(sql: Db, member: CompanyMember, now: Date): Promise<CandidatePerson[] | null> {
  const { data, error } = await sql.rows<Row>`
    select c.id, c.name, c.email, b.item, coalesce(v.title, ci.title, b.item) as title, b.role, b.time_zone, b.closes_at,
           b.status as batch_status, c.status, c.delivery,
           a.started_at, a.submitted_at, r.total, r.max,
           (select d.decision from course.hiring_decisions d where d.attempt_id = a.id order by d.revision desc limit 1) as decision
      from course.batch_candidates c
      join course.hiring_batches b on b.id = c.batch_id and b.company_id = c.company_id
      left join course.assessment_versions v on v.id = b.version_id
      left join course.catalog_items ci on ci.slug = b.item
      left join course.candidate_attempts a on a.candidate_id = c.id and a.batch_id = c.batch_id and a.attempt_no = 1
      left join lateral (
        select rv.total, rv.max from course.attempt_reviews rv where rv.attempt_id = a.id order by rv.revision desc limit 1
      ) r on true
     where c.company_id = ${member.companyId}::uuid and b.purpose = 'hiring' and b.status <> 'draft'
     order by b.created_at desc, c.name
     limit 5000
  `;
  if (error) return error.code === "42P01" ? [] : null;

  const base = `/org/${member.companySlug}/assessments`;
  const byEmail = new Map<string, CandidatePerson>();
  for (const c of data ?? []) {
    const cancelled = c.status === "cancelled" || c.batch_status === "cancelled";
    const status: CandidateTest["status"] =
      c.submitted_at ? (c.total !== null ? { label: "Reviewed", tone: "green" } : { label: "Review pending", tone: "amber" })
      : c.started_at ? { label: "In progress", tone: "blue" }
      : cancelled ? { label: "Cancelled", tone: "grey" }
      : new Date(c.closes_at) < now ? { label: "Start passed", tone: "amber" }
      : { label: "Not started", tone: "grey" };
    const when = c.submitted_at ? `Submitted ${formatInZone(c.submitted_at, c.time_zone)}`
      : c.started_at ? `Started ${formatInZone(c.started_at, c.time_zone)}`
      : cancelled ? "—"
      : `Closes ${formatInZone(c.closes_at, c.time_zone)}`;
    const person = byEmail.get(c.email) ?? { email: c.email, name: c.name, tests: [] };
    person.tests.push({
      item: c.item,
      title: c.title,
      round: `${c.role} · closes ${formatInZone(c.closes_at, c.time_zone)}`,
      invitation: { label: DELIVERY_LABEL[c.delivery], tone: DELIVERY_TONE[c.delivery] },
      status,
      when,
      score: c.total !== null && c.max !== null ? scoreText(c.total, c.max) : null,
      decision: c.submitted_at && c.decision ? { label: DECISION_LABEL[c.decision], tone: DECISION_TONE[c.decision] } : null,
      href: c.started_at ? `${base}/${c.item}/candidates/${c.id}` : `${base}/${c.item}/candidates`,
    });
    byEmail.set(c.email, person);
  }
  return [...byEmail.values()].sort((a, b) => a.name.localeCompare(b.name, "en", { sensitivity: "base" }));
}
