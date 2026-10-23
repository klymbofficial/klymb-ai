import { EmptyState } from "@/components/admin/EmptyState";
import { PageTitle } from "@/components/admin/PageTitle";
import { RangeTabs } from "@/components/admin/RangeTabs";
import { requireAdmin } from "@/lib/admin/auth";
import { db } from "@/lib/db/client";
import { setTicketStatus } from "@/app/admin/support-actions";

interface Ticket { id: string; created_at: string; email: string; name: string | null; message: string; page: string | null; context: Record<string, string>; status: "open" | "resolved" }

export default async function AdminSupportPage({ searchParams }: { searchParams: Promise<{ show?: string }> }) {
  await requireAdmin();
  const show = (await searchParams).show === "resolved" ? "resolved" : "open";
  const sql = db();
  const { data } = sql
    ? await sql.rows<Ticket>`
        select id, created_at, email, name, message, page, context, status
          from course.support_tickets
         where status = ${show}
         order by created_at desc
         limit 200
      `
    : { data: null };
  const tickets = data ?? [];

  return (
    <>
      <PageTitle
        eyebrow="Kamran"
        title="Support requests"
        intro="Questions Kamran couldn't answer, sent with the learner's progress. Each one is also emailed to team@klymb.ai; reply from there, then mark it resolved."
        actions={<RangeTabs param="show" current={show} options={[{ key: "open", label: "Open" }, { key: "resolved", label: "Resolved" }]} />}
      />
      {tickets.length === 0 ? (
        <EmptyState title={show === "open" ? "Nothing waiting" : "None resolved yet"} body="New requests from the help chat appear here." />
      ) : (
        <ul className="grid gap-3">
          {tickets.map((t) => (
            <li key={t.id} className="card p-5">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="font-bold">
                  {t.name || t.email} <a href={`mailto:${t.email}?subject=${encodeURIComponent("Re: your Klymb question")}`} className="ml-1 text-sm font-semibold text-red-deep underline underline-offset-2">{t.email}</a>
                </p>
                <time className="text-xs text-muted" dateTime={t.created_at}>
                  {new Date(t.created_at).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" })}
                </time>
              </div>
              <p className="mt-2 whitespace-pre-wrap text-sm">{t.message}</p>
              {(t.page || Object.keys(t.context ?? {}).length > 0) && (
                <dl className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
                  {t.page && <div><dt className="inline font-semibold">Page: </dt><dd className="inline">{t.page}</dd></div>}
                  {Object.entries(t.context ?? {}).map(([k, v]) => (
                    <div key={k}><dt className="inline font-semibold">{k}: </dt><dd className="inline">{v}</dd></div>
                  ))}
                </dl>
              )}
              <form action={setTicketStatus.bind(null, t.id, t.status === "open" ? "resolved" : "open")} className="mt-3">
                <button className="rounded-full bg-ink px-3.5 py-1.5 text-xs font-bold text-white transition-transform active:scale-[0.97]">
                  {t.status === "open" ? "Mark resolved" : "Reopen"}
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
