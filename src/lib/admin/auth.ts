import "server-only";
import { redirect } from "next/navigation";
import { cache } from "react";
import { currentEmail } from "@/auth";
import { resolveAdmin, type AdminIdentity } from "@/lib/admin/access";
import { createServiceClient } from "@/lib/supabase/admin";

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
  const supabase = createServiceClient();
  if (!supabase) return null;

  return resolveAdmin(await currentEmail(), async (email) => {
    // Exact match only: ILIKE would treat % and _ in a stored row as wildcards.
    const { data } = await supabase.from("admin_users").select("email, name").eq("email", email).maybeSingle();
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
