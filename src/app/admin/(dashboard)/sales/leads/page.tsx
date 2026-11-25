import Link from "next/link";
import { EmptyState } from "@/components/admin/EmptyState";
import { PageTitle } from "@/components/admin/PageTitle";
import { ImportLeads, LeadForm } from "@/components/admin/sales/SalesForms";
import { input } from "@/components/admin/sales/styles";
import { SalesTabs, StageBadge } from "@/components/admin/sales/SalesTabs";
import { AutoSelect, LeadSearch } from "@/components/admin/sales/LeadSearch";
import { AssignForm, SelectAll } from "@/components/admin/sales/TeamForms";
import { requireSalesAdmin } from "@/lib/admin/auth";
import { captureWebsiteLeads } from "@/lib/admin/sales-capture";
import { getLeadLists, getLeads, getOwners } from "@/lib/admin/sales";
import { CHANNELS, formatPhone, istToday, labelOf, SOURCES, STAGES, WHATSAPP_BY } from "@/lib/sales";

type Search = { stage?: string; source?: string; list?: string; owner?: string; by?: string; due?: string; q?: string; add?: string };

const shortDate = (iso: string) =>
  new Date(iso.length === 10 ? `${iso}T00:00:00+05:30` : iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "Asia/Kolkata" });

export default async function SalesLeadsPage({ searchParams }: { searchParams: Promise<Search> }) {
  // Website form fills arrive as leads before anything is read.
  await captureWebsiteLeads();
  const admin = await requireSalesAdmin();
  const sp = await searchParams;
  const due = sp.due === "1";
  // "Due today" is your own list unless an owner is picked.
  const owner = sp.owner ?? (due ? admin.email : "");
  const [leads, owners, lists] = await Promise.all([
    getLeads({ stage: sp.stage, source: sp.source, list: sp.list, owner: owner || undefined, by: sp.by, due, q: sp.q }),
    getOwners(),
    getLeadLists(),
  ]);
  const today = istToday();
  const filtered = Boolean(sp.stage || sp.source || sp.list || sp.owner || sp.by || sp.q);
  const who = (email: string) => email === WHATSAPP_BY ? "WhatsApp dashboard" : owners.find((o) => o.email === email)?.name ?? email.split("@")[0];
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
          <Link href={due ? "?due=1" : "?"} className="self-end text-xs font-bold underline underline-offset-4">Close</Link>
          <LeadForm owners={owners} me={admin.email} />
          <ImportLeads owners={owners} me={admin.email} />
        </div>
      )}

      <LeadSearch />
      <form className="mb-4 flex flex-wrap items-center gap-2" method="get">
        {due && <input type="hidden" name="due" value="1" />}
        {sp.q && <input type="hidden" name="q" value={sp.q} />}
        <AutoSelect name="stage" defaultValue={sp.stage ?? ""} aria-label="Stage" className={`${input} min-w-0 flex-1 sm:flex-none`}>
          <option value="">All stages</option>
          {STAGES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
        </AutoSelect>
        <AutoSelect name="source" defaultValue={sp.source ?? ""} aria-label="Source" className={`${input} min-w-0 flex-1 sm:flex-none`}>
          <option value="">All sources</option>
          {SOURCES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
        </AutoSelect>
        {/* The list a lead was imported or added under (its "Source detail"), such as "US AI cohort". */}
        <AutoSelect name="list" defaultValue={sp.list ?? ""} aria-label="List" className={`${input} min-w-0 flex-1 sm:flex-none`}>
          <option value="">All lists</option>
          {lists.map((l) => <option key={l.list} value={l.list}>{l.list} ({l.n})</option>)}
        </AutoSelect>
        <AutoSelect name="owner" defaultValue={owner} aria-label="Owner" className={`${input} min-w-0 flex-1 sm:flex-none`}>
          <option value="">Any owner</option>
          <option value="none">Unassigned</option>
          {owners.map((o) => <option key={o.email} value={o.email}>Owner: {o.name ?? o.email}{o.rep ? " (intern)" : ""}</option>)}
        </AutoSelect>
        <AutoSelect name="by" defaultValue={sp.by ?? ""} aria-label="Reached out" className={`${input} min-w-0 flex-1 sm:flex-none`}>
          <option value="">Contacted or not</option>
          <option value="none">Not contacted yet</option>
          {owners.map((o) => <option key={o.email} value={o.email}>Contacted by {o.name ?? o.email}</option>)}
        </AutoSelect>
        <noscript><button type="submit" className="border border-ink px-3 py-2 text-xs font-bold uppercase">Filter</button></noscript>
        {filtered && <Link href={due ? "/admin/sales/leads?due=1" : "/admin/sales/leads"} className="text-xs font-bold underline underline-offset-4">Clear filters</Link>}
        <span className="w-full text-xs text-muted sm:ml-auto sm:w-auto">{leads.length === 500 ? "First 500" : `${leads.length} ${leads.length === 1 ? "lead" : "leads"}`} · tick leads to assign them</span>
      </form>

      {leads.length === 0 ? (
        <EmptyState
          title={due ? "Nothing due" : "No leads here"}
          body={due ? "No follow-ups are due for this filter. Check the full list or add new leads." : filtered ? "Nothing matches these filters. Clear them to see everyone." : "Add a lead, or import a sheet or a WhatsApp dashboard export."}
        />
      ) : (
        <AssignForm owners={owners}>
          {/* Laptop: a table. */}
          <div className="card hidden overflow-x-auto md:block">
            <table className="w-full min-w-[860px] text-left text-sm">
              <thead className="border-b border-line/30 text-xs uppercase tracking-wider text-muted">
                <tr>
                  <th className="w-10 py-3 pl-4"><SelectAll /></th>
                  <th className="px-4 py-3">Lead</th><th className="px-4 py-3">Stage</th><th className="px-4 py-3">Source</th>
                  <th className="px-4 py-3">Last touch</th><th className="px-4 py-3">Follow-up</th><th className="px-4 py-3">Owner</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line/20">
                {leads.map((l) => (
                  <tr key={l.id} className="hover:bg-surface/60">
                    <td className="py-3 pl-4"><input type="checkbox" name="id" value={l.id} aria-label={`Tick ${l.name}`} className="size-4 accent-ink" /></td>
                    <td className="px-4 py-3">
                      <Link href={`/admin/sales/leads/${l.id}`} className="font-bold underline-offset-4 hover:underline">{l.name}</Link>
                      {l.kind === "b2b" && <span className="ml-2 text-[11px] font-extrabold text-muted">B2B</span>}
                      {l.paid && <span className="ml-2 bg-emerald-700 px-1.5 py-0.5 text-[11px] font-extrabold text-white">PAID</span>}
                      <span className="block text-xs text-muted nums">{contact(l)}</span>
                    </td>
                    <td className="px-4 py-3"><StageBadge stage={l.stage} label={labelOf(STAGES, l.stage)} />{l.status_note && <span className="mt-1 block max-w-48 text-xs italic text-muted">{l.status_note}</span>}</td>
                    <td className="px-4 py-3 text-xs">{labelOf(SOURCES, l.source)}{l.source_detail && <span className="block text-muted">{l.source_detail}</span>}</td>
                    <td className="px-4 py-3 text-xs nums">
                      {l.last_touch_at ? <>{shortDate(l.last_touch_at)} · {labelOf(CHANNELS, l.last_channel ?? "")}{l.last_by && <span className="block font-semibold">by {who(l.last_by)}</span>}<span className="block text-muted">{l.touches} touch{l.touches === 1 ? "" : "es"}{l.replied ? ", replied" : ""}</span></> : <span className="text-muted">Not contacted yet</span>}
                    </td>
                    <td className="px-4 py-3 text-xs nums"><FollowUp date={l.next_follow_up} today={today} /></td>
                    <td className="px-4 py-3 text-xs">{ownerName(l.owner_email)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Phone: cards. */}
          <ul className="flex flex-col gap-2 md:hidden">
            {leads.map((l) => (
              <li key={l.id} className="card flex gap-3 p-3">
                <input type="checkbox" name="id" value={l.id} aria-label={`Tick ${l.name}`} className="mt-1 size-5 shrink-0 accent-ink" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <Link href={`/admin/sales/leads/${l.id}`} className="font-bold underline-offset-4 hover:underline">{l.name}</Link>
                    <StageBadge stage={l.stage} label={labelOf(STAGES, l.stage)} />
                  </div>
                  <p className="truncate text-xs text-muted nums">{contact(l)}</p>
                  {l.status_note && <p className="truncate text-xs italic text-muted">{l.status_note}</p>}
                  <p className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs nums">
                    <FollowUp date={l.next_follow_up} today={today} />
                    <span className="text-muted">{labelOf(SOURCES, l.source)}</span>
                    <span className="text-muted">{ownerName(l.owner_email)}</span>
                    <span className={l.last_by ? "font-semibold" : "text-muted"}>{l.last_by ? `Contacted by ${who(l.last_by)}` : "Not contacted yet"}</span>
                    {l.paid && <span className="font-extrabold text-emerald-800">PAID</span>}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </AssignForm>
      )}
    </>
  );
}

/** The phone, or the email when there's no phone, then the college or company. */
function contact(l: { phone: string | null; email: string | null; org: string | null }) {
  return [l.phone ? formatPhone(l.phone) : l.email, l.org].filter(Boolean).join(" · ") || "No contact details";
}

/** "Today", "3 days late" or a date, so overdue reads at a glance. */
function FollowUp({ date, today }: { date: string | null; today: string }) {
  if (!date) return <span className="text-muted">No follow-up</span>;
  if (date === today) return <span className="font-bold text-red-deep">Today</span>;
  if (date < today) {
    const d = Math.round((Date.parse(`${today}T00:00:00Z`) - Date.parse(`${date}T00:00:00Z`)) / 86400000);
    return <span className="font-bold text-red-deep">{d === 1 ? "1 day late" : `${d} days late`}</span>;
  }
  return <span>{shortDate(date)}</span>;
}
