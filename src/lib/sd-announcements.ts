import "server-only";
import { db, type Db } from "@/lib/db/client";
import type { Announcement } from "@/lib/sd-announcement-types";
import { SD_COURSE } from "@/lib/sd-offer";

export type AnnouncementAudience = "all" | "paid";

/** Postgres: the table isn't there yet (migration 0033 not run). */
const UNDEFINED_TABLE = "42P01";

/** The last 60 days of announcements this learner's seat should see, newest first. Never throws: a failure shows none. */
export async function announcementsFor(paid: boolean): Promise<Announcement[]> {
  const sql = db();
  if (!sql) return [];
  const audiences: AnnouncementAudience[] = paid ? ["all", "paid"] : ["all"];
  const { data, error } = await sql.rows<{ id: string; title: string; body: string; link_url: string | null; link_label: string | null; created_at: string }>`
    select id::text, title, body, link_url, link_label, created_at
      from course.sd_announcements
     where removed_at is null and audience = any(${audiences}::text[]) and created_at > now() - interval '60 days'
     order by created_at desc
     limit 20
  `;
  if (error) {
    if (error.code !== UNDEFINED_TABLE) console.error("announcements read failed:", error.code, error.message);
    return [];
  }
  return (data ?? []).map((r) => ({ id: r.id, title: r.title, body: r.body, linkUrl: r.link_url, linkLabel: r.link_label, at: new Date(r.created_at).toISOString() }));
}

/** The learners an announcement reaches: active seats, or paid ones only. */
export function audienceLearners(sql: Db, audience: AnnouncementAudience) {
  return sql.rows<{ email: string; name: string | null }>`
    select distinct on (e.email) e.email, l.name
      from course.enrollments e
      left join course.payments p on p.id = e.payment_id
      left join course.sd_preregistrations l on l.email = e.email
     where e.course = ${SD_COURSE} and e.status = 'active'
       and (${audience} = 'all' or (e.source = 'payment' and p.status = 'paid'))
     order by e.email
  `;
}
