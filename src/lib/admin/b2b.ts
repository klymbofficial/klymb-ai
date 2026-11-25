import "server-only";
import { isOwnerEmail, isSalesManager } from "@/lib/admin/access";
import { getSalesAdmin } from "@/lib/admin/auth";
import { db } from "@/lib/db/client";
import { attention, isOpenStage, quarterOf, weighted, B2B_STAGES, type B2BStage } from "@/lib/b2b";
import { istToday } from "@/lib/sales";

/**
 * B2B reads. Owners and sales managers only: every function checks first,
 * because the connection can read the whole course schema.
 */

export interface DealRow {
  id: string;
  created_at: string;
  title: string;
  stage: B2BStage;
  stage_changed_at: string;
  signed_at: string | null;
  owner_email: string | null;
  company_id: string;
  company_name: string;
  contact_name: string | null;
  contact_designation: string | null;
  seats: number;
  value_inr: number;
  expected_close: string | null;
  next_step: string | null;
  next_step_date: string | null;
  status_note: string | null;
  lost_reason: string | null;
  payment_status: string;
  last_activity_at: string | null;
  /** Who on the team last reached out. */
  last_by: string | null;
  activities: number;
  /** Document kinds neither signed nor marked not needed. */
  pending_docs: string[];
  workspace_slug: string | null;
}

export interface Deal extends DealRow {
  source: string;
  courses: string | null;
  price_per_seat: number | null;
  discount_inr: number;
  payment_terms: string | null;
  po_number: string | null;
  delivery_mode: string | null;
  cohort_start: string | null;
  renewal_date: string | null;
  lost_note: string | null;
  notes: string | null;
  created_by: string | null;
}

export interface Company {
  id: string;
  created_at: string;
  name: string;
  industry: string | null;
  employees: string | null;
  city: string | null;
  website: string | null;
  linkedin: string | null;
  gstin: string | null;
  billing_address: string | null;
  notes: string | null;
  company_id: string | null;
  workspace_slug: string | null;
  workspace_seats: number | null;
  workspace_members: number | null;
}

export interface Contact {
  id: string;
  company_id: string;
  name: string;
  designation: string | null;
  buying_role: string;
  email: string | null;
  phone: string | null;
  linkedin: string | null;
  is_primary: boolean;
}

export interface DealDoc {
  kind: string;
  status: string;
  version: string | null;
  sent_on: string | null;
  signed_on: string | null;
  client_signer: string | null;
  link: string | null;
  updated_at: string;
  updated_by: string | null;
}

export interface Activity {
  id: string;
  created_at: string;
  by_email: string;
  kind: string;
  replied: boolean;
  attendees: string | null;
  note: string | null;
}

export interface Task {
  id: string;
  created_at: string;
  title: string;
  due: string | null;
  assignee_email: string | null;
  done_at: string | null;
  done_by: string | null;
}

export interface StageMove { from_stage: string | null; to_stage: string; by_email: string; at: string }

export interface Person { email: string; name: string | null }

export interface DealFilter {
  stage?: string;
  owner?: string;
  /** An email: deals that person has reached out on. "none": nobody has yet. */
  by?: string;
  /** Next step due today or overdue. */
  due?: boolean;
  /** "stale" | "no_next" | "docs". */
  flag?: string;
  q?: string;
  /** Open stages only (no signed or lost). */
  open?: boolean;
  company?: string;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** The people who can own a deal: owners and sales managers who are admins. */
export async function getB2BPeople(): Promise<Person[]> {
  if (!(await getSalesAdmin())) return [];
  const sql = db();
  if (!sql) return [];
  const { data } = await sql.rows<Person>`select email, name from course.admin_users order by coalesce(name, email)`;
  return (data ?? []).filter((a) => isOwnerEmail(a.email) || isSalesManager(a.email));
}

export async function getDeals(f: DealFilter = {}): Promise<DealRow[]> {
  if (!(await getSalesAdmin())) return [];
  const sql = db();
  if (!sql) return [];
  const today = istToday();
  const q = f.q?.trim() ? `%${f.q.trim().toLowerCase().replace(/[%_\\]/g, (c) => `\\${c}`)}%` : null;
  const stage = f.stage && B2B_STAGES.some((s) => s.key === f.stage) ? f.stage : null;
  const owner = f.owner === "none" ? "" : f.owner?.trim().toLowerCase() || null;
  const by = f.by?.trim().toLowerCase() || null;
  const company = f.company && UUID.test(f.company) ? f.company : null;
  const { data, error } = await sql.rows<DealRow & { reached_by: string[] | null }>`
    select d.id, d.created_at, d.title, d.stage, d.stage_changed_at, d.signed_at, d.owner_email,
           d.company_id, c.name as company_name, p.name as contact_name, p.designation as contact_designation,
           d.seats, d.value_inr, d.expected_close::text as expected_close, d.next_step,
           d.next_step_date::text as next_step_date, d.status_note, d.lost_reason, d.payment_status,
           a.last_at as last_activity_at, a.last_by, coalesce(a.n, 0)::int as activities, a.reached_by,
           coalesce(docs.pending, '{}') as pending_docs, w.slug as workspace_slug
      from course.b2b_deals d
      join course.b2b_companies c on c.id = d.company_id
      left join course.companies w on w.id = c.company_id
      left join course.b2b_contacts p on p.company_id = c.id and p.is_primary
      left join lateral (
        select count(*) filter (where kind <> 'note') as n, max(created_at) as last_at,
               (array_agg(by_email order by created_at desc) filter (where kind <> 'note'))[1] as last_by,
               array_agg(distinct by_email) filter (where kind <> 'note') as reached_by
          from course.b2b_activities where deal_id = d.id
      ) a on true
      left join lateral (
        select array_agg(kind order by kind) as pending from course.b2b_deal_docs
         where deal_id = d.id and status not in ('signed', 'not_needed')
      ) docs on true
     where (${stage}::text is null or d.stage = ${stage})
       and (${owner}::text is null or coalesce(d.owner_email, '') = ${owner})
       and (${company}::uuid is null or d.company_id = ${company}::uuid)
       and (${!!f.open}::boolean = false or d.stage not in ('signed', 'lost'))
       and (${by}::text is null
            or (${by} = 'none' and coalesce(a.n, 0) = 0)
            or ${by} = any(coalesce(a.reached_by, '{}'::text[])))
       and (${!!f.due}::boolean = false or (d.next_step_date <= ${today}::date and d.stage not in ('signed', 'lost')))
       and (${q}::text is null or lower(d.title) like ${q} or lower(c.name) like ${q}
            or lower(coalesce(p.name, '')) like ${q} or lower(coalesce(d.courses, '')) like ${q})
     order by case when d.stage in ('signed', 'lost') then 1 else 0 end, d.next_step_date asc nulls last, d.value_inr desc
     limit 1000
  `;
  if (error) {
    console.error("b2b deals read failed:", error.code, error.message);
    return [];
  }
  // reached_by stays on the rows; it is only used by the filter above.
  let rows: DealRow[] = data ?? [];
  if (f.flag === "stale") rows = rows.filter((d) => attention(d, today).stale);
  else if (f.flag === "no_next") rows = rows.filter((d) => attention(d, today).noNextStep);
  else if (f.flag === "docs") rows = rows.filter((d) => isOpenStage(d.stage) && d.pending_docs.length > 0);
  return rows;
}

export interface DealPage {
  deal: Deal;
  company: Company;
  contacts: Contact[];
  docs: DealDoc[];
  activities: Activity[];
  tasks: Task[];
  history: StageMove[];
  /** Other deals with the same company. */
  siblings: { id: string; title: string; stage: string; value_inr: number }[];
}

export async function getDeal(id: string): Promise<DealPage | null> {
  if (!(await getSalesAdmin())) return null;
  if (!UUID.test(id)) return null;
  const sql = db();
  if (!sql) return null;
  const [list, extra] = await Promise.all([
    getDealsByIds([id]),
    sql.row<Omit<Deal, keyof DealRow>>`
      select source, courses, price_per_seat, discount_inr, payment_terms, po_number, delivery_mode,
             cohort_start::text as cohort_start, renewal_date::text as renewal_date, lost_note, notes, created_by
        from course.b2b_deals where id = ${id}`,
  ]);
  const row = list[0];
  if (!row || !extra.data) return null;
  const [company, contacts, docs, activities, tasks, history, siblings] = await Promise.all([
    getCompanyRow(row.company_id),
    sql.rows<Contact>`select id, company_id, name, designation, buying_role, email, phone, linkedin, is_primary
                        from course.b2b_contacts where company_id = ${row.company_id} order by is_primary desc, created_at`,
    sql.rows<DealDoc>`select kind, status, version, sent_on::text as sent_on, signed_on::text as signed_on, client_signer, link, updated_at, updated_by
                        from course.b2b_deal_docs where deal_id = ${id}`,
    sql.rows<Activity>`select id, created_at, by_email, kind, replied, attendees, note
                         from course.b2b_activities where deal_id = ${id} order by created_at desc limit 300`,
    sql.rows<Task>`select id, created_at, title, due::text as due, assignee_email, done_at, done_by
                     from course.b2b_tasks where deal_id = ${id} order by done_at is not null, due asc nulls last, created_at`,
    sql.rows<StageMove>`select from_stage, to_stage, by_email, at from course.b2b_stage_history where deal_id = ${id} order by at desc limit 100`,
    sql.rows<{ id: string; title: string; stage: string; value_inr: number }>`
      select id, title, stage, value_inr from course.b2b_deals where company_id = ${row.company_id} and id <> ${id} order by created_at desc`,
  ]);
  if (!company) return null;
  return {
    deal: { ...row, ...extra.data },
    company,
    contacts: contacts.data ?? [],
    docs: docs.data ?? [],
    activities: activities.data ?? [],
    tasks: tasks.data ?? [],
    history: history.data ?? [],
    siblings: siblings.data ?? [],
  };
}

async function getDealsByIds(ids: string[]): Promise<DealRow[]> {
  const sql = db();
  if (!sql) return [];
  const { data, error } = await sql.rows<DealRow>`
    select d.id, d.created_at, d.title, d.stage, d.stage_changed_at, d.signed_at, d.owner_email,
           d.company_id, c.name as company_name, p.name as contact_name, p.designation as contact_designation,
           d.seats, d.value_inr, d.expected_close::text as expected_close, d.next_step,
           d.next_step_date::text as next_step_date, d.status_note, d.lost_reason, d.payment_status,
           (select max(created_at) from course.b2b_activities a where a.deal_id = d.id) as last_activity_at,
           (select by_email from course.b2b_activities a where a.deal_id = d.id and a.kind <> 'note' order by created_at desc limit 1) as last_by,
           (select count(*)::int from course.b2b_activities a where a.deal_id = d.id and a.kind <> 'note') as activities,
           coalesce((select array_agg(kind order by kind) from course.b2b_deal_docs x
                      where x.deal_id = d.id and x.status not in ('signed', 'not_needed')), '{}') as pending_docs,
           w.slug as workspace_slug
      from course.b2b_deals d
      join course.b2b_companies c on c.id = d.company_id
      left join course.companies w on w.id = c.company_id
      left join course.b2b_contacts p on p.company_id = c.id and p.is_primary
     where d.id = any(${ids}::uuid[])
  `;
  if (error) console.error("b2b deal read failed:", error.code, error.message);
  return data ?? [];
}

async function getCompanyRow(id: string): Promise<Company | null> {
  const sql = db();
  if (!sql) return null;
  const { data } = await sql.row<Company>`
    select c.id, c.created_at, c.name, c.industry, c.employees, c.city, c.website, c.linkedin, c.gstin,
           c.billing_address, c.notes, c.company_id, w.slug as workspace_slug, w.seat_count as workspace_seats,
           (select count(*)::int from course.company_members m where m.company_id = w.id and m.removed_at is null) as workspace_members
      from course.b2b_companies c
      left join course.companies w on w.id = c.company_id
     where c.id = ${id}
  `;
  return data ?? null;
}

export interface CompanyRow extends Company {
  deals: number;
  open_value: number;
  signed_value: number;
  contact_name: string | null;
}

export async function getCompanies(q?: string): Promise<CompanyRow[]> {
  if (!(await getSalesAdmin())) return [];
  const sql = db();
  if (!sql) return [];
  const like = q?.trim() ? `%${q.trim().toLowerCase().replace(/[%_\\]/g, (c) => `\\${c}`)}%` : null;
  const { data, error } = await sql.rows<CompanyRow>`
    select c.id, c.created_at, c.name, c.industry, c.employees, c.city, c.website, c.linkedin, c.gstin,
           c.billing_address, c.notes, c.company_id, w.slug as workspace_slug, w.seat_count as workspace_seats,
           null::int as workspace_members,
           (select count(*)::int from course.b2b_deals d where d.company_id = c.id) as deals,
           coalesce((select sum(value_inr)::int from course.b2b_deals d where d.company_id = c.id and d.stage not in ('signed', 'lost')), 0) as open_value,
           coalesce((select sum(value_inr)::int from course.b2b_deals d where d.company_id = c.id and d.stage = 'signed'), 0) as signed_value,
           (select name from course.b2b_contacts p where p.company_id = c.id and p.is_primary) as contact_name
      from course.b2b_companies c
      left join course.companies w on w.id = c.company_id
     where ${like}::text is null or lower(c.name) like ${like} or lower(coalesce(c.city, '')) like ${like}
     order by c.name
     limit 1000
  `;
  if (error) console.error("b2b companies read failed:", error.code, error.message);
  return data ?? [];
}

export async function getCompany(id: string): Promise<{ company: Company; contacts: Contact[]; deals: DealRow[] } | null> {
  if (!(await getSalesAdmin())) return null;
  if (!UUID.test(id)) return null;
  const sql = db();
  if (!sql) return null;
  const [company, contacts, deals] = await Promise.all([
    getCompanyRow(id),
    sql.rows<Contact>`select id, company_id, name, designation, buying_role, email, phone, linkedin, is_primary
                        from course.b2b_contacts where company_id = ${id} order by is_primary desc, created_at`,
    getDeals({ company: id }),
  ]);
  if (!company) return null;
  return { company, contacts: contacts.data ?? [], deals };
}

/** For the new-deal form: pick an existing company. */
export async function getCompanyChoices(): Promise<{ id: string; name: string }[]> {
  if (!(await getSalesAdmin())) return [];
  const sql = db();
  if (!sql) return [];
  const { data } = await sql.rows<{ id: string; name: string }>`select id, name from course.b2b_companies order by name limit 2000`;
  return data ?? [];
}

// ── The overview, for the sales head ─────────────────────────

export interface StageSummary { stage: B2BStage; deals: number; value: number; weighted: number }
export interface OwnerSummary { email: string; open: number; openValue: number; weighted: number; won: number; wonValue: number; lost: number; winRate: number | null; avgCycleDays: number | null }

export interface B2BOverview {
  ready: boolean;
  today: string;
  openValue: number;
  weightedValue: number;
  openDeals: number;
  month: { signed: number; signedValue: number; target: number | null; forecast: number; forecastDeals: number };
  quarter: { label: string; signed: number; signedValue: number; forecast: number; forecastDeals: number };
  winRate: number | null;
  avgCycleDays: number | null;
  stages: StageSummary[];
  owners: OwnerSummary[];
  overdue: DealRow[];
  stale: DealRow[];
  noNextStep: DealRow[];
  docsPending: DealRow[];
  closingSoon: DealRow[];
  biggest: DealRow[];
  tasksDue: { id: string; title: string; due: string; deal_id: string; deal_title: string; assignee_email: string | null }[];
  recent: { at: string; deal_id: string; deal_title: string; company_name: string; by_email: string; kind: string; note: string | null }[];
}

const pct = (a: number, b: number) => (b ? Math.round((a / b) * 100) : null);

/**
 * Everything on the B2B overview from one read of every deal: B2B volume is
 * tens or hundreds of deals, so the sums are done here, where they are easy
 * to follow, rather than in SQL.
 */
export async function getB2BOverview(): Promise<B2BOverview | null> {
  if (!(await getSalesAdmin())) return null;
  const sql = db();
  const today = istToday();
  const empty: B2BOverview = {
    ready: false, today, openValue: 0, weightedValue: 0, openDeals: 0,
    month: { signed: 0, signedValue: 0, target: null, forecast: 0, forecastDeals: 0 },
    quarter: { label: "", signed: 0, signedValue: 0, forecast: 0, forecastDeals: 0 },
    winRate: null, avgCycleDays: null, stages: [], owners: [], overdue: [], stale: [], noNextStep: [], docsPending: [], closingSoon: [], biggest: [], tasksDue: [], recent: [],
  };
  if (!sql) return empty;

  const monthStart = `${today.slice(0, 7)}-01`;
  const next = new Date(`${monthStart}T00:00:00Z`);
  next.setUTCMonth(next.getUTCMonth() + 1);
  const monthEnd = next.toISOString().slice(0, 10);
  const q = quarterOf(today);
  const qLabel = (() => {
    const s = new Date(`${q.start}T00:00:00Z`);
    const e = new Date(`${q.end}T00:00:00Z`);
    e.setUTCDate(e.getUTCDate() - 1);
    const f = (d: Date) => d.toLocaleDateString("en-IN", { month: "short", timeZone: "UTC" });
    return `${f(s)}–${f(e)} ${e.getUTCFullYear()}`;
  })();

  const [deals, target, tasks, recent] = await Promise.all([
    getDeals(),
    sql.row<{ b2b: number }>`select b2b from course.sales_targets where month = ${monthStart}::date`,
    sql.rows<B2BOverview["tasksDue"][number]>`
      select t.id, t.title, t.due::text as due, t.deal_id, d.title as deal_title, t.assignee_email
        from course.b2b_tasks t join course.b2b_deals d on d.id = t.deal_id
       where t.done_at is null and t.due <= ${today}::date
       order by t.due limit 50`,
    sql.rows<B2BOverview["recent"][number]>`
      select a.created_at as at, a.deal_id, d.title as deal_title, c.name as company_name, a.by_email, a.kind, a.note
        from course.b2b_activities a
        join course.b2b_deals d on d.id = a.deal_id
        join course.b2b_companies c on c.id = d.company_id
       order by a.created_at desc limit 15`,
  ]);
  // The tables only exist once 0069 has run.
  if (tasks.error?.code === "42P01") return empty;

  const signedDay = (d: DealRow) => (d.signed_at ? new Date(d.signed_at).toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" }) : null);
  const open = deals.filter((d) => isOpenStage(d.stage));
  const won = deals.filter((d) => d.stage === "signed");
  const lost = deals.filter((d) => d.stage === "lost");
  const sum = (xs: DealRow[], f: (d: DealRow) => number) => xs.reduce((a, d) => a + f(d), 0);
  const cycle = (xs: DealRow[]) => {
    const days = xs.filter((d) => d.signed_at).map((d) => (Date.parse(d.signed_at!) - Date.parse(d.created_at)) / 86_400_000);
    return days.length ? Math.round(days.reduce((a, b) => a + b, 0) / days.length) : null;
  };
  const inRange = (day: string | null, s: string, e: string) => day !== null && day >= s && day < e;
  const wonIn = (s: string, e: string) => won.filter((d) => inRange(signedDay(d), s, e));
  // Forecast: open deals expected to close in the period, at their win chance.
  // A deal whose close date has passed still counts in the current period.
  const closingIn = (e: string) => open.filter((d) => d.expected_close !== null && d.expected_close < e && d.stage !== "on_hold");

  const owners = new Map<string, DealRow[]>();
  for (const d of deals) if (d.owner_email) owners.set(d.owner_email, [...(owners.get(d.owner_email) ?? []), d]);

  const flags = open.map((d) => ({ d, a: attention(d, today) }));
  return {
    ready: true,
    today,
    openValue: sum(open, (d) => d.value_inr),
    weightedValue: sum(open, (d) => weighted(d.value_inr, d.stage)),
    openDeals: open.length,
    month: {
      signed: wonIn(monthStart, monthEnd).length,
      signedValue: sum(wonIn(monthStart, monthEnd), (d) => d.value_inr),
      target: target.data?.b2b ?? null,
      forecast: sum(closingIn(monthEnd), (d) => weighted(d.value_inr, d.stage)),
      forecastDeals: closingIn(monthEnd).length,
    },
    quarter: {
      label: qLabel,
      signed: wonIn(q.start, q.end).length,
      signedValue: sum(wonIn(q.start, q.end), (d) => d.value_inr),
      forecast: sum(closingIn(q.end), (d) => weighted(d.value_inr, d.stage)),
      forecastDeals: closingIn(q.end).length,
    },
    winRate: pct(won.length, won.length + lost.length),
    avgCycleDays: cycle(won),
    stages: B2B_STAGES.map((s) => {
      const xs = deals.filter((d) => d.stage === s.key);
      return { stage: s.key, deals: xs.length, value: sum(xs, (d) => d.value_inr), weighted: sum(xs, (d) => weighted(d.value_inr, d.stage)) };
    }),
    owners: [...owners].map(([email, xs]) => {
      const o = xs.filter((d) => isOpenStage(d.stage));
      const w = xs.filter((d) => d.stage === "signed");
      const l = xs.filter((d) => d.stage === "lost");
      return {
        email, open: o.length, openValue: sum(o, (d) => d.value_inr), weighted: sum(o, (d) => weighted(d.value_inr, d.stage)),
        won: w.length, wonValue: sum(w, (d) => d.value_inr), lost: l.length, winRate: pct(w.length, w.length + l.length), avgCycleDays: cycle(w),
      };
    }).sort((a, b) => b.weighted - a.weighted),
    overdue: flags.filter((x) => x.a.overdue).map((x) => x.d),
    stale: flags.filter((x) => x.a.stale).map((x) => x.d),
    noNextStep: flags.filter((x) => x.a.noNextStep).map((x) => x.d),
    // Waiting on paperwork: the deals in that stage, with what is still open.
    docsPending: open.filter((d) => d.stage === "document_needed"),
    closingSoon: open.filter((d) => d.expected_close !== null && d.expected_close < monthEnd && d.stage !== "on_hold")
      .sort((a, b) => (a.expected_close! < b.expected_close! ? -1 : 1)),
    biggest: [...open].sort((a, b) => b.value_inr - a.value_inr).slice(0, 8),
    tasksDue: tasks.data ?? [],
    recent: recent.data ?? [],
  };
}
