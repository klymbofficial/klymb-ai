import "server-only";
import { logAdmin, type AuditAction } from "@/lib/admin/audit";
import type { CompanyMember } from "@/lib/company/access";

/**
 * Records what a company's admin did, in the same append-only log as
 * Klymb admin actions (course.admin_audit_log, through logAdmin).
 *
 *   actor      the company admin's email, in the admin_email column
 *   when       the table's own `at`
 *   action     one of the company.* actions below
 *   target     the company id, as company.create and company.hr_add do
 *   details    company (slug) and actor_roles, then only what the action needs
 *
 * Kept out of details on purpose: names, CSV contents, sign-in codes, and
 * anything typed into a form beyond the email an action is about. A bulk
 * upload records counts, not the list.
 *
 * Like logAdmin it never throws and never blocks the action: call it after
 * the change has worked. Nothing here reads the log, so it widens nobody's
 * access to it: only /admin/audit does, behind requireAdmin.
 */
export type CompanyAuditAction = Extract<
  AuditAction,
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
>;

export async function logCompany(hr: CompanyMember, action: CompanyAuditAction, details: Record<string, unknown> = {}) {
  await logAdmin({ email: hr.email }, action, hr.companyId, { company: hr.companySlug, actor_roles: hr.roles, ...details });
}
