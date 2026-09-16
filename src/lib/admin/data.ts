import "server-only";
import { getAdmin } from "@/lib/admin/auth";
import { createServiceClient } from "@/lib/supabase/admin";
import type { TrackSlug } from "@/types/program";

export interface Registration {
  id: string;
  created_at: string;
  name: string;
  email: string;
  phone: string;
  track: TrackSlug;
  job_role: string;
  experience: string;
  linkedin: string | null;
  cohort_start: string;
}

export interface LearnerProgress {
  id: string;
  name: string;
  email: string;
  track: TrackSlug;
  cohort_start: string;
  status: string;
  github_url: string | null;
  linkedin_url: string | null;
  days_submitted: number;
  last_submission_at: string | null;
  assessments_scored: number;
  latest_band: string | null;
}

export async function getRegistrations(): Promise<Registration[]> {
  // The service client bypasses RLS, so authorisation is checked here.
  if (!(await getAdmin())) return [];
  const supabase = createServiceClient();
  if (!supabase) return [];
  const { data } = await supabase
    .from("registrations")
    .select("id, created_at, name, email, phone, track, job_role, experience, linkedin, cohort_start")
    .order("created_at", { ascending: false })
    .limit(1000);
  return (data as Registration[]) ?? [];
}

export async function getLearnerProgress(): Promise<LearnerProgress[]> {
  if (!(await getAdmin())) return [];
  const supabase = createServiceClient();
  if (!supabase) return [];

  const { data: learners } = await supabase
    .from("learners")
    .select("id, name, email, track, cohort_start, status, github_url, linkedin_url")
    .order("created_at", { ascending: false });
  if (!learners?.length) return [];

  const ids = learners.map((l) => l.id);
  const [{ data: submissions }, { data: assessments }] = await Promise.all([
    supabase.from("day_submissions").select("learner_id, day, submitted_at").in("learner_id", ids),
    supabase.from("assessment_results").select("learner_id, after_day, band, weighted_score").in("learner_id", ids),
  ]);

  return learners.map((l) => {
    const mine = submissions?.filter((s) => s.learner_id === l.id) ?? [];
    const scored = (assessments ?? [])
      .filter((a) => a.learner_id === l.id && a.weighted_score != null)
      .sort((a, b) => a.after_day - b.after_day);
    const last = mine.map((s) => s.submitted_at).sort().at(-1) ?? null;
    return {
      ...l,
      days_submitted: mine.length,
      last_submission_at: last,
      assessments_scored: scored.length,
      latest_band: scored.at(-1)?.band ?? null,
    } as LearnerProgress;
  });
}

export interface RegistrationSummary {
  total: number;
  last24h: number;
  last7d: number;
  byTrack: Record<string, number>;
}

/** Time-based rollups, computed outside component render. */
export function summariseRegistrations(rows: Registration[]): RegistrationSummary {
  const now = Date.now();
  const within = (days: number) => rows.filter((r) => now - new Date(r.created_at).getTime() < days * 864e5).length;
  return {
    total: rows.length,
    last24h: within(1),
    last7d: within(7),
    byTrack: rows.reduce<Record<string, number>>((acc, r) => ({ ...acc, [r.track]: (acc[r.track] ?? 0) + 1 }), {}),
  };
}
