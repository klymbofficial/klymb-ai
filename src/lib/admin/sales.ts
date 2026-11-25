import "server-only";
import { isOwnerEmail } from "@/lib/admin/access";
import { getSalesAdmin, getSalesUser } from "@/lib/admin/auth";
import { db } from "@/lib/db/client";
import { canWorkLead, HOT_STAGES, istToday, PAID_COUNTED_FROM, period, type Channel, type PeriodKey, type Source, type Stage } from "@/lib/sales";

/**
 * Sales reads. Every function checks the admin first: the connection can read
 * the whole course schema, so authorisation lives here.
 *
 * "Paid" is never typed in by hand. A lead counts as paid when a paid (or
 * later refunded, which here means refunded for finishing) payment exists for
 * its email, or for the email on a registration or System Design
 * pre-registration made with its phone number.
 */

export interface Lead {
  id: string;
  created_at: string;
  name: string;
  phone: string | null;
  email: string | null;
  kind: "b2c" | "b2b";
  source: Source;
  source_detail: string | null;
  org: string | null;
  stage: Stage;
  stage_changed_at: string;
  owner_email: string | null;
  next_follow_up: string | null;
  notes: string | null;
  /** One short line beside the stage, e.g. "call after exams". */
  status_note: string | null;
  touches: number;
  last_touch_at: string | null;
  last_channel: Channel | null;
  /** Who on the team last reached out (not a message they sent us). */
  last_by: string | null;
  replied: boolean;
  paid: boolean;
}

export interface Touch {
  id: string;
  created_at: string;
  by_email: string;
  channel: Channel;
  replied: boolean;
  /** A message they sent us, synced from the WhatsApp dashboard. */
  inbound: boolean;
  note: string | null;
}

/** Someone leads can be given to: an owner, or an active rep (intern). */
export interface Owner { email: string; name: string | null; rep?: boolean }

export interface LeadFilter {
  stage?: string;
  source?: string;
  owner?: string;
  due?: boolean;
  q?: string;
  /** "none": nobody has reached out yet; an email: that person has reached out at least once. */
  by?: string;
}

export async function getOwners(): Promise<Owner[]> {
  if (!(await getSalesUser())) return [];
  const sql = db();
  if (!sql) return [];
  const [admins, reps] = await Promise.all([
    sql.rows<Owner>`select email, name from course.admin_users order by coalesce(name, email)`,
    // Before 0041_sales_reps.sql has run this fails, and there are simply no reps.
    sql.rows<Owner>`select email, name from course.sales_reps where active order by coalesce(name, email)`,
  ]);
  // Owners and active reps can open Sales, so only they can be given leads.
  const owners = (admins.data ?? []).filter((a) => isOwnerEmail(a.email));
  const taken = new Set(owners.map((o) => o.email));
  return [...owners, ...(reps.data ?? []).filter((r) => !taken.has(r.email)).map((r) => ({ ...r, rep: true }))];
}

/** Everyone who has ever been a rep, for the Team page. Owners only. */
export interface Rep { email: string; name: string | null; active: boolean; created_at: string; open: number; views7d: number }

export async function getReps(): Promise<Rep[]> {
  if (!(await getSalesAdmin())) return [];
  const sql = db();
  if (!sql) return [];
  const { data, error } = await sql.rows<Rep>`
    select r.email, r.name, r.active, r.created_at,
           (select count(*)::int from course.sales_leads l where l.owner_email = r.email and l.stage not in ('signed', 'rejected')) as open,
           (select count(*)::int from course.sales_lead_views v where v.by_email = r.email and v.viewed_at > now() - interval '7 days') as views7d
      from course.sales_reps r
     order by r.active desc, r.created_at desc
  `;
  if (error && error.code !== "42P01") console.error("sales reps read failed:", error.code, error.message);
  return data ?? [];
}

export async function getLeads(f: LeadFilter): Promise<Lead[]> {
  const user = await getSalesUser();
  if (!user) return [];
  const sql = db();
  if (!sql) return [];
  const stage = f.stage || null;
  const source = f.source || null;
  // A rep only ever sees their own leads, whatever the filter asks for.
  const owner = user.role === "rep" ? user.email : f.owner === "none" ? "" : f.owner || null;
  const due = f.due ? istToday() : null;
  const q = f.q?.trim() ? `%${f.q.trim().toLowerCase().replace(/[\\%_]/g, (c) => `\\${c}`)}%` : null;
  const qDigits = f.q?.replace(/\D/g, "") || null;
  const by = f.by === "none" ? "none" : f.by?.trim().toLowerCase() || null;

  const { data, error } = await sql.rows<Lead>`
    with ids as (
      select l.id, l.email from course.sales_leads l where l.email is not null
      union
      select l.id, lower(r.email) from course.sales_leads l
        join course.registrations r on l.phone is not null
         and right(regexp_replace(r.phone, '\\D', '', 'g'), 10) = right(l.phone, 10)
      union
      select l.id, p.email from course.sales_leads l
        join course.sd_preregistrations p on l.phone is not null
         and right(regexp_replace(p.phone, '\\D', '', 'g'), 10) = right(l.phone, 10)
    ),
    paid as (
      select distinct ids.id from ids
        join course.payments pay on lower(pay.email) = ids.email and pay.status in ('paid', 'refunded')
    )
    select l.id, l.created_at, l.name, l.phone, l.email, l.kind, l.source, l.source_detail, l.org,
           l.stage, l.stage_changed_at, l.owner_email, l.next_follow_up::text as next_follow_up, l.notes, l.status_note,
           coalesce(t.n, 0)::int as touches, t.last_at as last_touch_at, t.last_channel, t.last_by,
           coalesce(t.replied, false) as replied,
           (paid.id is not null) as paid
      from course.sales_leads l
      left join lateral (
        select count(*) filter (where not inbound) as n, max(created_at) as last_at, bool_or(replied) as replied,
               (array_agg(channel order by created_at desc))[1] as last_channel,
               (array_agg(by_email order by created_at desc) filter (where not inbound))[1] as last_by,
               array_agg(distinct by_email) filter (where not inbound) as reached_by
          from course.sales_touches where lead_id = l.id
      ) t on true
      left join paid on paid.id = l.id
     where (${stage}::text is null or l.stage = ${stage})
       and (${source}::text is null or l.source = ${source})
       and (${owner}::text is null or coalesce(l.owner_email, '') = ${owner})
       and (${by}::text is null
            or (${by} = 'none' and coalesce(t.n, 0) = 0)
            or ${by} = any(coalesce(t.reached_by, '{}'::text[])))
       and (${due}::date is null or (l.next_follow_up <= ${due}::date and l.stage not in ('signed', 'rejected')))
       and (${q}::text is null
            or lower(l.name) like ${q} or l.email like ${q} or lower(coalesce(l.org, '')) like ${q}
            or (${qDigits}::text <> '' and l.phone like '%' || ${qDigits} || '%'))
     order by l.next_follow_up asc nulls last, l.created_at desc
     limit 500
  `;
  if (error) console.error("sales leads read failed:", error.code, error.message);
  return data ?? [];
}

export async function getLead(id: string): Promise<{ lead: Lead; touches: Touch[] } | null> {
  const user = await getSalesUser();
  if (!user) return null;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const sql = db();
  if (!sql) return null;
  const all = await getLeadsByIds([id]);
  const lead = all[0];
  if (!lead || !canWorkLead(user, lead.owner_email)) return null;
  // Each lead a rep opens is recorded, so an owner can see who looked at which numbers.
  if (user.role === "rep") {
    const { error } = await sql.run`insert into course.sales_lead_views (lead_id, by_email) values (${id}, ${user.email})`;
    if (error) console.error("lead view log failed:", error.code, error.message);
  }
  const { data } = await sql.rows<Touch>`
    select id, created_at, by_email, channel, replied, inbound, note
      from course.sales_touches where lead_id = ${id} order by created_at desc limit 200
  `;
  return { lead, touches: data ?? [] };
}

async function getLeadsByIds(ids: string[]): Promise<Lead[]> {
  const sql = db();
  if (!sql) return [];
  const { data } = await sql.rows<Lead>`
    select l.id, l.created_at, l.name, l.phone, l.email, l.kind, l.source, l.source_detail, l.org,
           l.stage, l.stage_changed_at, l.owner_email, l.next_follow_up::text as next_follow_up, l.notes, l.status_note,
           (select count(*)::int from course.sales_touches t where t.lead_id = l.id and not t.inbound) as touches,
           (select max(created_at) from course.sales_touches t where t.lead_id = l.id) as last_touch_at,
           (select channel from course.sales_touches t where t.lead_id = l.id order by created_at desc limit 1) as last_channel,
           (select by_email from course.sales_touches t where t.lead_id = l.id and not t.inbound order by created_at desc limit 1) as last_by,
           exists (select 1 from course.sales_touches t where t.lead_id = l.id and t.replied) as replied,
           exists (
             select 1 from course.payments pay
              where pay.status in ('paid', 'refunded')
                and lower(pay.email) in (
                  select l.email
                  union select lower(r.email) from course.registrations r
                   where l.phone is not null and right(regexp_replace(r.phone, '\\D', '', 'g'), 10) = right(l.phone, 10)
                  union select p.email from course.sd_preregistrations p
                   where l.phone is not null and right(regexp_replace(p.phone, '\\D', '', 'g'), 10) = right(l.phone, 10)
                )
           ) as paid
      from course.sales_leads l where l.id = any(${ids}::uuid[])
  `;
  return data ?? [];
}

// ── Report ──────────────────────────────────────────────────

export interface SalesReport {
  period: ReturnType<typeof period>;
  ready: boolean;
  outreach: { total: number; prev: number; byChannel: Record<string, number> };
  conversations: { total: number; prev: number };
  newLeads: { total: number; prev: number };
  hotNow: number;
  enrolments: { total: number; prev: number; revenue: number };
  b2bSigned: { total: number; prev: number };
  target: { enrolments: number; b2b: number; hackathons: number; webinars: number } | null;
  bySource: { source: Source; leads: number; contacted: number; conversations: number; paid: number }[];
  byOwner: { email: string; touches: number; conversations: number; hot: number; due: number; open: number; signed: number }[];
  stages: Record<string, number>;
  dueToday: number;
}

const n = (v: unknown) => Number(v ?? 0);

export async function getSalesReport(key: PeriodKey): Promise<SalesReport | null> {
  if (!(await getSalesAdmin())) return null;
  const sql = db();
  const p = period(key);
  const empty: SalesReport = {
    period: p, ready: false,
    outreach: { total: 0, prev: 0, byChannel: {} }, conversations: { total: 0, prev: 0 }, newLeads: { total: 0, prev: 0 },
    hotNow: 0, enrolments: { total: 0, prev: 0, revenue: 0 }, b2bSigned: { total: 0, prev: 0 }, target: null,
    bySource: [], byOwner: [], stages: {}, dueToday: 0,
  };
  if (!sql) return empty;

  const s = p.start.toISOString(), e = p.end.toISOString(), ps = p.prevStart.toISOString(), pe = p.prevEnd.toISOString();
  const today = istToday();
  const hot = [...HOT_STAGES];

  const [touches, convo, leads, enrol, b2b, target, bySource, byOwner, stages] = await Promise.all([
    sql.rows<{ channel: string; cur: number; prev: number }>`
      select channel,
             count(*) filter (where created_at >= ${s} and created_at < ${e})::int as cur,
             count(*) filter (where created_at >= ${ps} and created_at < ${pe})::int as prev
        from course.sales_touches where not inbound and created_at >= least(${s}::timestamptz, ${ps}::timestamptz)
       group by channel`,
    sql.row<{ cur: number; prev: number }>`
      select count(distinct lead_id) filter (where replied and created_at >= ${s} and created_at < ${e})::int as cur,
             count(distinct lead_id) filter (where replied and created_at >= ${ps} and created_at < ${pe})::int as prev
        from course.sales_touches`,
    sql.row<{ cur: number; prev: number; hot: number; due: number }>`
      select count(*) filter (where created_at >= ${s} and created_at < ${e})::int as cur,
             count(*) filter (where created_at >= ${ps} and created_at < ${pe})::int as prev,
             count(*) filter (where stage = any(${hot}::text[]))::int as hot,
             count(*) filter (where next_follow_up <= ${today}::date and stage not in ('signed', 'rejected'))::int as due
        from course.sales_leads`,
    // Every paid enrolment counts, whether or not it came through a lead:
    // that is the number the board's targets are written against. Counting
    // starts at PAID_COUNTED_FROM, when the sales team started.
    sql.row<{ cur: number; prev: number; revenue: number }>`
      select count(distinct lower(email)) filter (where created_at >= ${s} and created_at < ${e})::int as cur,
             count(distinct lower(email)) filter (where created_at >= ${ps} and created_at < ${pe})::int as prev,
             coalesce(sum(coalesce(amount_inr, case when currency = 'INR' then amount else 0 end)) filter (where created_at >= ${s} and created_at < ${e}), 0)::int as revenue
        from course.payments where status in ('paid', 'refunded') and created_at >= ${PAID_COUNTED_FROM}`,
    sql.row<{ cur: number; prev: number }>`
      select count(*) filter (where signed_at >= ${s} and signed_at < ${e})::int as cur,
             count(*) filter (where signed_at >= ${ps} and signed_at < ${pe})::int as prev
        from (
          -- Deals signed in Sales › B2B, plus older B2B leads signed before it existed.
          select signed_at from course.b2b_deals where stage = 'signed'
          union all
          select signed_at from course.sales_leads where kind = 'b2b' and stage = 'signed'
        ) signed`,
    key === "mtd"
      ? sql.row<{ enrolments: number; b2b: number; hackathons: number; webinars: number }>`
          select enrolments, b2b, hackathons, webinars from course.sales_targets where month = ${p.month}::date`
      : sql.row<{ enrolments: number; b2b: number; hackathons: number; webinars: number }>`
          select sum(enrolments)::int as enrolments, sum(b2b)::int as b2b, sum(hackathons)::int as hackathons, sum(webinars)::int as webinars
            from course.sales_targets where month >= ${s}::timestamptz::date and month <= ${p.month}::date
          having count(*) > 0`,
    sql.rows<{ source: Source; leads: number; contacted: number; conversations: number; paid: number }>`
      with ids as (
        select l.id, l.email from course.sales_leads l where l.email is not null
        union
        select l.id, lower(r.email) from course.sales_leads l
          join course.registrations r on l.phone is not null
           and right(regexp_replace(r.phone, '\\D', '', 'g'), 10) = right(l.phone, 10)
        union
        select l.id, p.email from course.sales_leads l
          join course.sd_preregistrations p on l.phone is not null
           and right(regexp_replace(p.phone, '\\D', '', 'g'), 10) = right(l.phone, 10)
      ),
      paid as (
        select distinct ids.id from ids
          join course.payments pay on lower(pay.email) = ids.email and pay.status in ('paid', 'refunded')
         where pay.created_at >= ${s} and pay.created_at < ${e} and pay.created_at >= ${PAID_COUNTED_FROM}
      )
      select l.source,
             count(*) filter (where l.created_at >= ${s} and l.created_at < ${e})::int as leads,
             count(*) filter (where exists (select 1 from course.sales_touches t where t.lead_id = l.id and not t.inbound and t.created_at >= ${s} and t.created_at < ${e}))::int as contacted,
             count(*) filter (where exists (select 1 from course.sales_touches t where t.lead_id = l.id and t.replied and t.created_at >= ${s} and t.created_at < ${e}))::int as conversations,
             count(paid.id)::int as paid
        from course.sales_leads l left join paid on paid.id = l.id
       group by l.source`,
    sql.rows<{ email: string; touches: number; conversations: number; hot: number; due: number; open: number; signed: number }>`
      with t as (
        select by_email as email, count(*) filter (where not inbound)::int as touches, count(distinct lead_id) filter (where replied)::int as conversations
          from course.sales_touches where created_at >= ${s} and created_at < ${e} group by by_email
      ), o as (
        select owner_email as email,
               count(*) filter (where stage = any(${hot}::text[]))::int as hot,
               count(*) filter (where next_follow_up <= ${today}::date and stage not in ('signed', 'rejected'))::int as due,
               count(*) filter (where stage not in ('signed', 'rejected'))::int as open,
               count(*) filter (where stage = 'signed' and signed_at >= ${s} and signed_at < ${e})::int as signed
          from course.sales_leads where owner_email is not null group by owner_email
      )
      select coalesce(t.email, o.email) as email, coalesce(t.touches, 0) as touches, coalesce(t.conversations, 0) as conversations,
             coalesce(o.hot, 0) as hot, coalesce(o.due, 0) as due, coalesce(o.open, 0) as open, coalesce(o.signed, 0) as signed
        from t full join o on o.email = t.email
       order by 2 desc`,
    sql.rows<{ stage: string; c: number }>`select stage, count(*)::int as c from course.sales_leads group by stage`,
  ]);

  // The tables exist only once 0031_sales.sql has run.
  if (touches.error?.code === "42P01" || leads.error?.code === "42P01") return empty;
  for (const r of [touches, convo, leads, enrol, b2b, target, bySource, byOwner, stages]) {
    if (r.error) console.error("sales report read failed:", r.error.code, r.error.message);
  }

  const byChannel: Record<string, number> = {};
  let total = 0, prev = 0;
  for (const r of touches.data ?? []) { byChannel[r.channel] = r.cur; total += r.cur; prev += r.prev; }

  return {
    period: p,
    ready: true,
    outreach: { total, prev, byChannel },
    conversations: { total: n(convo.data?.cur), prev: n(convo.data?.prev) },
    newLeads: { total: n(leads.data?.cur), prev: n(leads.data?.prev) },
    hotNow: n(leads.data?.hot),
    dueToday: n(leads.data?.due),
    enrolments: { total: n(enrol.data?.cur), prev: n(enrol.data?.prev), revenue: n(enrol.data?.revenue) / 100 },
    b2bSigned: { total: n(b2b.data?.cur), prev: n(b2b.data?.prev) },
    target: target.data ?? null,
    bySource: bySource.data ?? [],
    byOwner: byOwner.data ?? [],
    stages: Object.fromEntries((stages.data ?? []).map((r) => [r.stage, r.c])),
  };
}
