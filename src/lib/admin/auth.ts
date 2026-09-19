import "server-only";
import { redirect } from "next/navigation";
import { currentEmail } from "@/auth";
import { normaliseEmail } from "@/lib/email";
import { createServiceClient } from "@/lib/supabase/admin";

export interface AdminSession {
  email: string;
  name: string | null;
}

/**
 * Data Access Layer: every admin read goes through here.
 *
 * Admin status is read from admin_users on each request — never from an env
 * list and never cached in the session token, so revoking a row takes effect
 * immediately and there is only one authority.
 */
export async function getAdmin(): Promise<AdminSession | null> {
  const email = normaliseEmail(await currentEmail());
  if (!email) return null;

  const supabase = createServiceClient();
  if (!supabase) return null;

  // Exact match only: ILIKE would treat % and _ in a stored row as wildcards.
  const { data } = await supabase
    .from("admin_users")
    .select("email, name")
    .eq("email", email)
    .maybeSingle();

  return data ? { email: data.email, name: data.name } : null;
}

/** Use at the top of every admin page. Redirects instead of rendering. */
export async function requireAdmin(): Promise<AdminSession> {
  const admin = await getAdmin();
  if (!admin) redirect("/admin/login");
  return admin;
}
