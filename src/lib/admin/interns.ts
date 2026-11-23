import "server-only";
import { getSalesAdmin, getSalesUser } from "@/lib/admin/auth";
import { db } from "@/lib/db/client";
import type { CreditedSale, Payout } from "@/lib/internship";

export interface Intern { code: string; email: string; name: string | null; active: boolean; visits: number }
export interface InternBoard { interns: Intern[]; sales: CreditedSale[]; payouts: Payout[] }

/**
 * Interns with their codes, how many people opened their link, every sale
 * credited to them and every payout. `email` narrows it to one intern.
 * Null when the tables aren't there (migration 0045 not run).
 */
async function board(email: string | null): Promise<InternBoard | null> {
  const sql = db();
  if (!sql) return { interns: [], sales: [], payouts: [] };
  const [interns, sales, payouts] = await Promise.all([
    sql.rows<Intern>`
      select c.code, c.email, coalesce(r.name, a.name) as name, c.active,
             (select count(distinct e.anon_id)::int from course.sd_events e
               where e.event = 'offer' and e.step = 'view' and e.props->>'intern' = c.code) as visits
        from course.intern_codes c
        left join course.sales_reps r on r.email = c.email
        left join lateral (select name from course.internship_applications x where x.email = c.email order by created_at desc limit 1) a on true
       where (${email}::text is null or c.email = ${email})
       order by c.created_at
    `,
    sql.rows<CreditedSale>`
      select p.intern_code, coalesce(p.amount_inr, case when p.currency = 'INR' then p.amount else 0 end) as amount, p.status, p.created_at, p.email
        from course.payments p
        join course.intern_codes c on c.code = p.intern_code
       where p.intern_code is not null and (${email}::text is null or c.email = ${email})
       order by p.created_at desc
    `,
    sql.rows<Payout>`
      select email, month::text as month, amount, paid_at, method, reference
        from course.intern_payouts
       where (${email}::text is null or email = ${email})
       order by paid_at desc
    `,
  ]);
  const error = interns.error ?? sales.error ?? payouts.error;
  if (error) {
    console.error("intern board read failed:", error.code, error.message);
    return null;
  }
  return { interns: interns.data ?? [], sales: sales.data ?? [], payouts: payouts.data ?? [] };
}

/** Every intern, for owners and sales managers. */
export async function getInternBoard() {
  return (await getSalesAdmin()) ? board(null) : null;
}

/** The signed-in intern's own code, sales and payouts, for their /sales page. Null if they have no code. */
export async function getMyInternStats() {
  const user = await getSalesUser();
  if (!user) return null;
  const b = await board(user.email);
  return b && b.interns.length ? b : null;
}

/** Active sales reps who have no personal link yet. */
export async function getRepsWithoutLink(): Promise<{ email: string; name: string | null }[]> {
  if (!(await getSalesAdmin())) return [];
  const sql = db();
  if (!sql) return [];
  const { data } = await sql.rows<{ email: string; name: string | null }>`
    select r.email, r.name from course.sales_reps r
     where r.active and not exists (select 1 from course.intern_codes c where c.email = r.email)
     order by coalesce(r.name, r.email)
  `;
  return data ?? [];
}
