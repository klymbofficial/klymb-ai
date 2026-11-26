import Link from "next/link";
import { PageTitle } from "@/components/admin/PageTitle";
import { DeleteLead, LeadForm, OpenWhatsApp, StatusNoteField, TouchForm } from "@/components/admin/sales/SalesForms";
import { StageBadge } from "@/components/admin/sales/SalesTabs";
import type { SalesUser } from "@/lib/admin/auth";
import type { Lead, Owner, Touch } from "@/lib/admin/sales";
import { CHANNELS, formatPhone, istToday, labelOf, SOURCES, STAGES, WHATSAPP_BY } from "@/lib/sales";

const when = (iso: string) =>
  new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" });

/**
 * One lead: reach out, log it, see the history, edit the details. Owners see
 * it at /admin/sales/leads/[id]; reps (interns) at /sales/leads/[id], where
 * they can't reassign or delete the lead.
 */
export function LeadDetail({ lead, touches, owners, user, base }: { lead: Lead; touches: Touch[]; owners: Owner[]; user: SalesUser; base: string }) {
  const owner = user.role === "owner";
  const who = (email: string) => email === WHATSAPP_BY ? "WhatsApp dashboard" : owners.find((o) => o.email === email)?.name ?? email.split("@")[0];
  const back = owner ? `${base}/leads` : `${base}/list`;
  const today = istToday();
  const open = lead.stage !== "signed" && lead.stage !== "rejected";
  const due = open && lead.next_follow_up !== null && lead.next_follow_up <= today;
  const followUpText = !open
    ? "None, the lead is closed"
    : !lead.next_follow_up
      ? "Not set"
      : lead.next_follow_up === today
        ? "Today"
        : new Date(`${lead.next_follow_up}T00:00:00+05:30`).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", timeZone: "Asia/Kolkata" }) + (due ? " (overdue)" : "");

  return (
    <>
      <PageTitle
        eyebrow={`${labelOf(SOURCES, lead.source)}${lead.source_detail ? ` · ${lead.source_detail}` : ""}${lead.kind === "b2b" ? " · B2B" : ""}`}
        title={lead.name}
        intro={[lead.phone ? formatPhone(lead.phone) : null, lead.email, lead.org].filter(Boolean).join(" · ") || "No contact details yet"}
        actions={<Link href={back} className="text-xs font-bold uppercase tracking-wider underline underline-offset-4 hover:text-red-deep">← {owner ? "All leads" : "My leads"}</Link>}
      />

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <StageBadge stage={lead.stage} label={labelOf(STAGES, lead.stage)} />
        <StatusNoteField key={lead.status_note ?? ""} leadId={lead.id} value={lead.status_note} />
        {lead.paid && <span className="bg-emerald-700 px-2 py-0.5 text-[11px] font-extrabold uppercase tracking-wider text-white">Paid, matched from payments</span>}
        {lead.phone && (
          <>
            <a href={`tel:+${lead.phone}`} className="border border-line/50 px-3 py-1.5 text-xs font-bold hover:bg-surface">Call</a>
            <OpenWhatsApp leadId={lead.id} phone={lead.phone} name={lead.name} />
          </>
        )}
        {lead.email && <a href={`mailto:${lead.email}`} className="border border-line/50 px-3 py-1.5 text-xs font-bold hover:bg-surface">Email</a>}
      </div>

      {/* The lead at a glance, so nobody has to scroll to Details to know where things stand. */}
      <dl className="card mb-6 grid grid-cols-2 gap-4 p-4 text-sm sm:grid-cols-4">
        <div>
          <dt className="text-[11px] font-bold uppercase tracking-wider text-muted">Next follow-up</dt>
          <dd className={`mt-0.5 font-bold ${due ? "text-red-deep" : ""}`}>{followUpText}</dd>
        </div>
        <div>
          <dt className="text-[11px] font-bold uppercase tracking-wider text-muted">Last touch</dt>
          <dd className="mt-0.5">{touches[0] ? `${touches[0].inbound ? "They wrote" : labelOf(CHANNELS, touches[0].channel)} · ${when(touches[0].created_at)}` : "Not contacted yet"}</dd>
        </div>
        <div>
          <dt className="text-[11px] font-bold uppercase tracking-wider text-muted">Owner</dt>
          <dd className="mt-0.5">{lead.owner_email ? (lead.owner_email === user.email ? "You" : who(lead.owner_email)) : "Unassigned"}</dd>
        </div>
        <div>
          <dt className="text-[11px] font-bold uppercase tracking-wider text-muted">Added</dt>
          <dd className="mt-0.5">{when(lead.created_at)}</dd>
        </div>
        {lead.notes && (
          <div className="col-span-2 sm:col-span-4">
            <dt className="text-[11px] font-bold uppercase tracking-wider text-muted">Notes</dt>
            <dd className="mt-0.5 whitespace-pre-line">{lead.notes}</dd>
          </div>
        )}
      </dl>

      <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        <TouchForm key={`${lead.stage}-${touches.length}`} leadId={lead.id} stage={lead.stage} />
        <section aria-labelledby="history" className="card p-5">
          <h2 id="history" className="display text-xl">History</h2>
          {touches.length === 0 ? (
            <p className="mt-3 text-sm text-muted">No outreach logged yet.</p>
          ) : (
            <ol className="mt-3 flex flex-col divide-y divide-line/20">
              {touches.map((t) => (
                <li key={t.id} className="py-2.5 text-sm">
                  <p className="text-xs text-muted nums">
                    <b className="text-ink">{t.inbound ? "They wrote on WhatsApp" : labelOf(CHANNELS, t.channel)}</b> · {when(t.created_at)} · {who(t.by_email)}
                    {t.replied && !t.inbound && <span className="ml-2 font-bold text-emerald-800">Replied</span>}
                  </p>
                  {t.note && <p className="mt-0.5">{t.note}</p>}
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>

      <section aria-labelledby="details" className="mt-8">
        <h2 id="details" className="display mb-3 text-2xl">Details</h2>
        <LeadForm
          key={`${lead.stage_changed_at}-${lead.next_follow_up}-${lead.owner_email}`}
          owners={owners}
          me={user.email}
          base={base}
          canAssign={owner}
          lead={{
            id: lead.id, name: lead.name, phone: lead.phone ? formatPhone(lead.phone) : "", email: lead.email ?? "", kind: lead.kind, source: lead.source,
            source_detail: lead.source_detail ?? "", org: lead.org ?? "", owner_email: lead.owner_email ?? "",
            next_follow_up: lead.next_follow_up ?? "", notes: lead.notes ?? "", stage: lead.stage,
          }}
        />
        {owner && <div className="mt-4"><DeleteLead id={lead.id} name={lead.name} /></div>}
      </section>
    </>
  );
}
