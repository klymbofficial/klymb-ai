import "server-only";
import { getAdmin } from "@/lib/admin/auth";
import { createServiceClient } from "@/lib/supabase/admin";
import { tracks } from "@/data/tracks";

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
  const supabase = createServiceClient();
  if (!supabase) return EMPTY;

  const since = new Date(Date.now() - days * 864e5).toISOString();

  const [{ data: registrations }, { data: submissions }, { data: learners }] = await Promise.all([
    supabase.from("registrations").select("created_at, track").gte("created_at", since),
    supabase.from("day_submissions").select("submitted_at, learner_id, day").gte("submitted_at", since),
    supabase.from("learners").select("id, track, status"),
  ]);

  // One bucket per period, so a quiet day still shows as a zero rather than a gap.
  const buckets = new Map<string, TimePoint>();
  for (let i = days - 1; i >= 0; i--) {
    const key = bucketKey(new Date(Date.now() - i * 864e5).toISOString(), granularity);
    if (!buckets.has(key)) buckets.set(key, { date: key, registrations: 0, submissions: 0 });
  }

  for (const r of registrations ?? []) {
    const point = buckets.get(bucketKey(r.created_at as string, granularity));
    if (point) point.registrations += 1;
  }
  for (const s of submissions ?? []) {
    const point = buckets.get(bucketKey(s.submitted_at as string, granularity));
    if (point) point.submissions += 1;
  }

  // Track distribution across everyone who registered in the window.
  const trackCounts = new Map<string, number>();
  for (const r of registrations ?? []) trackCounts.set(r.track as string, (trackCounts.get(r.track as string) ?? 0) + 1);

  // Milestones: learners who reached at least this day.
  const reached = new Map<string, number>();
  for (const s of submissions ?? []) {
    const id = s.learner_id as string;
    reached.set(id, Math.max(reached.get(id) ?? 0, Number(s.day)));
  }
  const atLeast = (day: number) => [...reached.values()].filter((d) => d >= day).length;

  return {
    series: [...buckets.values()],
    byTrack: tracks
      .map((t) => ({ label: t.name, value: trackCounts.get(t.slug) ?? 0 }))
      .filter((s) => s.value > 0),
    milestones: [
      { label: "Enrolled", value: learners?.length ?? 0 },
      { label: "Started (day 1)", value: atLeast(1) },
      { label: "Reached day 7", value: atLeast(7) },
      { label: "Reached day 14", value: atLeast(14) },
      { label: "Reached day 21", value: atLeast(21) },
      { label: "Reached day 30", value: atLeast(30) },
    ],
    totals: {
      registrations: registrations?.length ?? 0,
      learners: learners?.length ?? 0,
      submissions: submissions?.length ?? 0,
      completed: atLeast(30),
    },
  };
}
