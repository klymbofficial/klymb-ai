import "server-only";
import type { Db } from "@/lib/db/client";
import { internCodeOf, makeInternCode } from "@/lib/internship";

/** The intern behind a code, if it's live. `error.code` 42P01 means the migration hasn't run. */
export function findInternCode(sql: Db, code: string) {
  return sql.row<{ code: string; email: string }>`
    select code, email from course.intern_codes where code = ${code} and active
  `;
}

/** A code for this person: their existing one, or a new one from their name. */
export async function ensureInternCode(sql: Db, p: { email: string; name: string; by: string }): Promise<string | null> {
  const { data: have, error } = await sql.row<{ code: string }>`select code from course.intern_codes where email = ${p.email}`;
  if (error) return null;
  if (have) {
    await sql.run`update course.intern_codes set active = true where email = ${p.email}`;
    return have.code;
  }
  for (let i = 0; i < 8; i++) {
    const code = internCodeOf(makeInternCode(p.name));
    if (!code) continue;
    const { data } = await sql.row<{ code: string }>`
      insert into course.intern_codes (code, email, created_by) values (${code}, ${p.email}, ${p.by})
      on conflict do nothing returning code
    `;
    if (data) return data.code;
  }
  return null;
}
