"use server";

import { revalidatePath } from "next/cache";
import { getAdmin } from "@/lib/admin/auth";
import { logAdmin } from "@/lib/admin/audit";
import { db } from "@/lib/db/client";

/** Marks a Kamran help request resolved, or reopens it. */
export async function setTicketStatus(id: string, status: "open" | "resolved") {
  const admin = await getAdmin();
  if (!admin) return;
  if (status !== "open" && status !== "resolved") return;
  const sql = db();
  if (!sql) return;
  const { error } = await sql.run`
    update course.support_tickets
       set status = ${status}, resolved_at = ${status === "resolved" ? new Date().toISOString() : null}
     where id = ${id}
  `;
  if (error) console.error("ticket status failed:", error.code, error.message);
  else await logAdmin(admin, "ticket.status", id, { status });
  revalidatePath("/admin/support");
}
