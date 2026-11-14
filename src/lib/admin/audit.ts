import "server-only";
import { db } from "@/lib/db/client";

export type AuditAction =
  | "learner.enrol"
  | "learner.status"
  | "learner.remove"
  | "learner.device_reset"
  | "payment.refund"
  | "sd.whatsapp_announce"
  | "admin.add"
  | "admin.remove"
  | "ticket.status"
  | "company.create"
  | "company.update"
  | "company.hr_add"
  // By a company's own HR (src/lib/company/audit.ts), not by a Klymb admin.
  | "company.person_add"
  | "company.people_import"
  | "company.person_remove"
  | "company.invite_resend"
  | "company.team_create"
  | "company.team_head"
  | "company.person_move"
  | "company.course_assign"
  | "company.course_unassign"
  | "company.course_assign_all"
  | "hackathon.score"
  | "hackathon.results";

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
