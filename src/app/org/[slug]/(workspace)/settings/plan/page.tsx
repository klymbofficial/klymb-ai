import type { Metadata } from "next";
import Link from "next/link";
import { ProgressMeter } from "@/components/company/OrgCharts";
import { LoadError } from "@/components/company/OrgPanels";
import { SettingsHead } from "@/components/company/SettingsParts";
import { contact } from "@/data/config";
import { requireSettingsAdmin } from "@/lib/company/settings-access";
import { loadPlanUsage } from "@/lib/company/settings-data";
import { db } from "@/lib/db/client";

export const metadata: Metadata = { title: "Plan and usage", robots: { index: false, follow: false } };

const n = (v: number) => v.toLocaleString("en-IN");

/** Seats and what the company has used, like HackerEarth's "Your current plan & usage". */
export default async function PlanPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const admin = await requireSettingsAdmin(slug);
  const sql = db();
  const u = sql ? await loadPlanUsage(sql, admin.companyId) : null;
  return (
    <>
      <SettingsHead title="Your current plan & usage" />
      {!u ? <LoadError what="Your plan" /> : (
        <div className="grid max-w-4xl gap-6 xl:grid-cols-[16rem_minmax(0,1fr)]">
          <section className="overflow-hidden rounded-lg bg-[#2f4f63] text-white">
            <p className="bg-night px-5 py-4 text-lg font-semibold">Klymb for teams</p>
            <div className="flex flex-col gap-5 px-5 py-5">
              <div><p className="text-sm text-white/75">Seats</p><p className="text-2xl font-semibold nums">{n(u.seats)}</p></div>
              <div><p className="text-sm text-white/75">Admins</p><p className="text-2xl font-semibold nums">{n(u.admins)}</p></div>
              <div><p className="text-sm text-white/75">Teams</p><p className="text-2xl font-semibold nums">{n(u.teams)}</p></div>
            </div>
          </section>
          <section className="rounded-lg border border-line/30 bg-white p-6">
            <p className="text-lg font-semibold nums">{n(Math.max(0, u.seats - u.members))} seats free</p>
            <div className="mt-3"><ProgressMeter value={u.members} total={u.seats} label="Seats used" /></div>
            <div className="mt-2 flex justify-between text-sm text-muted nums"><span>{n(u.members)} used</span><span>{n(u.seats)} total</span></div>
            <h2 className="mt-6 border-t border-line/20 pt-5 text-base font-semibold">Assessments</h2>
            <ul className="mt-3 flex flex-col gap-2 text-sm nums">
              <li>{n(u.tests)} tests sent to candidates</li>
              <li>{n(u.invited)} candidates invited</li>
              <li>{n(u.started)} candidates started a test</li>
              <li>{n(u.submitted)} tests submitted</li>
            </ul>
            <p className="mt-6 border-t border-line/20 pt-5 text-sm text-muted">
              A seat is used by each active member of your company; candidates you invite to tests don&apos;t use seats. To add seats or ask about your plan, write to <a href={`mailto:${contact.email}?subject=Plan%20and%20seats`} className="font-semibold text-[#1f4fd1] hover:underline">{contact.email}</a>. Manage members on the <Link href={`/org/${admin.companySlug}/teams`} className="font-semibold text-[#1f4fd1] hover:underline">Team</Link> page.
            </p>
          </section>
        </div>
      )}
    </>
  );
}
