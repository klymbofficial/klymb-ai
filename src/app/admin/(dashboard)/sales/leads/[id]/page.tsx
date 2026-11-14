import Link from "next/link";
import { notFound } from "next/navigation";
import { PageTitle } from "@/components/admin/PageTitle";
import { DeleteLead, LeadForm, TouchForm } from "@/components/admin/sales/SalesForms";
import { StageBadge } from "@/components/admin/sales/SalesTabs";
import { requireOwner } from "@/lib/admin/auth";
import { getLead, getOwners } from "@/lib/admin/sales";
import { CHANNELS, formatPhone, labelOf, SOURCES, STAGES, WHATSAPP_BY } from "@/lib/sales";

const when = (iso: string) =>
  new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" });

export default async function LeadPage({ params }: { params: Promise<{ id: string }> }) {
  const admin = await requireOwner();
  const [found, owners] = await Promise.all([getLead((await params).id), getOwners()]);
  if (!found) notFound();
  const { lead, touches } = found;
  const who = (email: string) => email === WHATSAPP_BY ? "WhatsApp dashboard" : owners.find((o) => o.email === email)?.name ?? email.split("@")[0];

  return (
    <>
      <PageTitle
        eyebrow={`${labelOf(SOURCES, lead.source)}${lead.source_detail ? ` · ${lead.source_detail}` : ""}${lead.kind === "b2b" ? " · B2B" : ""}`}
        title={lead.name}
        intro={[formatPhone(lead.phone), lead.email, lead.org].filter(Boolean).join(" · ")}
        actions={<Link href="/admin/sales/leads" className="text-xs font-bold uppercase tracking-wider underline underline-offset-4 hover:text-red-deep">← All leads</Link>}
      />

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <StageBadge stage={lead.stage} label={labelOf(STAGES, lead.stage)} />
        {lead.paid && <span className="bg-emerald-700 px-2 py-0.5 text-[11px] font-extrabold uppercase tracking-wider text-white">Paid, matched from payments</span>}
        {lead.phone && (
          <>
            <a href={`tel:+${lead.phone}`} className="border border-line/50 px-3 py-1.5 text-xs font-bold hover:bg-surface">Call</a>
            <a href={`https://wa.me/${lead.phone}`} target="_blank" rel="noopener noreferrer" className="border border-line/50 px-3 py-1.5 text-xs font-bold hover:bg-surface">Open WhatsApp</a>
          </>
        )}
        {lead.email && <a href={`mailto:${lead.email}`} className="border border-line/50 px-3 py-1.5 text-xs font-bold hover:bg-surface">Email</a>}
      </div>

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
          me={admin.email}
          lead={{
            id: lead.id, name: lead.name, phone: lead.phone ? formatPhone(lead.phone) : "", email: lead.email ?? "", kind: lead.kind, source: lead.source,
            source_detail: lead.source_detail ?? "", org: lead.org ?? "", owner_email: lead.owner_email ?? "",
            next_follow_up: lead.next_follow_up ?? "", notes: lead.notes ?? "", stage: lead.stage,
          }}
        />
        <div className="mt-4"><DeleteLead id={lead.id} name={lead.name} /></div>
      </section>
    </>
  );
}
