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
  /** The learner's existing place, if they have one. */
  findLearner(email: string): Promise<{ id: string } | null>;
  /**
   * The app.klymb.ai user holding this address, so a course place is attached
   * to the real account rather than only matching on the string. Null when
   * they have no platform account yet, which is not a problem: the address is
   * still the identity everything authorises against.
   */
  findPlatformUserId(email: string): Promise<string | null>;
  insertLearner(values: Record<string, unknown>): Promise<{ error: { code?: string } | null }>;
}

/** Postgres unique violation: the row already exists, which is success here. */
export const UNIQUE_VIOLATION = "23505";

/**
 * Idempotent: a repeat registration never creates a second learner.
 * Returns true when a place exists afterwards, false when it does not.
 */
export async function ensureLearner(client: EnrolmentClient, input: EnrolInput): Promise<boolean> {
  if (await client.findLearner(input.email)) return true;

  const { error } = await client.insertLearner({
    email: input.email,
    name: input.name,
    track: input.track,
    cohort_start: input.cohortStart,
    user_id: await client.findPlatformUserId(input.email),
    ...(input.githubUsername ? { github_username: input.githubUsername, github_url: input.githubUrl ?? null } : {}),
  });

  if (!error) return true;
  // Someone else inserted the same address between our check and our insert.
  if (error.code === UNIQUE_VIOLATION) return true;

  console.error("enrolment failed:", error.code);
  return false;
}
