import "server-only";
import { getAdmin } from "@/lib/admin/auth";
import { db } from "@/lib/db/client";

export interface WebinarRegistration {
  id: string;
  created_at: string;
  name: string;
  email: string;
  phone: string;
  role: "student" | "working";
  org: string | null;
  question: string | null;
  confirmation_sent_at: string | null;
  /** Set once a paid webinar's seat is paid for; null for a free webinar and for an unfinished checkout. */
  paid_at: string | null;
  /** What the seat costs, in the smallest unit; null for a free webinar. */
  amount: number | null;
}

/** Everyone registered for one webinar, newest first. Null when the table isn't there yet (migration 0042 not run). */
export async function getWebinarRegistrations(webinar: string): Promise<WebinarRegistration[] | null> {
  // The connection can read the whole course schema, so authorisation is checked here.
  if (!(await getAdmin())) return [];
  const sql = db();
  if (!sql) return [];
  const { data, error } = await sql.rows<WebinarRegistration>`
    select id, created_at, name, email, phone, role, org, question, confirmation_sent_at, paid_at, amount
      from course.webinar_registrations
     where webinar = ${webinar}
     order by created_at desc
     limit 5000
  `;
  if (error) {
    console.error("webinar registrations read failed:", error.message);
    return null;
  }
  return data ?? [];
}

/** Names for webinars that have ended, which lib/webinar.ts no longer describes. Unknown ones show their slug. */
const PAST_WEBINARS: Record<string, string> = {
  "ai-tools-claude-2026-11": "System Design, live · Sat 21 Nov 2026 (India)",
};

export interface WebinarSummary {
  slug: string;
  label: string;
  registered: number;
  firstAt: string;
}

/** Every webinar that has sign-ups, newest first, so the admin can open a past one. Empty when the table isn't readable. */
export async function getWebinarList(current: { slug: string; label: string }): Promise<WebinarSummary[]> {
  if (!(await getAdmin())) return [];
  const sql = db();
  if (!sql) return [];
  const { data, error } = await sql.rows<{ slug: string; registered: number; first_at: string }>`
    select webinar as slug, count(*)::int as registered, min(created_at) as first_at
      from course.webinar_registrations
     group by webinar
     order by min(created_at) desc
  `;
  if (error) {
    console.error("webinar list read failed:", error.message);
    return [];
  }
  const list = (data ?? []).map((w) => ({
    slug: w.slug, registered: w.registered, firstAt: w.first_at,
    label: w.slug === current.slug ? current.label : (PAST_WEBINARS[w.slug] ?? w.slug),
  }));
  // The current webinar is always pickable, even before anyone signs up.
  if (!list.some((w) => w.slug === current.slug)) list.unshift({ slug: current.slug, label: current.label, registered: 0, firstAt: "" });
  return list;
}
