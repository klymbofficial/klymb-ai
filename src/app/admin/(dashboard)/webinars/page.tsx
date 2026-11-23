import clsx from "clsx";
import Link from "next/link";
import { EmptyState } from "@/components/admin/EmptyState";
import { ExportCsv } from "@/components/admin/ExportCsv";
import { PageTitle } from "@/components/admin/PageTitle";
import { StatTile } from "@/components/admin/StatTile";
import { WebinarMeetSend } from "@/components/admin/WebinarMeetSend";
import { getWebinarRegistrations } from "@/lib/admin/webinars";
import { WEBINAR, webinarOpen } from "@/lib/webinar";

export const dynamic = "force-dynamic";
// Sending the Meet link to everyone runs inside one request.
export const maxDuration = 300;

const iso = (v: string | Date | null) => (v ? new Date(v).toISOString() : "");
const when = (v: string | Date) => new Date(v).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" });

/** Who registered for the live webinar on /webinar, with a CSV for mailing them the Meet link on the day. */
export default async function AdminWebinarsPage() {
  const rows = await getWebinarRegistrations(WEBINAR.slug);
  const all = rows ?? [];
  // A paid webinar's seat is only theirs once paid; the rest started checkout and stopped, which still makes them a lead.
  const paid = !!WEBINAR.price;
  const list = paid ? all.filter((r) => r.paid_at) : all;
  const unpaid = paid ? all.filter((r) => !r.paid_at) : [];
  const students = list.filter((r) => r.role === "student").length;
  const emailed = list.filter((r) => r.confirmation_sent_at).length;
  const csv = all.map((r) => ({
    registered_at: iso(r.created_at), name: r.name, email: r.email, phone: r.phone,
    role: r.role === "working" ? "Working professional" : "Student", college_or_company: r.org ?? "", question: r.question ?? "",
    confirmation_emailed: r.confirmation_sent_at ? "yes" : "no",
    ...(paid ? { paid: r.paid_at ? "yes" : "no" } : {}),
  }));

  return (
    <>
      <PageTitle
        eyebrow="Live webinar"
        title={WEBINAR.title}
        intro={`${WEBINAR.dateLabel}, ${WEBINAR.timeLabel}.${paid ? ` ${WEBINAR.price!.label} a seat.` : ""} Everyone who registered on /webinar, newest first.`}
        actions={<div className="flex items-center gap-2"><Link href="/webinar" className="rounded-lg border border-line/50 px-3 py-1.5 text-xs font-bold hover:bg-ink hover:text-paper">Open page</Link><ExportCsv rows={csv} filename="klymb-webinar" /></div>}
      />
      {rows === null ? (
        <EmptyState title="Can't read registrations" body="The webinar_registrations table isn't there yet. Run db/migrations/0042_webinar_registrations.sql, then 0049_webinar_payments.sql, in the Neon SQL editor." />
      ) : all.length === 0 ? (
        <EmptyState title="Nothing here yet" body="Registrations from /webinar land here instantly, newest first." />
      ) : (
        <div className="flex flex-col gap-6">
          {/* Only until the webinar ends: after that the Meet room is dead. */}
          {webinarOpen() && <WebinarMeetSend meetUrl={WEBINAR.meetUrl} total={list.length} />}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatTile label={paid ? "Paid" : "Registered"} value={list.length} hint={paid && unpaid.length ? `${unpaid.length} started checkout, didn't pay` : undefined} />
            <StatTile label="Students" value={students} />
            <StatTile label="Working" value={list.length - students} />
            <StatTile label="Confirmation sent" value={emailed} hint={emailed < list.length ? `${list.length - emailed} not emailed` : "Everyone"} tone={emailed < list.length ? "red" : "ink"} />
          </div>
          <div className="card overflow-x-auto">
            <table className="w-full min-w-[860px] text-left text-sm">
              <thead className="bg-ink text-paper">
                <tr>
                  {["Registered", "Name", "Contact", "Role", "Question", "Email", ...(paid ? ["Paid"] : [])].map((h) => (
                    <th key={h} scope="col" className="p-3 text-xs font-extrabold uppercase tracking-[0.1em]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {all.map((r, i) => (
                  <tr key={r.id} className={clsx("border-t border-line align-top", i % 2 && "bg-surface/60")}>
                    <td className="p-3 whitespace-nowrap nums text-muted">{when(r.created_at)}</td>
                    <td className="max-w-[14rem] p-3 font-bold break-words">{r.name}</td>
                    <td className="max-w-[18rem] p-3 break-words">
                      <a href={`mailto:${r.email}`} className="underline underline-offset-2 hover:text-red-deep">{r.email}</a>
                      <span className="block text-xs text-muted">{r.phone}</span>
                    </td>
                    <td className="p-3 text-xs">{r.role === "working" ? "Working" : "Student"}<span className="block text-muted">{r.org ?? "-"}</span></td>
                    <td className="max-w-[22rem] p-3 text-xs break-words">{r.question ?? <span className="text-muted">-</span>}</td>
                    <td className="p-3 text-xs">{r.confirmation_sent_at ? "Sent" : <span className="font-bold text-red">Not sent</span>}</td>
                    {paid && <td className="p-3 text-xs">{r.paid_at ? "Paid" : <span className="text-muted">Not paid</span>}</td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}
