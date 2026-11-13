import Link from "next/link";
import { EmptyState } from "@/components/admin/EmptyState";
import { PageTitle } from "@/components/admin/PageTitle";
import { ImportLeads, input, LeadForm } from "@/components/admin/sales/SalesForms";
import { SalesTabs, StageBadge } from "@/components/admin/sales/SalesTabs";
import { requireAdmin } from "@/lib/admin/auth";
import { getLeads, getOwners } from "@/lib/admin/sales";
import { CHANNELS, formatPhone, istToday, labelOf, SOURCES, STAGES } from "@/lib/sales";

type Search = { stage?: string; source?: string; owner?: string; due?: string; q?: string; add?: string };

const shortDate = (iso: string) =>
  new Date(iso.length === 10 ? `${iso}T00:00:00+05:30` : iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "Asia/Kolkata" });

export default async function SalesLeadsPage({ searchParams }: { searchParams: Promise<Search> }) {
  const admin = await requireAdmin();
  const sp = await searchParams;
  const due = sp.due === "1";
  // "Due today" is your own list unless an owner is picked.
  const owner = sp.owner ?? (due ? admin.email : "");
  const [leads, owners] = await Promise.all([
    getLeads({ stage: sp.stage, source: sp.source, owner: owner || undefined, due, q: sp.q }),
    getOwners(),
  ]);
  const today = istToday();
  const ownerName = (email: string | null) => (email ? owners.find((o) => o.email === email)?.name ?? email.split("@")[0] : "—");

  return (
    <>
      <PageTitle
        eyebrow="Sales"
        title={due ? "Due today" : "Leads"}
        intro={due
          ? "Leads whose follow-up date is today or overdue. Work down the list, log each touch, set the next date."
          : "Everyone we're selling to, from every source. Paid is matched from payments automatically."}
        actions={<Link href="?add=1" className="bg-ink px-4 py-2 text-xs font-bold uppercase tracking-wider text-paper">Add or import</Link>}
      />
      <SalesTabs current={due ? "due" : "leads"} />

      {sp.add === "1" && (
        <div className="mb-8 flex flex-col gap-4">
          <LeadForm owners={owners} me={admin.email} />
          <ImportLeads owners={owners} me={admin.email} />
        </div>
      )}

      <form className="mb-4 flex flex-wrap items-end gap-2" method="get">
        {due && <input type="hidden" name="due" value="1" />}
        <input name="q" defaultValue={sp.q} placeholder="Name, phone, email, college" className={`${input} w-60`} />
        <select name="stage" defaultValue={sp.stage ?? ""} className={input}>
          <option value="">All stages</option>
          {STAGES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
        </select>
        <select name="source" defaultValue={sp.source ?? ""} className={input}>
          <option value="">All sources</option>
          {SOURCES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
        </select>
        <select name="owner" defaultValue={owner} className={input}>
          <option value="">Everyone</option>
          <option value="none">Unassigned</option>
          {owners.map((o) => <option key={o.email} value={o.email}>{o.name ?? o.email}</option>)}
        </select>
        <button type="submit" className="border border-ink px-3 py-2 text-xs font-bold uppercase tracking-wider hover:bg-ink hover:text-paper">Filter</button>
        <span className="ml-auto text-xs text-muted">{leads.length === 500 ? "First 500" : `${leads.length} leads`}</span>
      </form>

      {leads.length === 0 ? (
        <EmptyState
          title={due ? "Nothing due" : "No leads here"}
          body={due ? "No follow-ups are due for this filter. Check the full list or add new leads." : "Add a lead, or import a sheet or a WhatsApp dashboard export."}
        />
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead className="border-b border-line/30 text-xs uppercase tracking-wider text-muted">
              <tr>
                <th className="px-4 py-3">Lead</th><th className="px-4 py-3">Stage</th><th className="px-4 py-3">Source</th>
                <th className="px-4 py-3">Last touch</th><th className="px-4 py-3">Follow-up</th><th className="px-4 py-3">Owner</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line/20">
              {leads.map((l) => (
                <tr key={l.id} className="hover:bg-surface/60">
                  <td className="px-4 py-3">
                    <Link href={`/admin/sales/leads/${l.id}`} className="font-bold underline-offset-4 hover:underline">{l.name}</Link>
                    {l.kind === "b2b" && <span className="ml-2 text-[11px] font-extrabold text-muted">B2B</span>}
                    {l.paid && <span className="ml-2 bg-emerald-700 px-1.5 py-0.5 text-[11px] font-extrabold text-white">PAID</span>}
                    <span className="block text-xs text-muted nums">{formatPhone(l.phone)}{l.org ? ` · ${l.org}` : ""}</span>
                  </td>
                  <td className="px-4 py-3"><StageBadge stage={l.stage} label={labelOf(STAGES, l.stage)} /></td>
                  <td className="px-4 py-3 text-xs">{labelOf(SOURCES, l.source)}{l.source_detail && <span className="block text-muted">{l.source_detail}</span>}</td>
                  <td className="px-4 py-3 text-xs nums">
                    {l.last_touch_at ? <>{shortDate(l.last_touch_at)} · {labelOf(CHANNELS, l.last_channel ?? "")}<span className="block text-muted">{l.touches} touch{l.touches === 1 ? "" : "es"}{l.replied ? ", replied" : ""}</span></> : <span className="text-muted">Not contacted</span>}
                  </td>
                  <td className={`px-4 py-3 text-xs font-bold nums ${l.next_follow_up && l.next_follow_up <= today ? "text-red-deep" : ""}`}>
                    {l.next_follow_up ? (l.next_follow_up === today ? "Today" : shortDate(l.next_follow_up)) : "—"}
                  </td>
                  <td className="px-4 py-3 text-xs">{ownerName(l.owner_email)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
