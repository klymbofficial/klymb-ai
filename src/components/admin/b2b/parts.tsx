import clsx from "clsx";
import Link from "next/link";
import type { DealRow, Person } from "@/lib/admin/b2b";
import { attention, B2B_STAGES, daysBetween, DOC_KINDS, inr, LOST_REASONS, pendingDocs } from "@/lib/b2b";
import { labelOf } from "@/lib/sales";

/** B2B's own tabs, under Admin › Sales › B2B. */
const tabs = [
  { href: "/admin/sales/b2b", label: "Overview", key: "overview" },
  { href: "/admin/sales/b2b/deals?due=1", label: "Due today", key: "due" },
  { href: "/admin/sales/b2b/deals", label: "All deals", key: "deals" },
  { href: "/admin/sales/b2b/board", label: "Board", key: "board" },
  { href: "/admin/sales/b2b/companies", label: "Companies", key: "companies" },
] as const;

export function B2BTabs({ current }: { current: (typeof tabs)[number]["key"] | "none" }) {
  return (
    <nav aria-label="B2B" className="-mx-4 mb-6 flex items-center gap-1 overflow-x-auto border-b border-line/25 px-4 sm:mx-0 sm:px-0">
      {tabs.map((t) => (
        <Link
          key={t.href}
          href={t.href}
          aria-current={t.key === current ? "page" : undefined}
          className={clsx("-mb-px whitespace-nowrap border-b-2 px-3 py-2 text-sm font-bold", t.key === current ? "border-red-strong text-ink" : "border-transparent text-muted hover:text-ink")}
        >
          {t.label}
        </Link>
      ))}
      <Link href="/admin/sales/b2b/deals/new" className="ml-auto whitespace-nowrap bg-ink px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-paper">+ New deal</Link>
    </nav>
  );
}

const TONE: Record<string, string> = {
  lead: "bg-surface text-ink",
  in_progress: "bg-amber-100 text-amber-900",
  in_discussion: "bg-sky-100 text-sky-900",
  document_needed: "bg-violet-100 text-violet-900",
  signed: "bg-ink text-paper",
  on_hold: "bg-stone-200 text-stone-800",
  lost: "bg-red-tint text-red-deep",
};

export function B2BStageBadge({ stage }: { stage: string }) {
  return <span className={clsx("inline-block whitespace-nowrap px-2 py-0.5 text-[11px] font-extrabold uppercase tracking-wider", TONE[stage])}>{labelOf(B2B_STAGES, stage)}</span>;
}

export const shortDay = (day: string) => new Date(`${day}T00:00:00+05:30`).toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "Asia/Kolkata" });
export const when = (iso: string) => new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" });
export const docNames = (kinds: string[]) => pendingDocs(kinds.map((kind) => ({ kind, status: "pending" }))).map((k) => labelOf(DOC_KINDS, k)).join(", ");

export function personName(people: Person[], email: string | null, me?: string) {
  if (!email) return "Unassigned";
  if (me && email === me) return "You";
  return people.find((p) => p.email === email)?.name ?? email.split("@")[0];
}

/** The next step as a short line, red when late. */
export function NextStep({ d, today }: { d: Pick<DealRow, "stage" | "next_step" | "next_step_date">; today: string }) {
  if (d.stage === "signed" || d.stage === "lost") return <span className="text-muted">—</span>;
  if (!d.next_step || !d.next_step_date) return <span className="font-bold text-red-deep">No next step</span>;
  const late = d.next_step_date < today;
  return (
    <span>
      <b className={clsx("nums", late ? "text-red-deep" : d.next_step_date === today ? "text-ink" : "text-muted")}>
        {d.next_step_date === today ? "Today" : late ? `Overdue · ${shortDay(d.next_step_date)}` : shortDay(d.next_step_date)}
      </b>
      <span className="text-muted"> · {d.next_step}</span>
    </span>
  );
}

/** The deals as a table, for the list, a company and the overview's lists. */
export function DealTable({ deals, people, me, today, compact = false }: { deals: DealRow[]; people: Person[]; me: string; today: string; compact?: boolean }) {
  if (!deals.length) return <p className="card p-5 text-sm text-muted">No deals here.</p>;
  return (
    <div className="card overflow-x-auto">
      <table className="w-full min-w-[760px] text-left text-sm">
        <thead className="border-b border-line/25 text-[11px] font-extrabold uppercase tracking-wider text-muted">
          <tr>
            <th className="px-3 py-2">Deal</th>
            <th className="px-3 py-2">Stage</th>
            <th className="px-3 py-2 text-right">Value</th>
            {!compact && <th className="px-3 py-2 text-right">Seats</th>}
            <th className="px-3 py-2">Next step</th>
            {!compact && <th className="px-3 py-2">Last touch</th>}
            <th className="px-3 py-2">Owner</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line/15">
          {deals.map((d) => {
            const a = attention(d, today);
            return (
              <tr key={d.id} className="align-top">
                <td className="px-3 py-2.5">
                  <Link href={`/admin/sales/b2b/deals/${d.id}`} className="font-bold hover:underline">{d.company_name}</Link>
                  <p className="text-xs text-muted">{d.title}{d.contact_name ? ` · ${d.contact_name}${d.contact_designation ? `, ${d.contact_designation}` : ""}` : ""}</p>
                  {d.status_note && <p className="text-xs italic text-muted">{d.status_note}</p>}
                </td>
                <td className="px-3 py-2.5">
                  <B2BStageBadge stage={d.stage} />
                  {a.stale && <p className="mt-1 text-[11px] font-bold text-red-deep">Stale · {daysBetween(d.last_activity_at ?? d.stage_changed_at, today)}d quiet</p>}
                  {d.stage === "document_needed" && d.pending_docs.length > 0 && <p className="mt-1 text-[11px] text-muted">Needs {docNames(d.pending_docs)}</p>}
                  {d.stage === "lost" && d.lost_reason && <p className="mt-1 text-[11px] text-muted">{labelOf(LOST_REASONS, d.lost_reason)}</p>}
                </td>
                <td className="px-3 py-2.5 text-right font-bold nums">{d.value_inr ? inr(d.value_inr) : "—"}</td>
                {!compact && <td className="px-3 py-2.5 text-right nums">{d.seats || "—"}</td>}
                <td className="px-3 py-2.5 text-xs"><NextStep d={d} today={today} /></td>
                {!compact && (
                  <td className="px-3 py-2.5 text-xs text-muted">
                    {d.last_activity_at ? <>{when(d.last_activity_at)}{d.last_by && <span> · by {personName(people, d.last_by, me)}</span>}</> : "Not contacted yet"}
                  </td>
                )}
                <td className="px-3 py-2.5 text-xs">{personName(people, d.owner_email, me)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
