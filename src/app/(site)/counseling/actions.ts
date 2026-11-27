"use server";

import { db } from "@/lib/db/client";
import { counselingNote, validateCounseling, type CounselingErrors, type CounselingInput } from "@/lib/counseling";
import { checkRateLimit } from "@/lib/rate-limit";
import { istToday } from "@/lib/sales";

export type CounselingResult =
  | { ok: true; firstName: string; community: string | null }
  | { ok: false; errors?: CounselingErrors; message?: string };

const DETAIL = "Free counseling page";

/** The free community's WhatsApp group invite. */
const COMMUNITY_URL = "https://chat.whatsapp.com/D28Ct7tlc6CJpjImbA6pvC";

/** COMMUNITY_WHATSAPP_URL, when set, replaces the invite without a code change (say, after the link is reset). */
const community = () => {
  const url = process.env.COMMUNITY_WHATSAPP_URL?.trim();
  return url && /^https:\/\//.test(url) ? url : COMMUNITY_URL;
};

/**
 * The /counseling form. It becomes a B2C lead in Sales (source "website",
 * detail "Free counseling page"), due today, with the college, passing year,
 * role and question in the notes. Throttled per network address, a hidden
 * honeypot catches bots, and every value is rebuilt on the server.
 *
 * Only name, WhatsApp and career interest are required; email and college
 * are saved when given.
 *
 * Someone already in Sales (same number, or same email when given) is updated, not duplicated:
 * a missing college is filled in, the request is added to the notes and the
 * follow-up is brought forward to today.
 */
export async function submitCounseling(input: CounselingInput, honeypot?: string): Promise<CounselingResult> {
  if (honeypot) return { ok: true, firstName: "", community: null };

  const v = validateCounseling(input);
  if (!v.ok) return { ok: false, errors: v.errors };
  const d = v.data;

  const limit = await checkRateLimit("counseling", { limit: 6, windowMinutes: 10 });
  if (!limit.allowed) return { ok: false, message: "Too many tries from this network. Wait a few minutes and send it again." };

  const sql = db();
  if (!sql) return { ok: false, message: "We couldn't save that just now. Please try again in a minute." };

  const today = istToday();
  const note = counselingNote(d, today);
  const email = d.email || null;
  const college = d.college || null;
  const owner = process.env.SALES_FORM_OWNER?.trim().toLowerCase() || null;

  const { error } = await sql.run`
    with existing as (
      select id from course.sales_leads
       where phone = ${d.phone} or (${email}::text is not null and email = ${email}::text)
       order by (phone = ${d.phone}) desc, created_at
       limit 1
    ),
    upd as (
      update course.sales_leads l set
        email = case when l.email is null and ${email}::text is not null
                      and not exists (select 1 from course.sales_leads x where x.email = ${email}::text)
                     then ${email}::text else l.email end,
        org = coalesce(nullif(l.org, ''), ${college}::text),
        notes = left(concat_ws(E'\n', nullif(l.notes, ''), ${note}::text), 2000),
        owner_email = coalesce(l.owner_email, ${owner}::text),
        next_follow_up = case when l.stage in ('signed', 'rejected') then l.next_follow_up
                              else least(coalesce(l.next_follow_up, ${today}::date), ${today}::date) end,
        updated_at = now()
      from existing e where l.id = e.id
      returning l.id
    )
    insert into course.sales_leads (name, phone, email, kind, source, source_detail, org, notes, owner_email, next_follow_up, created_by)
    select ${d.name}, ${d.phone}, ${email}::text, 'b2c', 'website', ${DETAIL}, ${college}::text, ${note}, ${owner}::text, ${today}::date, 'counseling-form'
     where not exists (select 1 from existing)
    on conflict do nothing
  `;
  if (error) {
    console.error("counseling request save failed:", error.code, error.message);
    return { ok: false, message: "We couldn't save that just now. Please try again in a minute." };
  }
  return { ok: true, firstName: d.name.split(" ")[0], community: community() };
}
