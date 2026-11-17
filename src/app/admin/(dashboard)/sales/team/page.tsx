import Link from "next/link";
import { PageTitle } from "@/components/admin/PageTitle";
import { SalesTabs } from "@/components/admin/sales/SalesTabs";
import { AddRep, RemoveRep } from "@/components/admin/sales/TeamForms";
import { requireOwner } from "@/lib/admin/auth";
import { getReps } from "@/lib/admin/sales";

const date = (iso: string) => new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" });

/**
 * The sales interns. Each signs in with Google at /sales and works only the
 * leads assigned to them; they never see admin. Hand out leads from Leads
 * (tick them, then "Assign to"), and see their work in the Report's By person.
 */
export default async function SalesTeamPage() {
  await requireOwner();
  const reps = await getReps();
  const active = reps.filter((r) => r.active);
  const past = reps.filter((r) => !r.active);

  return (
    <>
      <PageTitle
        eyebrow="Sales"
        title="Team"
        intro="Interns sign in at klymb.ai/sales/login with the Google email you add here. They see only the leads you assign them, and nothing else in admin."
      />
      <SalesTabs current="team" />
      <AddRep />

      <section aria-labelledby="interns" className="mt-8">
        <h2 id="interns" className="display mb-3 text-2xl">Interns</h2>
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-line/30 text-xs uppercase tracking-wider text-muted">
              <tr><th className="px-4 py-3">Intern</th><th className="px-4 py-3">Added</th><th className="px-4 py-3 text-right">Open leads</th><th className="px-4 py-3 text-right">Leads opened, 7 days</th><th className="px-4 py-3" /></tr>
            </thead>
            <tbody className="divide-y divide-line/20">
              {active.map((r) => (
                <tr key={r.email}>
                  <td className="px-4 py-3">
                    <b>{r.name ?? r.email.split("@")[0]}</b>
                    <span className="block text-xs text-muted">{r.email}</span>
                  </td>
                  <td className="px-4 py-3 text-xs nums">{date(r.created_at)}</td>
                  <td className="px-4 py-3 text-right nums">
                    <Link href={`/admin/sales/leads?owner=${encodeURIComponent(r.email)}`} className="font-bold underline underline-offset-4">{r.open}</Link>
                  </td>
                  <td className="px-4 py-3 text-right nums">{r.views7d}</td>
                  <td className="px-4 py-3 text-right"><RemoveRep email={r.email} name={r.name ?? r.email} open={r.open} /></td>
                </tr>
              ))}
              {active.length === 0 && <tr><td colSpan={5} className="px-4 py-6 text-center text-muted">No interns yet. Add one above.</td></tr>}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-muted">
          To give someone leads, open <Link href="/admin/sales/leads?owner=none" className="font-bold underline">unassigned leads</Link>, tick them and pick &quot;Assign to&quot;.
          Their outreach, conversations and sign-ups are in the Report under By person.
        </p>
      </section>

      {past.length > 0 && (
        <section aria-labelledby="past" className="mt-8">
          <h2 id="past" className="display mb-3 text-xl">Removed</h2>
          <ul className="flex flex-col gap-1 text-sm text-muted">
            {past.map((r) => <li key={r.email}>{r.name ?? r.email} · {r.email}</li>)}
          </ul>
          <p className="mt-2 text-xs text-muted">Adding the same email again gives them access back.</p>
        </section>
      )}
    </>
  );
}
