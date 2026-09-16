import "server-only";
import { redirect } from "next/navigation";
import { currentEmail } from "@/auth";
import { createServiceClient } from "@/lib/supabase/admin";
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
  github_username: string | null;
  linkedin_slug: string | null;
}

export interface Submission {
  day: number;
  quiz_answers: string[] | null;
  linkedin_post_url: string | null;
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

const LEARNER_FIELDS = "id, name, email, track, cohort_start, status, github_url, linkedin_url, github_username, linkedin_slug";

/**
 * Resolves the signed-in user to their cohort place.
 *
 * Identity is the Google-verified email on the session; the learner row is
 * matched on that email, so an enrolment created before their first sign-in
 * still finds them.
 */
export async function getLearnerState(): Promise<LearnerState> {
  const email = await currentEmail();
  if (!email) return { state: "signed-out" };

  const supabase = createServiceClient();
  if (!supabase) return { state: "signed-out" };

  const { data: learner } = await supabase
    .from("learners")
    .select(LEARNER_FIELDS)
    .ilike("email", email)
    .maybeSingle();

  if (!learner) return { state: "not-enrolled", email };

  const { data: submissions } = await supabase
    .from("day_submissions")
    .select("day, deliverable_url, note, status, submitted_at, reviewer_note, quiz_answers, linkedin_post_url")
    .eq("learner_id", learner.id)
    .order("day");

  return { state: "enrolled", learner: learner as Learner, submissions: (submissions as Submission[]) ?? [] };
}

export async function requireLearner() {
  const result = await getLearnerState();
  if (result.state === "signed-out") redirect("/learn/login");
  return result;
}
