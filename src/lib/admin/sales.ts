import "server-only";
import { getAdmin } from "@/lib/admin/auth";
import { db } from "@/lib/db/client";
import { HOT_STAGES, istToday, period, type Channel, type PeriodKey, type Source, type Stage } from "@/lib/sales";

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
  touches: number;
  last_touch_at: string | null;
  last_channel: Channel | null;
  replied: boolean;
  paid: boolean;
}

export interface Touch {
  id: string;
  created_at: string;
  by_email: string;
  channel: Channel;
  replied: boolean;
  note: string | null;
}

export interface Owner { email: string; name: string | null }

export interface LeadFilter {
  stage?: string;
  source?: string;
  owner?: string;
  due?: boolean;
  q?: string;
}

export async function getOwners(): Promise<Owner[]> {
  if (!(await getAdmin())) return [];
  const sql = db();
  if (!sql) return [];
  const { data } = await sql.rows<Owner>`select email, name from course.admin_users order by coalesce(name, email)`;
  return data ?? [];
}

export async function getLeads(f: LeadFilter): Promise<Lead[]> {
  if (!(await getAdmin())) return [];
  const sql = db();
  if (!sql) return [];
  const stage = f.stage || null;
  const source = f.source || null;
  const owner = f.owner === "none" ? "" : f.owner || null;
  const due = f.due ? istToday() : null;
  const q = f.q?.trim() ? `%${f.q.trim().toLowerCase().replace(/[\\%_]/g, (c) => `\\${c}`)}%` : null;
  const qDigits = f.q?.replace(/\D/g, "") || null;

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
           l.stage, l.stage_changed_at, l.owner_email, l.next_follow_up::text as next_follow_up, l.notes,
           coalesce(t.n, 0)::int as touches, t.last_at as last_touch_at, t.last_channel,
           coalesce(t.replied, false) as replied,
           (paid.id is not null) as paid
      from course.sales_leads l
      left join lateral (
        select count(*) as n, max(created_at) as last_at, bool_or(replied) as replied,
               (array_agg(channel order by created_at desc))[1] as last_channel
          from course.sales_touches where lead_id = l.id
      ) t on true
      left join paid on paid.id = l.id
     where (${stage}::text is null or l.stage = ${stage})
       and (${source}::text is null or l.source = ${source})
       and (${owner}::text is null or coalesce(l.owner_email, '') = ${owner})
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
  if (!(await getAdmin())) return null;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const sql = db();
  if (!sql) return null;
  const all = await getLeadsByIds([id]);
  const lead = all[0];
  if (!lead) return null;
  const { data } = await sql.rows<Touch>`
    select id, created_at, by_email, channel, replied, note
      from course.sales_touches where lead_id = ${id} order by created_at desc limit 200
  `;
  return { lead, touches: data ?? [] };
}

async function getLeadsByIds(ids: string[]): Promise<Lead[]> {
  const sql = db();
  if (!sql) return [];
  const { data } = await sql.rows<Lead>`
    select l.id, l.created_at, l.name, l.phone, l.email, l.kind, l.source, l.source_detail, l.org,
           l.stage, l.stage_changed_at, l.owner_email, l.next_follow_up::text as next_follow_up, l.notes,
           (select count(*)::int from course.sales_touches t where t.lead_id = l.id) as touches,
           (select max(created_at) from course.sales_touches t where t.lead_id = l.id) as last_touch_at,
           (select channel from course.sales_touches t where t.lead_id = l.id order by created_at desc limit 1) as last_channel,
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
  byOwner: { email: string; touches: number; conversations: number; hot: number; due: number }[];
  stages: Record<string, number>;
  dueToday: number;
}

const n = (v: unknown) => Number(v ?? 0);

export async function getSalesReport(key: PeriodKey): Promise<SalesReport | null> {
  if (!(await getAdmin())) return null;
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
        from course.sales_touches where created_at >= least(${s}::timestamptz, ${ps}::timestamptz)
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
    // that is the number the board's targets are written against.
    sql.row<{ cur: number; prev: number; revenue: number }>`
      select count(distinct lower(email)) filter (where created_at >= ${s} and created_at < ${e})::int as cur,
             count(distinct lower(email)) filter (where created_at >= ${ps} and created_at < ${pe})::int as prev,
             coalesce(sum(amount) filter (where created_at >= ${s} and created_at < ${e}), 0)::int as revenue
        from course.payments where status in ('paid', 'refunded')`,
    sql.row<{ cur: number; prev: number }>`
      select count(*) filter (where signed_at >= ${s} and signed_at < ${e})::int as cur,
             count(*) filter (where signed_at >= ${ps} and signed_at < ${pe})::int as prev
        from course.sales_leads where kind = 'b2b' and stage = 'signed'`,
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
         where pay.created_at >= ${s} and pay.created_at < ${e}
      )
      select l.source,
             count(*) filter (where l.created_at >= ${s} and l.created_at < ${e})::int as leads,
             count(*) filter (where exists (select 1 from course.sales_touches t where t.lead_id = l.id and t.created_at >= ${s} and t.created_at < ${e}))::int as contacted,
             count(*) filter (where exists (select 1 from course.sales_touches t where t.lead_id = l.id and t.replied and t.created_at >= ${s} and t.created_at < ${e}))::int as conversations,
             count(paid.id)::int as paid
        from course.sales_leads l left join paid on paid.id = l.id
       group by l.source`,
    sql.rows<{ email: string; touches: number; conversations: number; hot: number; due: number }>`
      with t as (
        select by_email as email, count(*)::int as touches, count(distinct lead_id) filter (where replied)::int as conversations
          from course.sales_touches where created_at >= ${s} and created_at < ${e} group by by_email
      ), o as (
        select owner_email as email,
               count(*) filter (where stage = any(${hot}::text[]))::int as hot,
               count(*) filter (where next_follow_up <= ${today}::date and stage not in ('signed', 'rejected'))::int as due
          from course.sales_leads where owner_email is not null group by owner_email
      )
      select coalesce(t.email, o.email) as email, coalesce(t.touches, 0) as touches, coalesce(t.conversations, 0) as conversations,
             coalesce(o.hot, 0) as hot, coalesce(o.due, 0) as due
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
