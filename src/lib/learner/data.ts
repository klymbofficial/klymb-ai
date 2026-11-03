import "server-only";
import { redirect } from "next/navigation";
import { cache } from "react";
import { auth, verifiedEmailFrom } from "@/auth";
import { db } from "@/lib/db/client";
import { checkDevice } from "@/lib/learner/device";
import { normaliseEmail } from "@/lib/email";
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
  /** Signed in, but another device holds this learner's one device slot. */
  | { state: "other-device" }
  /** Signed in with no track, or (when a track was asked for) not on that one. */
  | { state: "not-enrolled"; email: string; tracks: TrackSlug[] }
  | {
      state: "enrolled";
      /** The track asked for, or else the one started most recently. */
      learner: Learner;
      submissions: Submission[];
      /** Every track this person is on, most recent first. */
      tracks: TrackSlug[];
      /** Stable per person whatever the track: their first track's row id. */
      personId: string;
    };

type LearnerRow = Learner & { device_session: string | null; device_seen_at: string | null };

type Enrolments =
  | { state: "signed-out" }
  | { state: "other-device" }
  | { state: "not-enrolled"; email: string }
  | { state: "enrolled"; email: string; rows: LearnerRow[]; personId: string };

/**
 * Every track place the signed-in user holds, once the one-device check has
 * passed. A person has one row per track; the device slot is theirs, not the
 * track's, so it is checked once across all of them.
 *
 * Identity is the Google-verified email on the session; rows are matched on
 * that email, so an enrolment created before their first sign-in still finds
 * them.
 */
const getEnrolments = cache(async (): Promise<Enrolments> => {
  const session = await auth();
  const email = normaliseEmail(verifiedEmailFrom(session));
  if (!email) return { state: "signed-out" };
  // Sessions from before the one-device lock carry no device id: sign in again to claim one.
  if (!session?.user?.sid) return { state: "signed-out" };

  const sql = db();
  if (!sql) return { state: "signed-out" };

  // Exact match only: ownership of a track place must not be fuzzy.
  const { data: rows } = await sql.rows<LearnerRow & { created_at: string }>`
    select id, name, email, track, cohort_start, status, github_url, linkedin_url,
           github_username, linkedin_slug, device_session, device_seen_at, created_at
      from course.learners
     where email = ${email}
     order by created_at desc
  `;
  if (!rows?.length) return { state: "not-enrolled", email };

  // The slot as it stands across their rows: the most recently used one wins.
  const slot = [...rows].sort((a, b) => (b.device_seen_at ?? "").localeCompare(a.device_seen_at ?? ""))[0];
  if (!(await checkDevice({ email, device_session: slot.device_session, device_seen_at: slot.device_seen_at }, session?.user?.sid))) {
    return { state: "other-device" };
  }
  return { state: "enrolled", email, rows, personId: rows[rows.length - 1].id };
});

async function submissionsOf(learnerId: string): Promise<Submission[]> {
  const sql = db();
  if (!sql) return [];
  const { data } = await sql.rows<Submission>`
    select day, deliverable_url, note, status, submitted_at, reviewer_note, quiz_answers, linkedin_post_url
      from course.day_submissions
     where learner_id = ${learnerId}
     order by day
  `;
  return data ?? [];
}

/**
 * Resolves the signed-in user to one of their track places: `track` when it
 * is given, otherwise the track they started most recently.
 */
export const getLearnerState = cache(async (track?: string): Promise<LearnerState> => {
  const e = await getEnrolments();
  if (e.state === "signed-out") return { state: "signed-out" };
  if (e.state === "other-device") return { state: "other-device" };
  if (e.state === "not-enrolled") return { state: "not-enrolled", email: e.email, tracks: [] };

  const tracks = e.rows.map((r) => r.track);
  const row = track ? e.rows.find((r) => r.track === track) : e.rows[0];
  if (!row) return { state: "not-enrolled", email: e.email, tracks };
  return { state: "enrolled", learner: row, submissions: await submissionsOf(row.id), tracks, personId: e.personId };
});

/** All of the signed-in person's track places with their submissions, most recent first, for the dashboard. */
export const getLearnerTracks = cache(async (): Promise<{ learner: Learner; submissions: Submission[] }[]> => {
  const e = await getEnrolments();
  if (e.state !== "enrolled") return [];
  return Promise.all(e.rows.map(async (learner) => ({ learner, submissions: await submissionsOf(learner.id) })));
});

export async function requireLearner(track?: string) {
  const result = await getLearnerState(track);
  if (result.state === "signed-out") redirect("/learn/login");
  if (result.state === "other-device") redirect("/learn/login?error=device");
  return result;
}
