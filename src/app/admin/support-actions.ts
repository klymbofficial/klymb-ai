"use server";

import { revalidatePath } from "next/cache";
import { getAdmin } from "@/lib/admin/auth";
import { createServiceClient } from "@/lib/supabase/admin";

/** Marks a Kamran help request resolved, or reopens it. */
export async function setTicketStatus(id: string, status: "open" | "resolved") {
  if (!(await getAdmin())) return;
  if (status !== "open" && status !== "resolved") return;
  const supabase = createServiceClient();
  if (!supabase) return;
  const { error } = await supabase.from("support_tickets").update({ status, resolved_at: status === "resolved" ? new Date().toISOString() : null }).eq("id", id);
  if (error) console.error("ticket status failed:", error.code, error.message);
  revalidatePath("/admin/support");
}
