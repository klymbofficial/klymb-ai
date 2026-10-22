import "server-only";
import { createServiceClient } from "@/lib/supabase/admin";

export type AuditAction =
  | "learner.enrol"
  | "learner.status"
  | "learner.remove"
  | "learner.device_reset"
  | "payment.refund"
  | "admin.add"
  | "admin.remove"
  | "ticket.status";

/**
 * Records an admin action. Never throws and never blocks the action itself:
 * a missing table (migration not run yet) only logs to the server console.
 */
export async function logAdmin(admin: { email: string }, action: AuditAction, target: string | null, details: Record<string, unknown> = {}) {
  const supabase = createServiceClient();
  if (!supabase) return;
  const { error } = await supabase.from("admin_audit_log").insert({ admin_email: admin.email, action, target, details });
  if (error) console.error("audit log write failed:", action, target, error.code, error.message);
}
