import { NextResponse } from "next/server";
import { site } from "@/data/config";
import { isOwnerEmail, isSalesManager } from "@/lib/admin/access";
import { isCronRequest } from "@/lib/cron-auth";
import { db } from "@/lib/db/client";
import { b2bDigestEmail, type DueDeal, type DueTask } from "@/lib/b2b-digest";
import { mailReady, sendMail } from "@/lib/mail";
import { istToday } from "@/lib/sales";
import { salesDigestEmail, type DueLead } from "@/lib/sales-digest";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * 09:00 IST, called by cron-job.org with CRON_SECRET as a bearer token.
 * Emails each lead owner the follow-ups due today or overdue. Nobody with
 * nothing due gets mail. A second run the same day sends nothing new
 * (ABT-Mailer de-duplicates on the key; Brevo would resend, so run it once).
 */
export async function GET(req: Request) {
  if (!isCronRequest(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const sql = db();
  if (!sql || !mailReady()) return NextResponse.json({ error: "Not configured" }, { status: 500 });
  const today = istToday();

  const { data, error } = await sql.rows<DueLead & { owner_email: string; owner_name: string | null }>`
    select l.id, l.name, l.phone, l.stage, l.next_follow_up::text as next_follow_up, l.notes,
           l.owner_email, a.name as owner_name
      from course.sales_leads l
      left join course.admin_users a on a.email = l.owner_email
     where l.owner_email is not null and l.next_follow_up <= ${today}::date and l.stage not in ('signed', 'rejected')
     order by l.owner_email, l.next_follow_up, l.name
  `;
  if (error) return NextResponse.json({ error: "Read failed" }, { status: 500 });
  // Active interns get their own digest, linking to /sales. Before
  // 0041_sales_reps.sql has run this read fails and there are none.
  const { data: repRows } = await sql.rows<{ email: string; name: string | null }>`
    select email, name from course.sales_reps where active
  `;
  const reps = new Map((repRows ?? []).map((r) => [r.email, r.name]));

  const byOwner = new Map<string, { name: string | null; rep: boolean; leads: DueLead[] }>();
  // Only people who can open Sales get a digest: owners, and active interns.
  for (const r of (data ?? []).filter((x) => isOwnerEmail(x.owner_email) || reps.has(x.owner_email))) {
    const rep = !isOwnerEmail(r.owner_email);
    const o = byOwner.get(r.owner_email) ?? { name: rep ? reps.get(r.owner_email) ?? null : r.owner_name, rep, leads: [] };
    o.leads.push(r);
    byOwner.set(r.owner_email, o);
  }

  const results: Record<string, string> = {};
  for (const [email, o] of byOwner) {
    const mail = salesDigestEmail({ name: o.name, today, leads: o.leads, siteUrl: site.url, rep: o.rep });
    const r = await sendMail({
      to: { email, name: o.name ?? undefined },
      ...mail,
      kind: "sales.digest",
      idempotencyKey: `sales-digest:${email}:${today}`,
    });
    results[email] = r.ok ? `sent ${o.leads.length}` : r.reason;
  }

  const b2b = await sendB2BDigests(today);
  return NextResponse.json({ today, owners: byOwner.size, results, b2b });
}

/**
 * The B2B email, to each owner or sales manager with a deal whose next step
 * is due, or a task due. Before 0069_b2b_deals.sql has run the reads fail
 * and nobody gets one.
 */
async function sendB2BDigests(today: string): Promise<Record<string, string>> {
  const sql = db();
  if (!sql) return {};
  const [deals, tasks, admins] = await Promise.all([
    sql.rows<DueDeal & { owner_email: string }>`
      select d.id, c.name as company_name, d.title, d.stage, d.value_inr, d.next_step,
             d.next_step_date::text as next_step_date, d.owner_email
        from course.b2b_deals d join course.b2b_companies c on c.id = d.company_id
       where d.owner_email is not null and d.next_step_date <= ${today}::date and d.stage not in ('signed', 'lost')
       order by d.next_step_date, d.value_inr desc`,
    sql.rows<DueTask & { assignee_email: string }>`
      select t.deal_id, c.name as company_name, t.title, t.due::text as due, t.assignee_email
        from course.b2b_tasks t join course.b2b_deals d on d.id = t.deal_id join course.b2b_companies c on c.id = d.company_id
       where t.done_at is null and t.assignee_email is not null and t.due <= ${today}::date
       order by t.due`,
    sql.rows<{ email: string; name: string | null }>`select email, name from course.admin_users`,
  ]);
  if (deals.error || tasks.error) return {};
  const names = new Map((admins.data ?? []).map((a) => [a.email, a.name]));
  // Only people who can open B2B: owners and sales managers who are admins.
  const allowed = (e: string) => names.has(e) && (isOwnerEmail(e) || isSalesManager(e));
  const by = new Map<string, { deals: DueDeal[]; tasks: DueTask[] }>();
  for (const d of deals.data ?? []) if (allowed(d.owner_email)) {
    const o = by.get(d.owner_email) ?? { deals: [], tasks: [] };
    o.deals.push(d);
    by.set(d.owner_email, o);
  }
  for (const t of tasks.data ?? []) if (allowed(t.assignee_email)) {
    const o = by.get(t.assignee_email) ?? { deals: [], tasks: [] };
    o.tasks.push(t);
    by.set(t.assignee_email, o);
  }
  const results: Record<string, string> = {};
  for (const [email, o] of by) {
    const name = names.get(email) ?? null;
    const mail = b2bDigestEmail({ name, today, deals: o.deals, tasks: o.tasks, siteUrl: site.url });
    const r = await sendMail({ to: { email, name: name ?? undefined }, ...mail, kind: "sales.b2b_digest", idempotencyKey: `b2b-digest:${email}:${today}` });
    results[email] = r.ok ? `sent ${o.deals.length} deals, ${o.tasks.length} tasks` : r.reason;
  }
  return results;
}
