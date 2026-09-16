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
  github_username: string | null;
  linkedin_slug: string | null;
  days_submitted: number;
  last_submission_at: string | null;
  /** Checkpoint posts provided, out of the four due on days 7, 14, 21 and 28. */
  linkedin_posts: number;
  assessments_scored: number;
  latest_band: string | null;
}

export interface LearnerSubmission {
  day: number;
  deliverable_url: string | null;
  note: string | null;
  linkedin_post_url: string | null;
  quiz_answers: string[] | null;
  status: string;
  submitted_at: string;
  reviewer_note: string | null;
}

export interface LearnerDetail extends LearnerProgress {
  submissions: LearnerSubmission[];
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
    .select("id, name, email, track, cohort_start, status, github_url, linkedin_url, github_username, linkedin_slug")
    .order("created_at", { ascending: false });
  if (!learners?.length) return [];

  const ids = learners.map((l) => l.id);
  const [{ data: submissions }, { data: assessments }] = await Promise.all([
    supabase.from("day_submissions").select("learner_id, day, submitted_at, linkedin_post_url").in("learner_id", ids),
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
      linkedin_posts: mine.filter((s) => s.linkedin_post_url).length,
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

/** One learner, with every submission, for the reviewer's view. */
export async function getLearnerDetail(id: string): Promise<LearnerDetail | null> {
  if (!(await getAdmin())) return null;
  const supabase = createServiceClient();
  if (!supabase) return null;

  const { data: learner } = await supabase
    .from("learners")
    .select("id, name, email, track, cohort_start, status, github_url, linkedin_url, github_username, linkedin_slug")
    .eq("id", id)
    .maybeSingle();
  if (!learner) return null;

  const [{ data: submissions }, { data: assessments }] = await Promise.all([
    supabase
      .from("day_submissions")
      .select("day, deliverable_url, note, linkedin_post_url, quiz_answers, status, submitted_at, reviewer_note")
      .eq("learner_id", id)
      .order("day"),
    supabase.from("assessment_results").select("after_day, band, weighted_score").eq("learner_id", id),
  ]);

  const rows = (submissions as LearnerSubmission[]) ?? [];
  const scored = (assessments ?? []).filter((a) => a.weighted_score != null).sort((a, b) => a.after_day - b.after_day);

  return {
    ...(learner as Omit<LearnerProgress, "days_submitted" | "linkedin_posts" | "last_submission_at" | "assessments_scored" | "latest_band">),
    days_submitted: rows.length,
    linkedin_posts: rows.filter((r) => r.linkedin_post_url).length,
    last_submission_at: rows.map((r) => r.submitted_at).sort().at(-1) ?? null,
    assessments_scored: scored.length,
    latest_band: scored.at(-1)?.band ?? null,
    submissions: rows,
  };
}
