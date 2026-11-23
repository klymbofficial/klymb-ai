import "server-only";
import { LESSON_DAYS } from "@/data/system-design/lessons";
import { getAdmin } from "@/lib/admin/auth";
import { db } from "@/lib/db/client";
import { summarise, type SdEventRow, type SdFeedbackRow, type SdSummary } from "@/lib/sd-summary";

const PAGE = 1000;
const MAX_PAGES = 40;

export type SdAnalytics = (SdSummary & { ok: true }) | { ok: false; reason: "no-db" | "no-table" };

/** System Design course activity for the last `days` days (newest 40k events at most). */
export async function getSdAnalytics(days: number): Promise<SdAnalytics> {
  if (!(await getAdmin())) return { ok: false, reason: "no-db" };
  const sql = db();
  if (!sql) return { ok: false, reason: "no-db" };
  const since = new Date(Date.now() - days * 864e5).toISOString();

  const events: SdEventRow[] = [];
  for (let page = 0; page < MAX_PAGES; page++) {
    const { data, error } = await sql.rows<SdEventRow>`
      select created_at, anon_id, email, event, lesson, step, props, lang, device
        from course.sd_events
       where created_at >= ${since} and event <> 'offer'
       order by created_at
       limit ${PAGE} offset ${page * PAGE}
    `;
    if (error) return { ok: false, reason: "no-table" };
    events.push(...(data ?? []));
    if (!data || data.length < PAGE) break;
  }
  const { data: feedback } = await sql.rows<SdFeedbackRow>`
    select created_at, anon_id, email, lesson, rating, clarity, will_finish, improve, lang
      from course.sd_feedback
     where created_at >= ${since}
     order by created_at desc
  `;
  return { ok: true, ...summarise(events, feedback ?? [], LESSON_DAYS) };
}

/** Events per page of one learner's trail. */
export const TRAIL_PAGE = 1000;

/**
 * One page of everything a learner did, oldest first within the page. Page 0
 * is the most recent activity, page 1 the stretch before it, and so on, so an
 * active learner's latest days always show. `older`: there is a page before this one.
 */
export async function getSdLearner(anon: string, page = 0): Promise<{ events: SdEventRow[]; older: boolean }> {
  const none = { events: [], older: false };
  if (!(await getAdmin()) || !/^[a-zA-Z0-9-]{8,64}$/.test(anon)) return none;
  const sql = db();
  if (!sql) return none;
  const { data } = await sql.rows<SdEventRow>`
    select created_at, anon_id, email, event, lesson, step, props, lang, device
      from course.sd_events
     where anon_id = ${anon}
     order by created_at desc
     limit ${TRAIL_PAGE + 1} offset ${page * TRAIL_PAGE}
  `;
  const rows = data ?? [];
  return { events: rows.slice(0, TRAIL_PAGE).reverse(), older: rows.length > TRAIL_PAGE };
}

const FUNNEL = ["view", "form_start", "claim", "blocked", "open_browser", "google", "order_failed", "rzp_open", "rzp_closed", "rzp_failed", "paid"] as const;
export interface OfferFunnelRow { step: (typeof FUNNEL)[number]; inApp: number; browser: number }

/** Distinct visitors reaching each step of the offer page, split by where they opened it. */
export async function getOfferFunnel(days: number): Promise<OfferFunnelRow[]> {
  if (!(await getAdmin())) return [];
  const sql = db();
  if (!sql) return [];
  const since = new Date(Date.now() - days * 864e5).toISOString();
  const { data } = await sql.rows<{ step: string; in_app: boolean; people: number }>`
    select step, coalesce((props->>'inApp')::boolean, false) as in_app, count(distinct anon_id)::int as people
      from course.sd_events
     where event = 'offer' and created_at >= ${since}
     group by 1, 2
  `;
  return FUNNEL.map((step) => ({
    step,
    inApp: data?.find((r) => r.step === step && r.in_app)?.people ?? 0,
    browser: data?.find((r) => r.step === step && !r.in_app)?.people ?? 0,
  }));
}
