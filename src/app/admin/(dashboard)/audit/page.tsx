import { EmptyState } from "@/components/admin/EmptyState";
import { PageTitle } from "@/components/admin/PageTitle";
import { requireAdmin } from "@/lib/admin/auth";
import { db } from "@/lib/db/client";

interface Entry { id: number; at: string; admin_email: string; action: string; target: string | null; details: Record<string, unknown> }

const LABELS: Record<string, string> = {
  "learner.enrol": "Enrolled a learner",
  "learner.status": "Changed learner status",
  "learner.remove": "Removed a learner",
  "learner.device_reset": "Reset a learner's device",
  "payment.refund": "Refunded a payment",
  "admin.add": "Added an admin",
  "admin.remove": "Removed an admin",
  "ticket.status": "Updated a support request",
};

const UUID = /^[0-9a-f-]{36}$/i;

export default async function AdminAuditPage() {
  await requireAdmin();
  const sql = db();
  const { data } = sql
    ? await sql.rows<Entry>`
        select id, at, admin_email, action, target, details
          from course.admin_audit_log
         order by at desc
         limit 300
      `
    : { data: null };
  const entries = data ?? [];

  // Learner ids read better as emails.
  const ids = [...new Set(entries.map((e) => e.target).filter((t): t is string => !!t && UUID.test(t)))];
  const { data: learners } = sql && ids.length
    ? await sql.rows<{ id: string; email: string }>`
        select id, email from course.learners where id = any(${ids}::uuid[])
      `
    : { data: null };
  const who = new Map((learners ?? []).map((l) => [l.id, l.email]));

  return (
    <>
      <PageTitle
        eyebrow="Security"
        title="Admin activity"
        intro="Every enrolment, status change, removal, device reset, refund, support update and admin change, with who did it. Entries can't be edited or deleted."
      />
      {entries.length === 0 ? (
        <EmptyState title="No admin actions yet" body="Actions taken in this admin appear here as they happen." />
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-line/30 text-xs uppercase tracking-wider text-muted">
              <tr><th className="px-4 py-3">When (IST)</th><th className="px-4 py-3">Admin</th><th className="px-4 py-3">Action</th><th className="px-4 py-3">On</th><th className="px-4 py-3">Details</th></tr>
            </thead>
            <tbody className="divide-y divide-line/20">
              {entries.map((e) => (
                <tr key={e.id}>
                  <td className="whitespace-nowrap px-4 py-3 nums">{new Date(e.at).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" })}</td>
                  <td className="px-4 py-3">{e.admin_email}</td>
                  <td className="px-4 py-3 font-semibold">{LABELS[e.action] ?? e.action}</td>
                  <td className="px-4 py-3">{e.target ? who.get(e.target) ?? e.target : "—"}</td>
                  <td className="px-4 py-3 text-xs text-muted">{Object.entries(e.details ?? {}).map(([k, v]) => `${k}: ${String(v)}`).join(" · ") || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
