import "server-only";
import { getAdmin } from "@/lib/admin/auth";
import { db } from "@/lib/db/client";

/**
 * Website forms become leads, the way a CRM's form capture works: every
 * course registration and System Design pre-registration turns into a lead
 * with source "website", dated when they filled the form in.
 *
 * Reads only rows newer than the last run (course.sales_sync_state, source
 * 'website'), so a lead the team deletes isn't brought back, and someone
 * already in the CRM by phone or email is left as they are. Cheap enough to
 * run on every Sales page load.
 */
export async function captureWebsiteLeads(opts: { cron?: boolean } = {}): Promise<number> {
  // Pages render alongside the layout's admin check, so check here too.
  if (!opts.cron && !(await getAdmin())) return 0;
  const sql = db();
  if (!sql) return 0;
  const { error: seedError } = await sql.run`
    insert into course.sales_sync_state (source) values ('website') on conflict (source) do nothing
  `;
  // Before 0032_sales_whatsapp_sync.sql has run there is nowhere to keep the cursor.
  if (seedError) return 0;

  const { data, error } = await sql.row<{ added: number; latest: string | null }>`
    with since as (
      select coalesce(nullif(cursor_at, ''), '1970-01-01T00:00:00Z')::timestamptz as t
        from course.sales_sync_state where source = 'website'
    ),
    forms as (
      select r.name, r.phone, lower(r.email) as email, 'Registered: ' || r.track as detail, r.created_at
        from course.registrations r, since where r.created_at > since.t
      union all
      select p.name, p.phone, p.email, 'System Design pre-registration', p.created_at
        from course.sd_preregistrations p, since where p.created_at > since.t
    ),
    clean as (
      select left(trim(name), 120) as name,
             case when length(d) = 10 then '91' || d
                  when length(d) = 11 and d like '0%' then '91' || substr(d, 2)
                  when length(d) between 8 and 15 then d end as phone,
             email, detail, created_at
        from (select *, regexp_replace(coalesce(phone, ''), '\\D', '', 'g') as d from forms) f
       where char_length(trim(name)) >= 1
    ),
    added as (
      insert into course.sales_leads (name, phone, email, source, source_detail, created_at, stage_changed_at, created_by)
      select name, phone, email, 'website', detail, created_at, created_at, 'website-form'
        from clean order by created_at
      on conflict do nothing
      returning 1
    )
    select (select count(*) from added)::int as added, (select max(created_at) from forms) as latest
  `;
  if (error) {
    console.error("website lead capture failed:", error.code, error.message);
    return 0;
  }
  if (data?.latest) {
    await sql.run`update course.sales_sync_state set cursor_at = ${data.latest}, synced_at = now() where source = 'website'`;
  }
  return data?.added ?? 0;
}
