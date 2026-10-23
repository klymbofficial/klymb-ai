import "server-only";
import { getAdmin } from "@/lib/admin/auth";
import { db } from "@/lib/db/client";
import { allTracks } from "@/data/tracks";

/** Platform engagement, computed from our own tables rather than Google's. */

export type Granularity = "daily" | "weekly" | "monthly";

export interface TimePoint {
  date: string;
  registrations: number;
  submissions: number;
}

export interface Slice {
  label: string;
  value: number;
}

export interface EngagementSummary {
  series: TimePoint[];
  byTrack: Slice[];
  /** How many learners are still going at each milestone: the honest retention picture. */
  milestones: Slice[];
  totals: { registrations: number; learners: number; submissions: number; completed: number };
}

const EMPTY: EngagementSummary = {
  series: [],
  byTrack: [],
  milestones: [],
  totals: { registrations: 0, learners: 0, submissions: 0, completed: 0 },
};

function bucketKey(iso: string, granularity: Granularity): string {
  const d = new Date(iso);
  if (granularity === "monthly") return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-01`;
  if (granularity === "weekly") {
    const day = d.getUTCDay();
    // Week starts Monday.
    const monday = new Date(d);
    monday.setUTCDate(d.getUTCDate() - ((day + 6) % 7));
    return monday.toISOString().slice(0, 10);
  }
  return d.toISOString().slice(0, 10);
}

export async function getEngagement(days = 30, granularity: Granularity = "daily"): Promise<EngagementSummary> {
  if (!(await getAdmin())) return EMPTY;
  const sql = db();
  if (!sql) return EMPTY;

  const since = new Date(Date.now() - days * 864e5).toISOString();

  // Counted in the database, one row per UTC day rather than one row per
  // event. This used to fetch every registration and submission in the window
  // and, worse, every learner that has ever existed, then count them in
  // JavaScript. The rolling-up into weeks and months still happens below, in
  // bucketKey, so the numbers are identical — there is just no longer a
  // response whose size grows with the cohort.
  const [{ data: regDays }, { data: subDays }, { data: tracks }, { data: learnerCount }, { data: reached }] =
    await Promise.all([
      sql.rows<{ day: string; n: number }>`
        select to_char(date_trunc('day', created_at at time zone 'UTC'), 'YYYY-MM-DD') as day, count(*)::int as n
          from course.registrations where created_at >= ${since}
         group by 1
      `,
      sql.rows<{ day: string; n: number }>`
        select to_char(date_trunc('day', submitted_at at time zone 'UTC'), 'YYYY-MM-DD') as day, count(*)::int as n
          from course.day_submissions where submitted_at >= ${since}
         group by 1
      `,
      sql.rows<{ track: string; n: number }>`
        select track, count(*)::int as n
          from course.registrations where created_at >= ${since}
         group by 1
      `,
      sql.scalar<number>`select count(*)::int from course.learners`,
      // Milestones count learners by the furthest day they reached *in this
      // window*, which is what this page has always shown.
      sql.row<{ d1: number; d7: number; d14: number; d21: number; d30: number; subs: number }>`
        select count(*) filter (where d >= 1)  ::int as d1,
               count(*) filter (where d >= 7)  ::int as d7,
               count(*) filter (where d >= 14) ::int as d14,
               count(*) filter (where d >= 21) ::int as d21,
               count(*) filter (where d >= 30) ::int as d30,
               coalesce(sum(n), 0)::int              as subs
          from (
            select learner_id, max(day) as d, count(*) as n
              from course.day_submissions
             where submitted_at >= ${since}
             group by learner_id
          ) per_learner
      `,
    ]);

  // One bucket per period, so a quiet day still shows as a zero rather than a gap.
  const buckets = new Map<string, TimePoint>();
  for (let i = days - 1; i >= 0; i--) {
    const key = bucketKey(new Date(Date.now() - i * 864e5).toISOString(), granularity);
    if (!buckets.has(key)) buckets.set(key, { date: key, registrations: 0, submissions: 0 });
  }

  // Daily counts roll up into whichever period was asked for.
  for (const r of regDays ?? []) {
    const point = buckets.get(bucketKey(`${r.day}T00:00:00Z`, granularity));
    if (point) point.registrations += r.n;
  }
  for (const s of subDays ?? []) {
    const point = buckets.get(bucketKey(`${s.day}T00:00:00Z`, granularity));
    if (point) point.submissions += s.n;
  }

  const trackCounts = new Map((tracks ?? []).map((t) => [t.track, t.n]));
  const totalRegistrations = (regDays ?? []).reduce((sum, r) => sum + r.n, 0);
  const enrolled = learnerCount ?? 0;

  return {
    series: [...buckets.values()],
    byTrack: allTracks
      .map((t) => ({ label: t.name, value: trackCounts.get(t.slug) ?? 0 }))
      .filter((s) => s.value > 0),
    milestones: [
      { label: "Enrolled", value: enrolled },
      { label: "Started (day 1)", value: reached?.d1 ?? 0 },
      { label: "Reached day 7", value: reached?.d7 ?? 0 },
      { label: "Reached day 14", value: reached?.d14 ?? 0 },
      { label: "Reached day 21", value: reached?.d21 ?? 0 },
      { label: "Reached day 30", value: reached?.d30 ?? 0 },
    ],
    totals: {
      registrations: totalRegistrations,
      learners: enrolled,
      submissions: reached?.subs ?? 0,
      completed: reached?.d30 ?? 0,
    },
  };
}
