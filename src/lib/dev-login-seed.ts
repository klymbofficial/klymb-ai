import "server-only";
import { db } from "@/lib/db/client";
import { DEV_COMPANY, devLoginEnabled, type DevUser } from "@/lib/dev-login";

/**
 * Gives a dev person what their role needs, on the database this environment
 * points at. Idempotent: every statement is an upsert or does nothing when the
 * row is there, so it is safe on every sign-in. Only the dev addresses in
 * DEV_USERS ever reach here, and only while devLoginEnabled().
 *
 * Errors are swallowed on purpose: a missing table (migration not run) should
 * not stop someone signing in; the page that needs the row will say so.
 */
export async function ensureDevUser(user: DevUser): Promise<void> {
  if (!devLoginEnabled()) return;
  const sql = db();
  if (!sql) return;

  switch (user.role) {
    case "learner-paid":
      await sql.rows`
        insert into course.enrollments (email, course, status, source)
        values (${user.email}, 'system-design', 'active', 'grant')
        on conflict (email, course) do update set status = 'active'
      `;
      return;
    case "admin":
      await sql.rows`
        insert into course.admin_users (email, name)
        values (${user.email}, ${user.name})
        on conflict (email) do nothing
      `;
      return;
    case "company": {
      const company = user.company ?? DEV_COMPANY;
      const { data } = await sql.rows<{ id: string }>`
        insert into course.companies (slug, name)
        values (${company.slug}, ${company.name})
        on conflict (slug) do update set name = excluded.name
        returning id
      `;
      const companyId = data?.[0]?.id;
      if (!companyId) return;
      await sql.rows`
        insert into course.company_members (email, company_id, role, name)
        values (${user.email}, ${companyId}, 'hr', ${user.name})
        on conflict (email) do update set removed_at = null
      `;
      return;
    }
    default:
      return;
  }
}
