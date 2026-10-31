"use server";

import { revalidatePath } from "next/cache";
import { site } from "@/data/config";
import { grievance } from "@/data/legal";
import { getAdmin } from "@/lib/admin/auth";
import { logAdmin } from "@/lib/admin/audit";
import { brandColor, companyName, companySlug, firstHrBlocked, hrEmail, logoUrl, personName, seatCount } from "@/lib/admin/companies";
import { db } from "@/lib/db/client";
import { noteEmail, sendMail } from "@/lib/mail";

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
           (select count(*)::int from course.company_members m where m.company_id = c.id) as members
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
       and ${seats.value} >= (select count(*) from course.company_members m where m.company_id = ${id})
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
 * Any admin, and only while the company has no HR person yet. After that HR
 * manages their own people. Needs a free seat, and the email must not be a
 * Klymb learner or already in a company.
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
    name: string; seat_count: number; members: number; has_hr: boolean; is_learner: boolean; member_of: string | null;
  }>`
    select c.name, c.seat_count,
           (select count(*)::int from course.company_members m where m.company_id = c.id) as members,
           exists (select 1 from course.company_members m where m.company_id = c.id and m.role = 'hr') as has_hr,
           exists (select 1 from course.learners l where l.email = ${email.value}) as is_learner,
           (select o.slug from course.company_members m join course.companies o on o.id = m.company_id
             where m.email = ${email.value}) as member_of
      from course.companies c where c.id = ${id}
  `;
  if (readError) return UNAVAILABLE;
  if (!c) return GONE;
  const blocked = firstHrBlocked({ seatCount: c.seat_count, members: c.members, hasHr: c.has_hr, isLearner: c.is_learner, memberOf: c.member_of });
  if (blocked) return { ok: false, message: blocked };

  // The same rules again inside the insert, so nothing changed since the read
  // above can slip through. (Two admins adding HR in the same instant could
  // still both succeed; rare enough for an admin-only form.)
  const { data: count, error } = await sql.run`
    insert into course.company_members (email, company_id, role, name)
    select ${email.value}, c.id, 'hr', ${name}
      from course.companies c
     where c.id = ${id}
       and (select count(*) from course.company_members m where m.company_id = c.id) < c.seat_count
       and not exists (select 1 from course.company_members m where m.company_id = c.id and m.role = 'hr')
       and not exists (select 1 from course.learners l where l.email = ${email.value})
  `;
  if (error?.code === "23505") return { ok: false, message: "That email already belongs to a company. A person can only be in one." };
  if (error) {
    console.error("company HR add failed:", error.code, error.message);
    return { ok: false, message: "That could not be saved." };
  }
  if (!count) return { ok: false, message: "Something changed meanwhile. Reload and try again." };
  await logAdmin(admin, "company.hr_add", id, { email: email.value, ...(name ? { name } : {}) });

  // Adding them has worked by now; the email is a courtesy and never undoes it.
  const mail = noteEmail({
    subject: `You've been added to ${c.name} on Klymb.ai`,
    preview: `You're the HR contact for ${c.name}.`,
    eyebrow: "You're invited",
    title: name ? `Welcome, ${name}.` : "Welcome to Klymb.ai.",
    intro: `You've been added as the HR contact for ${c.name} on Klymb.ai.`,
    heading: "Getting started",
    points: [
      { title: "Open the sign-in page", body: `Go to ${site.url}/org/sign-in.` },
      { title: "Use this email", body: `Enter ${email.value}. We'll email you a 6-digit code: no password needed.` },
    ],
    cta: { href: `${site.url}/org/sign-in`, label: "Sign in" },
    siteUrl: site.url,
    supportEmail: grievance.email,
  });
  const sent = await sendMail({ to: { email: email.value, ...(name ? { name } : {}) }, ...mail });
  if (!sent.ok) console.error("company HR invite email failed:", sent.reason);

  revalidatePath("/admin/companies");
  return {
    ok: true,
    message: sent.ok
      ? `${email.value} is the HR person and has been emailed how to sign in.`
      : `${email.value} is the HR person. The invite email couldn't be sent, so tell them to sign in at /org/sign-in.`,
  };
}
