import "server-only";
import { redirect } from "next/navigation";
import { cache } from "react";
import { currentEmail } from "@/auth";
import { normaliseEmail } from "@/lib/email";
import { db } from "@/lib/db/client";

export interface AdminSession {
  email: string;
  name: string | null;
}

/**
 * Data Access Layer: every admin read goes through here.
 *
 * Admin status is read from admin_users on each request: never from an env
 * list and never cached in the session token, so revoking a row takes effect
 * immediately and there is only one authority.
 *
 * `cache` memoises it for the length of one request only: the layout and
 * every data function on the page all ask, and without it each one paid a
 * separate database round trip. Nothing is shared across requests.
 */
export const getAdmin = cache(async (): Promise<AdminSession | null> => {
  const email = normaliseEmail(await currentEmail());
  if (!email) return null;

  const sql = db();
  if (!sql) return null;

  // Exact match only: ILIKE would treat % and _ in a stored row as wildcards.
  const { data } = await sql.row<{ email: string; name: string | null }>`
    select email, name from course.admin_users where email = ${email}
  `;

  return data ? { email: data.email, name: data.name } : null;
});

/** Use at the top of every admin page. Redirects instead of rendering. */
export async function requireAdmin(): Promise<AdminSession> {
  const admin = await getAdmin();
  if (!admin) redirect("/admin/login");
  return admin;
}
