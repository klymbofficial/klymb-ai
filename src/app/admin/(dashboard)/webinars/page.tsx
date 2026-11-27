import clsx from "clsx";
import Link from "next/link";
import { EmptyState } from "@/components/admin/EmptyState";
import { ExportCsv } from "@/components/admin/ExportCsv";
import { PageTitle } from "@/components/admin/PageTitle";
import { StatTile } from "@/components/admin/StatTile";
import { WebinarMeetSend } from "@/components/admin/WebinarMeetSend";
import { AutoSelect } from "@/components/admin/sales/LeadSearch";
import { getWebinarList, getWebinarRegistrations, type WebinarRegistration } from "@/lib/admin/webinars";
import { WEBINAR, webinarOpen } from "@/lib/webinar";

export const dynamic = "force-dynamic";
// Sending the Meet link to everyone runs inside one request.
export const maxDuration = 300;

const iso = (v: string | Date | null) => (v ? new Date(v).toISOString() : "");
const when = (v: string | Date) => new Date(v).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" });

const SLUG = /^[a-z0-9-]{1,80}$/;

/**
 * Who registered for the live webinar on /webinar, with a CSV for mailing them the Meet link on the day.
 * ?webinar= opens a past one's list instead, read-only.
 */
export default async function AdminWebinarsPage({ searchParams }: { searchParams: Promise<{ webinar?: string }> }) {
  const sp = await searchParams;
  const slug = sp.webinar && SLUG.test(sp.webinar) ? sp.webinar : WEBINAR.slug;
  const isCurrent = slug === WEBINAR.slug;
  const [rows, webinars] = await Promise.all([
    getWebinarRegistrations(slug),
    getWebinarList({ slug: WEBINAR.slug, label: `${WEBINAR.title} · ${WEBINAR.shortDate} (now)` }),
  ]);
  const all = rows ?? [];
  const past = webinars.find((w) => w.slug === slug);
  // A paid webinar's seat is only theirs once paid; the rest started checkout and stopped, which still makes them a lead.
  // A past webinar's price is no longer in lib/webinar.ts, so its rows say whether it charged.
  const paid = isCurrent ? !!WEBINAR.price : all.some((r) => r.amount != null);
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
        eyebrow={isCurrent ? "Live webinar" : "Past webinar"}
        title={isCurrent ? WEBINAR.title : (past?.label ?? slug)}
        intro={isCurrent
          ? `${WEBINAR.dateLabel}, ${WEBINAR.timeLabel}.${WEBINAR.price ? ` ${WEBINAR.price.label} a seat. Everyone who has paid, newest first; people who started checkout and stopped are listed below.` : " Everyone who registered on /webinar, newest first."}`
          : "Everyone who registered for this webinar, newest first. The /webinar page now shows the next one."}
        actions={<div className="flex items-center gap-2">{isCurrent && <Link href="/webinar" className="rounded-lg border border-line/50 px-3 py-1.5 text-xs font-bold hover:bg-ink hover:text-paper">Open page</Link>}<ExportCsv rows={csv} filename={`klymb-webinar-${slug}`} /></div>}
      />
      {webinars.length > 1 && (
        <form method="get" className="mb-6 flex items-center gap-2">
          <label htmlFor="webinar-pick" className="text-xs font-extrabold uppercase tracking-[0.1em] text-muted">Webinar</label>
          <AutoSelect id="webinar-pick" name="webinar" defaultValue={slug} className="rounded-lg border border-line/40 bg-card px-3 py-2 text-sm font-semibold focus:border-ink focus:outline-none">
            {webinars.map((w) => <option key={w.slug} value={w.slug}>{w.label} · {w.registered}</option>)}
          </AutoSelect>
          <noscript><button type="submit" className="rounded-lg border border-line/50 px-3 py-2 text-xs font-bold">Open</button></noscript>
        </form>
      )}
      {rows === null ? (
        <EmptyState title="Can't read registrations" body="The webinar_registrations table isn't there yet. Run db/migrations/0042_webinar_registrations.sql, then 0049_webinar_payments.sql, in the Neon SQL editor." />
      ) : all.length === 0 ? (
        <EmptyState title="Nothing here yet" body="Registrations from /webinar land here instantly, newest first." />
      ) : (
        <div className="flex flex-col gap-6">
          {/* Only until the webinar ends: after that the Meet room is dead. */}
          {isCurrent && webinarOpen() && <WebinarMeetSend meetUrl={WEBINAR.meetUrl} total={list.length} />}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatTile label={paid ? "Paid" : "Registered"} value={list.length} hint={paid && unpaid.length ? `${unpaid.length} started checkout, didn't pay` : undefined} />
            <StatTile label="Students" value={students} />
            <StatTile label="Working" value={list.length - students} />
            <StatTile label="Confirmation sent" value={emailed} hint={emailed < list.length ? `${list.length - emailed} not emailed` : "Everyone"} tone={emailed < list.length ? "red" : "ink"} />
          </div>
          <SeatTable rows={list} empty={paid ? "No paid seats yet." : "No registrations yet."} />
          {unpaid.length > 0 && (
            <section className="flex flex-col gap-3">
              <div>
                <h2 className="text-sm font-extrabold uppercase tracking-[0.1em]">Started checkout, didn&apos;t pay · {unpaid.length}</h2>
                <p className="mt-1 text-xs text-muted">
                  They filled in the form and closed the payment window, or their card was declined. No seat, no confirmation email and no Meet link. Worth a follow-up: if they pay, they move up to the list above.
                </p>
              </div>
              <SeatTable rows={unpaid} unpaid />
            </section>
          )}
        </div>
      )}
    </>
  );
}

/** One table of sign-ups. The unpaid one swaps the email column for a WhatsApp link, for following up. */
function SeatTable({ rows, unpaid, empty }: { rows: WebinarRegistration[]; unpaid?: boolean; empty?: string }) {
  const heads = [unpaid ? "Started" : "Registered", "Name", "Contact", "Role", "Question", unpaid ? "Follow up" : "Email"];
  return (
    <div className={clsx("card overflow-x-auto", unpaid && "opacity-90")}>
      <table className="w-full min-w-[860px] text-left text-sm">
        <thead className={unpaid ? "bg-surface text-ink" : "bg-ink text-paper"}>
          <tr>
            {heads.map((h) => <th key={h} scope="col" className="p-3 text-xs font-extrabold uppercase tracking-[0.1em]">{h}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr className="border-t border-line"><td colSpan={heads.length} className="p-6 text-center text-sm text-muted">{empty}</td></tr>
          )}
          {rows.map((r, i) => (
            <tr key={r.id} className={clsx("border-t border-line align-top", i % 2 && "bg-surface/60")}>
              <td className="p-3 whitespace-nowrap nums text-muted">{when(r.created_at)}</td>
              <td className="max-w-[14rem] p-3 font-bold break-words">{r.name}</td>
              <td className="max-w-[18rem] p-3 break-words">
                <a href={`mailto:${r.email}`} className="underline underline-offset-2 hover:text-red-deep">{r.email}</a>
                <span className="block text-xs text-muted">{r.phone}</span>
              </td>
              <td className="p-3 text-xs">{r.role === "working" ? "Working" : "Student"}<span className="block text-muted">{r.org ?? "-"}</span></td>
              <td className="max-w-[22rem] p-3 text-xs break-words">{r.question ?? <span className="text-muted">-</span>}</td>
              <td className="p-3 text-xs">
                {unpaid
                  ? <a href={`https://wa.me/${r.phone.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer" className="font-bold text-emerald-800 underline underline-offset-2">WhatsApp</a>
                  : r.confirmation_sent_at ? "Sent" : <span className="font-bold text-red">Not sent</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
