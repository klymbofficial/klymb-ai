import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export interface AdminSession {
  email: string;
  name: string | null;
}

/**
 * Data Access Layer: every admin read goes through here.
 * Returns null when the visitor is not a signed-in admin.
 */
export async function getAdmin(): Promise<AdminSession | null> {
  const supabase = await createClient();
  if (!supabase) return null;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return null;

  // RLS on admin_users only returns a row when is_admin() passes.
  const { data } = await supabase
    .from("admin_users")
    .select("email, name")
    .ilike("email", user.email)
    .maybeSingle();

  return data ? { email: data.email, name: data.name } : null;
}

/** Use at the top of every admin page. Redirects instead of rendering. */
export async function requireAdmin(): Promise<AdminSession> {
  const admin = await getAdmin();
  if (!admin) redirect("/admin/login");
  return admin;
}
