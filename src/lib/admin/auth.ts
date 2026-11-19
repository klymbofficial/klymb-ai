import "server-only";
import { redirect } from "next/navigation";
import { cache } from "react";
import { currentAdminEmail } from "@/auth";
import { isSalesManager, resolveAdmin, type AdminIdentity } from "@/lib/admin/access";
import { db } from "@/lib/db/client";

export type AdminSession = AdminIdentity;

/**
 * Data Access Layer: every admin read goes through here.
 *
 * Admin status is read from admin_users on each request: never from an env
 * list and never cached in the session token, so revoking a row takes effect
 * immediately and there is only one authority. (ADMIN_OWNER_EMAILS only says
 * which admins may manage the others; it grants nothing by itself.)
 *
 * `cache` memoises it for the length of one request only: the layout and
 * every data function on the page all ask, and without it each one paid a
 * separate database round trip. Nothing is shared across requests.
 */
export const getAdmin = cache(async (): Promise<AdminSession | null> => {
  const sql = db();
  if (!sql) return null;

  // Google sign-ins only: see adminEmailFrom.
  return resolveAdmin(await currentAdminEmail(), async (email) => {
    // Exact match only: ILIKE would treat % and _ in a stored row as wildcards.
    const { data } = await sql.row<{ email: string; name: string | null }>`
      select email, name from course.admin_users where email = ${email}
    `;
    return data;
  });
});

/** Use at the top of every admin page. Redirects instead of rendering. */
export async function requireAdmin(): Promise<AdminSession> {
  const admin = await getAdmin();
  if (!admin) redirect("/admin/login");
  return admin;
}

/** For owner-only pages: admins who aren't owners go back to the overview. */
export async function requireOwner(): Promise<AdminSession> {
  const admin = await requireAdmin();
  if (!admin.owner) redirect("/admin");
  return admin;
}

/**
 * The whole Sales CRM is for owners and sales managers (SALES_MANAGER_EMAILS):
 * it holds every lead's number and notes. For server actions and data reads,
 * where redirecting isn't an option.
 */
export async function getSalesAdmin(): Promise<AdminSession | null> {
  const admin = await getAdmin();
  return admin && (admin.owner || isSalesManager(admin.email)) ? admin : null;
}

/** For the admin Sales pages: other admins go back to the overview. */
export async function requireSalesAdmin(): Promise<AdminSession> {
  const admin = await requireAdmin();
  if (!admin.owner && !isSalesManager(admin.email)) redirect("/admin");
  return admin;
}

/**
 * Who may work in Sales, and how much.
 *
 * An owner sees and changes everything. A rep (an intern in
 * course.sales_reps, active) signs in with Google like an admin but is not
 * one: they reach /sales only, and only the leads whose owner_email is theirs.
 * An owner who is also listed as a rep is treated as an owner.
 */
export interface SalesUser {
  email: string;
  name: string | null;
  role: "owner" | "rep";
}

export const getSalesUser = cache(async (): Promise<SalesUser | null> => {
  const admin = await getSalesAdmin();
  if (admin) return { email: admin.email, name: admin.name, role: "owner" };
  const sql = db();
  if (!sql) return null;
  // Google sign-ins only, as for admin.
  const email = await currentAdminEmail();
  if (!email) return null;
  const { data } = await sql.row<{ email: string; name: string | null }>`
    select email, name from course.sales_reps where email = ${email} and active
  `;
  return data && data.email === email ? { email, name: data.name, role: "rep" } : null;
});

/** For /sales pages: anyone else goes to the sales sign-in. */
export async function requireSalesUser(): Promise<SalesUser> {
  const user = await getSalesUser();
  if (!user) redirect("/sales/login");
  return user;
}
