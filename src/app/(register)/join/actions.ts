"use server";

import { db } from "@/lib/db/client";
import { joinDetail, joinSource, joinSummary, validateJoin, type JoinErrors, type JoinInput } from "@/lib/join";
import { checkRateLimit } from "@/lib/rate-limit";
import { istToday } from "@/lib/sales";

export type JoinResult = { ok: true; firstName: string } | { ok: false; errors?: JoinErrors; message?: string };

/**
 * The /join form. Anyone with the link can send it, so it is throttled per
 * network address, a hidden honeypot field catches bots, and every value is
 * rebuilt on the server.
 *
 * Someone already in Sales (same number or email) is updated, not duplicated:
 * missing email and college or company are filled in, the details are added
 * to the notes, and the follow-up is brought forward to today. Everyone else
 * becomes a new lead, due today, owned by SALES_FORM_OWNER when it is set.
 */
export async function submitJoin(input: JoinInput & { from?: string }, honeypot?: string): Promise<JoinResult> {
  if (honeypot) return { ok: true, firstName: "" };

  const v = validateJoin(input);
  if (!v.ok) return { ok: false, errors: v.errors };
  const d = v.data;

  const limit = await checkRateLimit("join-form", { limit: 6, windowMinutes: 10 });
  if (!limit.allowed) return { ok: false, message: "Too many tries from this network. Wait a few minutes and send it again." };

  const sql = db();
  if (!sql) return { ok: false, message: "We couldn't save that just now. Please try again in a minute." };

  const { source, tag } = joinSource(input.from);
  const today = istToday();
  const summary = joinSummary(d);
  const note = `${summary}\nJoin form ${today}${tag ? ` (${tag})` : ""}`;
  const owner = process.env.SALES_FORM_OWNER?.trim().toLowerCase() || null;

  const { error } = await sql.run`
    with existing as (
      select id from course.sales_leads
       where phone = ${d.phone} or email = ${d.email}
       order by (phone = ${d.phone}) desc, created_at
       limit 1
    ),
    upd as (
      update course.sales_leads l set
        email = case when l.email is null
                      and not exists (select 1 from course.sales_leads x where x.email = ${d.email})
                     then ${d.email} else l.email end,
        org = coalesce(nullif(l.org, ''), ${d.org}),
        notes = concat_ws(E'\n', nullif(l.notes, ''), ${note}::text),
        owner_email = coalesce(l.owner_email, ${owner}::text),
        next_follow_up = case when l.stage in ('signed', 'rejected') then l.next_follow_up
                              else least(coalesce(l.next_follow_up, ${today}::date), ${today}::date) end,
        updated_at = now()
      from existing e where l.id = e.id
      returning l.id
    )
    insert into course.sales_leads (name, phone, email, source, source_detail, org, notes, owner_email, next_follow_up, created_by)
    select ${d.name}, ${d.phone}, ${d.email}, ${source}, ${joinDetail(tag)}, ${d.org}, ${note}, ${owner}::text, ${today}::date, 'join-form'
     where not exists (select 1 from existing)
    on conflict do nothing
  `;
  if (error) {
    console.error("join form save failed:", error.code, error.message);
    return { ok: false, message: "We couldn't save that just now. Please try again in a minute." };
  }
  return { ok: true, firstName: d.name.split(" ")[0] };
}
