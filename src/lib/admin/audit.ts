import "server-only";
import { db } from "@/lib/db/client";

export type AuditAction =
  | "learner.enrol"
  | "learner.status"
  | "learner.remove"
  | "learner.device_reset"
  | "payment.refund"
  | "sd.whatsapp_announce"
  | "announcement.post"
  | "announcement.remove"
  | "coupon.create"
  | "coupon.pause"
  | "coupon.resume"
  | "coupon.delete"
  | "admin.add"
  | "admin.remove"
  | "ticket.status"
  | "company.create"
  | "company.update"
  | "company.hr_add"
  // By a company's own admin (src/lib/company/audit.ts), not by a Klymb admin.
  | "company.person_add"
  | "company.people_import"
  | "company.person_remove"
  | "company.invite_resend"
  | "company.team_create"
  | "company.team_head"
  | "company.person_move"
  | "company.roles_set"
  | "company.brand_draft"
  | "company.brand_logo"
  | "company.brand_publish"
  | "company.course_assign"
  | "company.course_unassign"
  | "company.course_assign_all"
  | "company.assignment_create"
  | "company.assessment_review"
  | "company.batch_create"
  | "company.batch_send"
  | "company.batch_cancel"
  | "company.batch_retry"
  | "company.batch_remind"
  | "company.candidate_cancel"
  | "company.candidate_new_link"
  | "company.candidate_email"
  | "company.candidate_extend"
  | "company.test_create"
  | "company.test_save"
  | "company.test_publish"
  | "company.question_create"
  | "company.question_save"
  | "company.question_remove"
  | "catalog.item_save"
  | "catalog.program_save"
  | "catalog.grant"
  | "catalog.revoke"
  | "catalog.assessment_save"
  | "catalog.assessment_publish"
  | "catalog.question_create"
  | "catalog.question_save"
  | "hackathon.score"
  | "hackathon.results"
  | "chat.reply"
  | "chat.status"
  | "internship.status"
  | "internship.payout"
  | "internship.code";

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
