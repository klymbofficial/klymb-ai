import "server-only";
import { db } from "@/lib/db/client";

export type AuditAction =
  | "learner.enrol"
  | "learner.status"
  | "learner.remove"
  | "learner.device_reset"
  | "payment.refund"
  | "admin.add"
  | "admin.remove"
  | "ticket.status"
  | "company.create"
  | "company.update"
  | "company.hr_add";

/**
 * Records an admin action. Never throws and never blocks the action itself:
 * a missing table (migration not run yet) only logs to the server console.
 */
export async function logAdmin(admin: { email: string }, action: AuditAction, target: string | null, details: Record<string, unknown> = {}) {
  const sql = db();
  if (!sql) return;
  const { error } = await sql.run`
    insert into course.admin_audit_log (admin_email, action, target, details)
    values (${admin.email}, ${action}, ${target}, ${JSON.stringify(details)}::jsonb)
  `;
  if (error) console.error("audit log write failed:", action, target, error.code, error.message);
}
