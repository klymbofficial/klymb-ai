"use server";

import { revalidatePath } from "next/cache";
import { getAdmin } from "@/lib/admin/auth";
import { logAdmin } from "@/lib/admin/audit";
import { brandColor, companyName, companySlug, firstHrBlocked, hrEmail, logoUrl, personName, seatCount } from "@/lib/admin/companies";
import { loadCompanyBrand, sendCompanyInvite } from "@/lib/company/invite";
import { db } from "@/lib/db/client";

export type CompanyResult = { ok: true; message?: string } | { ok: false; message: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const UNAVAILABLE: CompanyResult = { ok: false, message: "Unavailable right now." };
const NOT_ALLOWED: CompanyResult = { ok: false, message: "Not authorised." };
const GONE: CompanyResult = { ok: false, message: "That company no longer exists." };

/** Any admin. A new company starts with no seats, no logo and Klymb's color. */
export async function createCompany(rawName: string, rawSlug: string): Promise<CompanyResult> {
  const admin = await getAdmin();
  if (!admin) return NOT_ALLOWED;
  const name = companyName(rawName);
  if (!name.ok) return name;
  const slug = companySlug(rawSlug);
  if (!slug.ok) return slug;

  const sql = db();
  if (!sql) return UNAVAILABLE;
  const { data, error } = await sql.row<{ id: string }>`
    insert into course.companies (name, slug) values (${name.value}, ${slug.value}) returning id
  `;
  if (error?.code === "23505") return { ok: false, message: `The URL name "${slug.value}" is already used by another company.` };
  if (error || !data) {
    console.error("company create failed:", error?.code, error?.message);
    return { ok: false, message: "That could not be saved." };
  }
  await logAdmin(admin, "company.create", data.id, { name: name.value, slug: slug.value });
  revalidatePath("/admin/companies");
  return { ok: true };
}

/** Any admin. Logo link, color and seats, saved together. */
export async function updateCompanySettings(
  id: string,
  form: { logoUrl: string; brandColor: string; seatCount: string },
): Promise<CompanyResult> {
  const admin = await getAdmin();
  if (!admin) return NOT_ALLOWED;
  if (!UUID.test(id)) return GONE;
  const logo = logoUrl(form.logoUrl);
  if (!logo.ok) return logo;
  const color = brandColor(form.brandColor);
  if (!color.ok) return color;

  const sql = db();
  if (!sql) return UNAVAILABLE;
  const { data: current, error: readError } = await sql.row<{ members: number; logo_url: string | null; brand_color: string | null; seat_count: number }>`
    select c.logo_url, c.brand_color, c.seat_count,
           (select count(*)::int from course.company_members m where m.company_id = c.id and m.removed_at is null) as members
      from course.companies c where c.id = ${id}
  `;
  if (readError) return UNAVAILABLE;
  if (!current) return GONE;
  const seats = seatCount(form.seatCount, current.members);
  if (!seats.ok) return seats;

  // The seat rule is checked again inside the update, so a member added
  // since the read above can't leave the company over its seats.
  const { data: count, error } = await sql.run`
    update course.companies
       set logo_url = ${logo.value}, brand_color = ${color.value}, seat_count = ${seats.value}
     where id = ${id}
       and ${seats.value} >= (select count(*) from course.company_members m where m.company_id = ${id} and m.removed_at is null)
  `;
  if (error) {
    console.error("company update failed:", error.code, error.message);
    return { ok: false, message: "That could not be saved." };
  }
  if (!count) return { ok: false, message: "Someone joined the company meanwhile. Reload and check the seats." };

  const changed: Record<string, unknown> = {};
  if (current.logo_url !== logo.value) changed.logo_url = logo.value;
  if (current.brand_color !== color.value) changed.brand_color = color.value;
  if (current.seat_count !== seats.value) changed.seat_count = { from: current.seat_count, to: seats.value };
  if (Object.keys(changed).length) await logAdmin(admin, "company.update", id, changed);

  revalidatePath("/admin/companies");
  return { ok: true };
}

/**
 * Any admin, and only while the company has no admin of its own yet. After
 * that the company's admin manages their own people. Needs a free seat. The
 * email may be a Klymb learner or in another company already.
 */
export async function addFirstHr(id: string, rawEmail: string, rawName: string): Promise<CompanyResult> {
  const admin = await getAdmin();
  if (!admin) return NOT_ALLOWED;
  if (!UUID.test(id)) return GONE;
  const email = hrEmail(rawEmail);
  if (!email.ok) return email;
  const name = personName(rawName);

  const sql = db();
  if (!sql) return UNAVAILABLE;
  const { data: c, error: readError } = await sql.row<{
    name: string; logo_url: string | null; brand_color: string | null;
    seat_count: number; members: number; has_hr: boolean; in_company: boolean;
  }>`
    select c.name, c.logo_url, c.brand_color, c.seat_count,
           (select count(*)::int from course.company_members m where m.company_id = c.id and m.removed_at is null) as members,
           -- company_members.role is 'hr' for every admin (kept so by migration 0072's trigger).
           exists (select 1 from course.company_members m where m.company_id = c.id and m.role = 'hr' and m.removed_at is null) as has_hr,
           exists (select 1 from course.company_members m where m.company_id = c.id and m.email = ${email.value}) as in_company
      from course.companies c where c.id = ${id}
  `;
  if (readError) return UNAVAILABLE;
  if (!c) return GONE;
  const blocked = firstHrBlocked({ seatCount: c.seat_count, members: c.members, hasHr: c.has_hr, inCompany: c.in_company });
  if (blocked) return { ok: false, message: blocked };

  // The same rules again inside the insert, so nothing changed since the read
  // above can slip through. (Two admins adding HR in the same instant could
  // still both succeed; rare enough for an admin-only form.)
  const { data: count, error } = await sql.scalar<number>`
    with added as (
      insert into course.company_members (email, company_id, role, name)
      select ${email.value}, c.id, 'hr', ${name}
        from course.companies c
       where c.id = ${id}
         and (select count(*) from course.company_members m where m.company_id = c.id and m.removed_at is null) < c.seat_count
         and not exists (select 1 from course.company_members m where m.company_id = c.id and m.role = 'hr' and m.removed_at is null)
      returning email, company_id
    ), granted as (
      insert into course.company_member_roles (company_id, email, role, granted_by)
      select company_id, email, 'admin', ${admin.email} from added
      returning 1
    )
    select count(*)::int from added
  `;
  if (error?.code === "23505") return { ok: false, message: "That email is already in this company." };
  if (error) {
    console.error("company admin add failed:", error.code, error.message);
    return { ok: false, message: "That could not be saved." };
  }
  if (!count) return { ok: false, message: "Something changed meanwhile. Reload and try again." };
  await logAdmin(admin, "company.hr_add", id, { email: email.value, role: "admin", ...(name ? { name } : {}) });

  // Adding them has worked by now; the email is a courtesy and never undoes it.
  const sent = await sendCompanyInvite({
    email: email.value, name, role: "admin",
    company: (await loadCompanyBrand(sql, id)) ?? { name: c.name, logoUrl: c.logo_url, brandColor: c.brand_color },
  });

  revalidatePath("/admin/companies");
  return {
    ok: true,
    message: sent
      ? `${email.value} is the company's admin and has been emailed how to sign in.`
      : `${email.value} is the company's admin. The invite email couldn't be sent, so tell them to sign in at /org/sign-in.`,
  };
}
