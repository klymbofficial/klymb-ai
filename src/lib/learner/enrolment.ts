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
}

/**
 * The minimum surface we need, so this is testable without a live database.
 * Results are PromiseLike because Supabase query builders are thenables.
 */
export interface EnrolmentClient {
  from(table: string): {
    select(columns: string): {
      eq(column: string, value: string): {
        maybeSingle(): PromiseLike<{ data: unknown; error: unknown }>;
      };
    };
    insert(values: Record<string, unknown>): PromiseLike<{ error: { code?: string } | null }>;
  };
}

/** Postgres unique violation — the row already exists, which is success here. */
export const UNIQUE_VIOLATION = "23505";

/**
 * Idempotent: a repeat registration never creates a second learner.
 * Returns true when a place exists afterwards, false when it does not.
 */
export async function ensureLearner(client: EnrolmentClient, input: EnrolInput): Promise<boolean> {
  const existing = await client.from("learners").select("id").eq("email", input.email).maybeSingle();
  if (existing.data) return true;

  const { error } = await client.from("learners").insert({
    email: input.email,
    name: input.name,
    track: input.track,
    cohort_start: input.cohortStart,
  });

  if (!error) return true;
  // Someone else inserted the same address between our check and our insert.
  if (error.code === UNIQUE_VIOLATION) return true;

  console.error("enrolment failed:", error.code);
  return false;
}
