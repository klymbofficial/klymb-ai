import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { TrackSlug } from "@/types/program";

export interface Learner {
  id: string;
  name: string;
  email: string;
  track: TrackSlug;
  cohort_start: string;
  status: string;
  github_url: string | null;
  linkedin_url: string | null;
}

export interface Submission {
  day: number;
  deliverable_url: string | null;
  note: string | null;
  status: string;
  submitted_at: string;
  reviewer_note: string | null;
}

export type LearnerState =
  | { state: "signed-out" }
  | { state: "not-enrolled"; email: string }
  | { state: "enrolled"; learner: Learner; submissions: Submission[] };

/**
 * Resolves the signed-in user to their learner record.
 * First sign-in links the auth user to the enrolment created by an admin.
 */
export async function getLearnerState(): Promise<LearnerState> {
  const supabase = await createClient();
  if (!supabase) return { state: "signed-out" };

  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return { state: "signed-out" };

  let { data: learner } = await supabase
    .from("learners")
    .select("id, name, email, track, cohort_start, status, github_url, linkedin_url")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!learner) {
    // Enrolled by email but never signed in before: claim the row.
    const { data: claimed } = await supabase
      .from("learners")
      .update({ user_id: user.id })
      .ilike("email", user.email)
      .is("user_id", null)
      .select("id, name, email, track, cohort_start, status, github_url, linkedin_url")
      .maybeSingle();
    learner = claimed ?? null;
  }

  if (!learner) return { state: "not-enrolled", email: user.email };

  const { data: submissions } = await supabase
    .from("day_submissions")
    .select("day, deliverable_url, note, status, submitted_at, reviewer_note")
    .eq("learner_id", learner.id)
    .order("day");

  return { state: "enrolled", learner: learner as Learner, submissions: (submissions as Submission[]) ?? [] };
}

export async function requireLearner() {
  const result = await getLearnerState();
  if (result.state === "signed-out") redirect("/learn/login");
  return result;
}
