import "server-only";
import { type Db, db } from "@/lib/db/client";
import { type EnrolmentClient } from "@/lib/learner/enrolment";

/**
 * The real EnrolmentClient. Kept apart from enrolment.ts so the enrolment rule
 * itself stays testable without a database.
 */
export function enrolmentClient(sql: Db): EnrolmentClient {
  return {
    async findLearner(email) {
      const { data } = await sql.row<{ id: string }>`
        select id from course.learners where email = ${email}
      `;
      return data;
    },
    findPlatformUserId: (email) => platformUserId(sql, email),
    async insertLearner(values) {
      const { error } = await sql.run`
        insert into course.learners (email, name, track, cohort_start, user_id, github_username, github_url)
        values (
          ${values.email}, ${values.name}, ${values.track}, ${values.cohort_start},
          ${values.user_id ?? null}, ${values.github_username ?? null}, ${values.github_url ?? null}
        )
      `;
      return { error };
    },
  };
}

/**
 * The platform user holding this address.
 *
 * The one thing this app reads outside its own schema, and the only reason it
 * is granted anything on public."User" at all — a column grant on (id, email),
 * so `select *` on that table is refused. Reads only: a course registration
 * never creates an app.klymb.ai account.
 *
 * Both sides store addresses lowercased, so this is an equality match.
 */
export async function platformUserId(sql: Db, email: string): Promise<string | null> {
  const { data } = await sql.row<{ id: string }>`
    select id from public."User" where email = ${email}
  `;
  return data?.id ?? null;
}

/** The client, or null when DATABASE_URL is unset. */
export function enrolment(): { sql: Db; client: EnrolmentClient } | null {
  const sql = db();
  return sql ? { sql, client: enrolmentClient(sql) } : null;
}
