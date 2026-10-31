import "server-only";
import { getAdmin } from "@/lib/admin/auth";
import { db } from "@/lib/db/client";

export interface CompanyRow {
  id: string;
  slug: string;
  name: string;
  brand_color: string | null;
  logo_url: string | null;
  seat_count: number;
  created_at: string;
  members: number;
  hr_email: string | null;
  hr_name: string | null;
}

/** Every company with its seat use and first HR person, newest first. Admins only. */
export async function getCompanies(): Promise<CompanyRow[] | null> {
  if (!(await getAdmin())) return null;
  const sql = db();
  if (!sql) return null;
  const { data, error } = await sql.rows<CompanyRow>`
    select c.id, c.slug, c.name, c.brand_color, c.logo_url, c.seat_count, c.created_at,
           (select count(*)::int from course.company_members m where m.company_id = c.id) as members,
           hr.email as hr_email, hr.name as hr_name
      from course.companies c
      left join lateral (
        select m.email, m.name from course.company_members m
         where m.company_id = c.id and m.role = 'hr'
         order by m.added_at
         limit 1
      ) hr on true
     order by c.created_at desc
  `;
  return error ? null : (data ?? []);
}
