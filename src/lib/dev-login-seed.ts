import "server-only";
import { db } from "@/lib/db/client";
import { CODE_ITEMS } from "@/data/business-catalog";
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
      for (const { company, roles, team, leads } of user.memberships ?? []) {
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
        // A dev team, made the first time anyone on it signs in.
        let teamId: string | null = null;
        if (team) {
          const t = await sql.row<{ id: string }>`
            insert into course.teams (company_id, name) values (${companyId}, ${team})
            on conflict (company_id, name) do update set name = excluded.name
            returning id
          `;
          teamId = t.data?.id ?? null;
        }
        // The old role column, for a database before 0047; its trigger keeps it right after.
        const legacy = roles.includes("admin") ? "hr" : "employee";
        await sql.rows`
          insert into course.company_members (email, company_id, role, name, team_id)
          values (${user.email}, ${companyId}, ${legacy}, ${user.name}, ${teamId}::uuid)
          on conflict (company_id, email) do update
             set removed_at = null, team_id = coalesce(course.company_members.team_id, excluded.team_id)
        `;
        if (leads && teamId) {
          // One lead per team: if someone else already leads it, this does nothing.
          await sql.rows`
            insert into course.company_member_roles (company_id, email, role, team_id, granted_by)
            select ${companyId}, ${user.email}, 'team_lead', ${teamId}::uuid, 'dev sign-in'
             where not exists (select 1 from course.company_member_roles
                                where company_id = ${companyId} and role = 'team_lead' and team_id = ${teamId}::uuid)
            on conflict (company_id, email, role) do nothing
          `;
        }
        await sql.rows`
          insert into course.company_member_roles (company_id, email, role, granted_by)
          select ${companyId}, ${user.email}, r, 'dev sign-in' from unnest(${[...roles]}::text[]) as r
          on conflict (company_id, email, role) do nothing
        `;
        // Every Klymb catalog item is given to the dev companies, so their Catalog has
        // something in it once a dev admin publishes at /admin/catalog. Never
        // published here: a preview shares production's database, and publishing
        // is global. An item nobody has saved yet gets its draft row first.
        for (const item of CODE_ITEMS) {
          await sql.rows`
            with saved as (
              insert into course.catalog_items (slug, kind, skills, purposes, updated_by)
              values (${item.slug}, ${item.kind}, ${[...item.suggestedSkills]}::text[], ${[...item.suggestedPurposes]}::text[], 'dev sign-in')
              on conflict (slug) do nothing
            )
            insert into course.company_catalog_grants (company_id, item_slug, granted_by)
            values (${companyId}, ${item.slug}, 'dev sign-in')
            on conflict (company_id, item_slug) do nothing
          `;
        }
      }
      return;
    }
    default:
      return;
  }
}
