"use server";

import { revalidatePath } from "next/cache";
import { removalBlocked } from "@/lib/admin/access";
import { getAdmin } from "@/lib/admin/auth";
import { logAdmin } from "@/lib/admin/audit";
import { normaliseEmail } from "@/lib/email";
import { createServiceClient } from "@/lib/supabase/admin";

export type AdminUserResult = { ok: true } | { ok: false; message: string };

/** Owner only. The new admin signs in with Google using exactly this address. */
export async function addAdminUser(rawEmail: string, rawName: string): Promise<AdminUserResult> {
  const admin = await getAdmin();
  if (!admin?.owner) return { ok: false, message: "Only an owner can add admins." };

  const email = normaliseEmail(rawEmail);
  if (!email) return { ok: false, message: "That is not a valid email." };
  const name = rawName.trim().slice(0, 80) || null;

  const supabase = createServiceClient();
  if (!supabase) return { ok: false, message: "Unavailable right now." };

  const { error } = await supabase.from("admin_users").insert({ email, name });
  if (error?.code === "23505") return { ok: false, message: `${email} is already an admin.` };
  if (error) {
    console.error("admin add failed:", error.code, error.message);
    return { ok: false, message: "That could not be saved." };
  }
  await logAdmin(admin, "admin.add", email, name ? { name } : {});

  revalidatePath("/admin/admins");
  return { ok: true };
}

/** Owner only, never an owner. Takes effect on the removed admin's next request. */
export async function removeAdminUser(rawEmail: string, confirmEmail: string): Promise<AdminUserResult> {
  const admin = await getAdmin();
  if (!admin) return { ok: false, message: "Not authorised." };

  const blocked = removalBlocked(rawEmail, admin);
  if (blocked) return { ok: false, message: blocked };
  const email = normaliseEmail(rawEmail)!;
  // Typed email must match, so a misclick cannot remove the wrong person.
  if (normaliseEmail(confirmEmail) !== email) {
    return { ok: false, message: "The email you typed does not match. Nobody was removed." };
  }

  const supabase = createServiceClient();
  if (!supabase) return { ok: false, message: "Unavailable right now." };

  const { error, count } = await supabase.from("admin_users").delete({ count: "exact" }).eq("email", email);
  if (error) {
    console.error("admin remove failed:", error.code, error.message);
    return { ok: false, message: "That could not be removed." };
  }
  if (!count) return { ok: false, message: "That admin no longer exists." };
  await logAdmin(admin, "admin.remove", email);

  revalidatePath("/admin/admins");
  return { ok: true };
}
