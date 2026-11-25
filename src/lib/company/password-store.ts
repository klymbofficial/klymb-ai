import type { Db } from "@/lib/db/client";
import type { PasswordStore } from "@/lib/company/password-rules";

/**
 * The password store on course.company_passwords. Kept apart from the
 * server-only wiring so it can be tested against a real Postgres. A failure
 * reads as null or false, so sign-in fails closed.
 */
export function passwordStore(sql: Pick<Db, "row" | "run">): PasswordStore {
  return {
    async find(email) {
      // Only while the person is an active member somewhere: a removed member's password stops working.
      const { data, error } = await sql.row<{ password_hash: string }>`
        select p.password_hash from course.company_passwords p
         where p.email = ${email}
           and exists (select 1 from course.company_members m where m.email = p.email and m.removed_at is null)
      `;
      if (error) return null;
      return { hash: data?.password_hash ?? null };
    },

    async save(email, hash) {
      const { error } = await sql.run`
        insert into course.company_passwords (email, password_hash, updated_at)
        values (${email}, ${hash}, now())
        on conflict (email) do update set password_hash = excluded.password_hash, updated_at = now()
      `;
      return !error;
    },
  };
}

/** When the person last set their password; null when they have none, undefined when the read failed. */
export async function passwordSetAt(sql: Pick<Db, "row">, email: string): Promise<Date | null | undefined> {
  const { data, error } = await sql.row<{ updated_at: Date | string }>`
    select updated_at from course.company_passwords where email = ${email}
  `;
  if (error) return undefined;
  return data ? new Date(data.updated_at) : null;
}
