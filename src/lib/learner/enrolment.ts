/**
 * Enrolment, done in trusted server code.
 *
 * Previously a SECURITY DEFINER function was executable by anon, so anyone
 * could probe whether an address was registered and mint a learner row for it.
 * The rule now lives here, behind the service-role client, and is only reached
 * from the registration server action.
 */

export interface EnrolInput {
  email: string;
  name: string;
  track: string;
  cohortStart: string;
  /** From the registration's course repository, so submissions are checked against it from Day 1. */
  githubUsername?: string;
  githubUrl?: string;
}

/**
 * The minimum surface we need, so this is testable without a live database.
 * Implemented for real in ./enrolment-db.ts; this module stays free of any
 * database import so the tests can exercise the rule on its own.
 */
export interface EnrolmentClient {
  /** The learner's existing place on this track, if they have one. */
  findLearner(email: string, track: string): Promise<{ id: string } | null>;
  /**
   * The profile links from another of this person's tracks, so a second track
   * starts with the GitHub and LinkedIn they already gave. Null on a first track.
   */
  findProfileLinks(email: string): Promise<ProfileLinks | null>;
  /**
   * The app.klymb.ai user holding this address, so a course place is attached
   * to the real account rather than only matching on the string. Null when
   * they have no platform account yet, which is not a problem: the address is
   * still the identity everything authorises against.
   */
  findPlatformUserId(email: string): Promise<string | null>;
  insertLearner(values: Record<string, unknown>): Promise<{ error: { code?: string } | null }>;
}

export interface ProfileLinks {
  github_username: string | null;
  github_url: string | null;
  linkedin_slug: string | null;
  linkedin_url: string | null;
}

/** Postgres unique violation: the row already exists, which is success here. */
export const UNIQUE_VIOLATION = "23505";

/**
 * What enrolling did: a place made just now, a place that was already there,
 * or nothing because the write failed. Callers that greet a new learner (the
 * welcome email) need to tell the first from the second.
 */
export type EnrolOutcome = "created" | "existing" | "failed";

/**
 * One place per person per track. Idempotent: registering for the same track
 * again never creates a second learner, while a different track adds one, with
 * the GitHub and LinkedIn from their earlier track carried over. The
 * registration's own repository owner wins over the carried GitHub.
 * Returns true when a place on this track exists afterwards, false when not.
 */
export async function ensureLearner(client: EnrolmentClient, input: EnrolInput): Promise<boolean> {
  return (await enrolLearner(client, input)) !== "failed";
}

/**
 * The rule behind ensureLearner, saying whether this call made the place. When
 * two requests race, only the one whose insert went through reports "created",
 * so only one of them sends a welcome.
 */
export async function enrolLearner(client: EnrolmentClient, input: EnrolInput): Promise<EnrolOutcome> {
  if (await client.findLearner(input.email, input.track)) return "existing";

  const carried = await client.findProfileLinks(input.email);
  const github = input.githubUsername
    ? { github_username: input.githubUsername, github_url: input.githubUrl ?? null }
    : carried?.github_username ? { github_username: carried.github_username, github_url: carried.github_url } : {};
  const { error } = await client.insertLearner({
    email: input.email,
    name: input.name,
    track: input.track,
    cohort_start: input.cohortStart,
    user_id: await client.findPlatformUserId(input.email),
    ...github,
    ...(carried?.linkedin_slug ? { linkedin_slug: carried.linkedin_slug, linkedin_url: carried.linkedin_url } : {}),
  });

  if (!error) return "created";
  // Someone else inserted this track between our check and our insert, which
  // is success. Before the several-tracks migration has run, a second track
  // also collides here, on the old one-row-per-email rule: that is not success.
  if (error.code === UNIQUE_VIOLATION) return (await client.findLearner(input.email, input.track)) ? "existing" : "failed";

  console.error("enrolment failed:", error.code);
  return "failed";
}
