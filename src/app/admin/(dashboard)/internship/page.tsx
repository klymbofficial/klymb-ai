import clsx from "clsx";
import Link from "next/link";
import { EmptyState } from "@/components/admin/EmptyState";
import { ExportCsv } from "@/components/admin/ExportCsv";
import { InternActions } from "@/components/admin/InternActions";
import { PageTitle } from "@/components/admin/PageTitle";
import { StatTile } from "@/components/admin/StatTile";
import { requireSalesAdmin } from "@/lib/admin/auth";
import { getInternApplications } from "@/lib/admin/internship";
import { HOURS, INTERNSHIP, isInternStatus, STATUSES } from "@/lib/internship";

export const dynamic = "force-dynamic";

const iso = (v: string | null) => (v ? new Date(v).toISOString() : "");
const when = (v: string) => new Date(v).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" });
const hoursLabel = (h: string) => HOURS.find((x) => x.key === h)?.label.replace(" a week", "") ?? h;
const TONE: Record<string, string> = { applied: "bg-surface text-ink", shortlisted: "bg-sky-100 text-sky-900", accepted: "bg-emerald-100 text-emerald-900", rejected: "bg-red-tint text-red-deep" };

/** Applications from /internship, for owners and sales managers: read, call, then accept or reject. */
export default async function AdminInternshipPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  await requireSalesAdmin();
  const { status } = await searchParams;
  const rows = await getInternApplications(INTERNSHIP.batch);
  const all = rows ?? [];
  const show = isInternStatus(status) ? status : null;
  const list = show ? all.filter((r) => r.status === show) : all;
  const count = (s: string) => all.filter((r) => r.status === s).length;
  const csv = list.map((r) => ({
    applied_at: iso(r.created_at), status: r.status, name: r.name, email: r.email, phone: r.phone, city: r.city ?? "",
    role: r.role === "working" ? "Working professional" : "Student", college_or_company: r.org ?? "", hours: hoursLabel(r.hours),
    linkedin: r.linkedin ?? "", instagram: r.instagram ?? "", sales_experience: r.sales_experience ?? "", why: r.why, call_note: r.call_note ?? "",
  }));
  const tab = (key: string | null, label: string, n: number) => (
    <Link key={label} href={key ? `/admin/internship?status=${key}` : "/admin/internship"} aria-current={show === key ? "page" : undefined}
      className={clsx("-mb-px whitespace-nowrap border-b-2 px-3 py-2 text-sm font-bold", show === key ? "border-red-strong text-ink" : "border-transparent text-muted hover:text-ink")}>
      {label} <span className="font-normal text-muted">{n}</span>
    </Link>
  );

  return (
    <>
      <PageTitle
        eyebrow="Sales internship"
        title="Internship applications"
        intro={`Starts ${INTERNSHIP.startsLabel}: ${INTERNSHIP.months} months, ${INTERNSHIP.commissionPct}% commission. Shortlist, call, then accept or reject. Accepting someone also adds them as a sales rep.`}
        actions={<div className="flex items-center gap-2"><Link href="/internship" className="rounded-lg border border-line/50 px-3 py-1.5 text-xs font-bold hover:bg-ink hover:text-paper">Open page</Link><ExportCsv rows={csv} filename="klymb-internship" /></div>}
      />
      {rows === null ? (
        <EmptyState title="Can't read applications" body="The internship_applications table isn't there yet. Run db/migrations/0044_internship_applications.sql in the Neon SQL editor." />
      ) : (
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatTile label="Applied" value={all.length} />
            <StatTile label="Shortlisted" value={count("shortlisted")} />
            <StatTile label="Accepted" value={count("accepted")} tone="ink" />
            <StatTile label="Rejected" value={count("rejected")} />
          </div>
          <nav aria-label="Status" className="-mx-4 flex gap-1 overflow-x-auto border-b border-line/25 px-4 sm:mx-0 sm:px-0">
            {tab(null, "All", all.length)}
            {STATUSES.map((s) => tab(s.key, s.label, count(s.key)))}
          </nav>
          {list.length === 0 ? (
            <EmptyState title="Nothing here yet" body="Applications from /internship land here instantly, newest first." />
          ) : (
            <ul className="flex flex-col gap-3">
              {list.map((r) => (
                <li key={r.id} className="card grid gap-4 p-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1.6fr)_minmax(0,1fr)]">
                  <div className="min-w-0 text-sm">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold">{r.name}</span>
                      <span className={clsx("px-1.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider", TONE[r.status])}>{r.status}</span>
                    </div>
                    <a href={`mailto:${r.email}`} className="block truncate text-xs underline underline-offset-2">{r.email}</a>
                    <a href={`https://wa.me/${r.phone.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer" className="block text-xs text-emerald-800 underline underline-offset-2">WhatsApp {r.phone}</a>
                    <p className="mt-1 text-xs text-muted">{[r.role === "working" ? "Working" : "Student", r.org, r.city].filter(Boolean).join(" · ")}</p>
                    <p className="text-xs text-muted">{hoursLabel(r.hours)} a week · applied {when(r.created_at)}</p>
                    <p className="mt-1 flex gap-3 text-xs">
                      {r.linkedin && <a href={r.linkedin} target="_blank" rel="noopener noreferrer" className="font-bold underline">LinkedIn</a>}
                      {r.instagram && <a href={`https://instagram.com/${r.instagram}`} target="_blank" rel="noopener noreferrer" className="font-bold underline">@{r.instagram}</a>}
                    </p>
                  </div>
                  <div className="min-w-0 text-sm">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-muted">Why</p>
                    <p className="whitespace-pre-line break-words">{r.why}</p>
                    {r.sales_experience && (<><p className="mt-2 text-[11px] font-bold uppercase tracking-wider text-muted">Experience</p><p className="whitespace-pre-line break-words">{r.sales_experience}</p></>)}
                  </div>
                  <div className="min-w-0">
                    <InternActions id={r.id} status={r.status} note={r.call_note} />
                    {r.status_changed_at && <p className="mt-1 text-[11px] text-muted">{r.status} {when(r.status_changed_at)}{r.status_by ? ` by ${r.status_by.split("@")[0]}` : ""}</p>}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </>
  );
}
