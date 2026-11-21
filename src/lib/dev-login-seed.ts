import "server-only";
import { db } from "@/lib/db/client";
import { devLoginEnabled, type DevUser } from "@/lib/dev-login";

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
      if (user.ownCourse) {
        await sql.rows`
          insert into course.enrollments (email, course, status, source)
          values (${user.email}, 'system-design', 'active', 'grant')
          on conflict (email, course) do update set status = 'active'
        `;
      }
      for (const { company, roles } of user.memberships ?? []) {
        const { data } = await sql.rows<{ id: string }>`
          insert into course.companies (slug, name, seat_count)
          values (${company.slug}, ${company.name}, 10)
          on conflict (slug) do update set name = excluded.name, seat_count = greatest(course.companies.seat_count, 10)
          returning id
        `;
        const companyId = data?.[0]?.id;
        if (!companyId) continue;
        if (company.brand) {
          // Only the first time: anything changed on the Branding page since is kept.
          const brand = JSON.stringify({ ...company.brand, logo: null });
          await sql.rows`
            insert into course.company_branding (company_id, draft, draft_updated_at, draft_updated_by, published, published_at, published_by)
            values (${companyId}, ${brand}::jsonb, now(), 'dev sign-in', ${brand}::jsonb, now(), 'dev sign-in')
            on conflict (company_id) do nothing
          `;
        }
        // The old role column, for a database before 0047; its trigger keeps it right after.
        const legacy = roles.includes("admin") ? "hr" : "employee";
        await sql.rows`
          insert into course.company_members (email, company_id, role, name)
          values (${user.email}, ${companyId}, ${legacy}, ${user.name})
          on conflict (company_id, email) do update set removed_at = null
        `;
        await sql.rows`
          insert into course.company_member_roles (company_id, email, role, granted_by)
          select ${companyId}, ${user.email}, r, 'dev sign-in' from unnest(${[...roles]}::text[]) as r
          on conflict (company_id, email, role) do nothing
        `;
      }
      return;
    }
    default:
      return;
  }
}
