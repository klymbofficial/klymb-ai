import type { Db } from "@/lib/db/client";
import type { CodeStore } from "@/lib/company/signin-code";

/**
 * The sign-in code store on course.company_signin_codes. Kept apart from
 * the server-only wiring so it can be tested against a real Postgres.
 * Every failure reads as "no", so sign-in fails closed.
 */
export function codeStore(sql: Pick<Db, "row" | "run">): CodeStore {
  return {
    async isMember(email) {
      const { data, error } = await sql.row<{ email: string }>`
        select email from course.company_members where email = ${email}
      `;
      if (error) return null;
      return data !== null;
    },

    async save(email, hash, expiresAt) {
      const { error } = await sql.run`
        insert into course.company_signin_codes (email, code_hash, expires_at, attempts, created_at)
        values (${email}, ${hash}, ${expiresAt.toISOString()}, 0, now())
        on conflict (email) do update
          set code_hash = excluded.code_hash, expires_at = excluded.expires_at, attempts = 0, created_at = now()
      `;
      return !error;
    },

    async takeAttempt(email, maxAttempts, now) {
      // One statement, so two guesses at once can't both get the last try.
      const { data, error } = await sql.row<{ code_hash: string }>`
        update course.company_signin_codes
           set attempts = attempts + 1
         where email = ${email} and attempts < ${maxAttempts} and expires_at > ${now.toISOString()}
        returning code_hash
      `;
      return error ? null : (data?.code_hash ?? null);
    },

    async consume(email, hash) {
      const { data, error } = await sql.run`
        delete from course.company_signin_codes where email = ${email} and code_hash = ${hash}
      `;
      return !error && data === 1;
    },
  };
}
