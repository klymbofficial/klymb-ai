import "server-only";
import { logAdmin, type AuditAction } from "@/lib/admin/audit";
import type { CompanyMember } from "@/lib/company/access";

/**
 * Records what a company's HR person did, in the same append-only log as
 * Klymb admin actions (course.admin_audit_log, through logAdmin).
 *
 *   actor      the HR person's email, in the admin_email column
 *   when       the table's own `at`
 *   action     one of the company.* actions below
 *   target     the company id, as company.create and company.hr_add do
 *   details    company (slug) and actor_role, then only what the action needs
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
>;

export async function logCompany(hr: CompanyMember, action: CompanyAuditAction, details: Record<string, unknown> = {}) {
  await logAdmin({ email: hr.email }, action, hr.companyId, { company: hr.companySlug, actor_role: hr.role, ...details });
}
