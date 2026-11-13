import { NextResponse } from "next/server";
import { site } from "@/data/config";
import { isCronRequest } from "@/lib/cron-auth";
import { db } from "@/lib/db/client";
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
      join course.admin_users a on a.email = l.owner_email
     where l.next_follow_up <= ${today}::date and l.stage not in ('signed', 'rejected')
     order by l.owner_email, l.next_follow_up, l.name
  `;
  if (error) return NextResponse.json({ error: "Read failed" }, { status: 500 });

  const byOwner = new Map<string, { name: string | null; leads: DueLead[] }>();
  for (const r of data ?? []) {
    const o = byOwner.get(r.owner_email) ?? { name: r.owner_name, leads: [] };
    o.leads.push(r);
    byOwner.set(r.owner_email, o);
  }

  const results: Record<string, string> = {};
  for (const [email, o] of byOwner) {
    const mail = salesDigestEmail({ name: o.name, today, leads: o.leads, siteUrl: site.url });
    const r = await sendMail({
      to: { email, name: o.name ?? undefined },
      ...mail,
      kind: "sales.digest",
      idempotencyKey: `sales-digest:${email}:${today}`,
    });
    results[email] = r.ok ? `sent ${o.leads.length}` : r.reason;
  }
  return NextResponse.json({ today, owners: byOwner.size, results });
}
