import type { Metadata } from "next";
import Link from "next/link";
import { EmptyPanel, LoadError, OrgPageTitle, RoleOnly } from "@/components/company/OrgPanels";
import { companyStandings } from "@/lib/company/assessment-data";
import { canReview, minutesLabel, seesAssessments, standingLabel, type Standing } from "@/lib/company/assessment-rules";
import { requireCompany } from "@/lib/company/auth";
import { companyCatalog } from "@/lib/company/catalog-data";
import { db } from "@/lib/db/client";

export const metadata: Metadata = { title: "Assessments", robots: { index: false, follow: false } };

const ready = (s: Standing | undefined) => !!s?.inUse;
const waiting = (s: Standing | undefined) => !!s?.latest && !s.latestReview;

/**
 * The tests this company has from Klymb, and where each one stands: waiting
 * for a reviewer, approved and ready for recruiters to pick, or not
 * published yet. Ready ones come first. Only the people who hire and those
 * who run the workspace open it, since it leads to the real task.
 */
export default async function AssessmentsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const member = await requireCompany(slug);
  const base = `/org/${member.companySlug}/assessments`;
  if (!seesAssessments(member)) return <RoleOnly role="recruiters, reviewers and admins" home={`/org/${member.companySlug}`} />;

  const sql = db();
  const catalog = sql ? await companyCatalog(sql, member.companyId) : null;
  const tests = (catalog ?? []).filter((e) => e.item.kind === "assessment");
  const standings = sql && catalog ? await companyStandings(sql, member.companyId, tests.map((t) => t.item.slug)) : null;
  const title = <OrgPageTitle title="Assessments" />;
  if (!catalog || !standings) return <>{title}<LoadError what="Assessments" /></>;
  if (!tests.length) {
    return (
      <>
        {title}
        <EmptyPanel title="No tests yet">Klymb adds them as your plan includes them. To ask what&apos;s available, write to team@klymb.ai.</EmptyPanel>
      </>
    );
  }

  const order = (slug: string) => (ready(standings.get(slug)) ? 0 : waiting(standings.get(slug)) ? 1 : 2);
  const sorted = [...tests].sort((a, b) => order(a.item.slug) - order(b.item.slug));
  const toReview = canReview(member) ? tests.filter((t) => waiting(standings.get(t.item.slug))).length : 0;

  return (
    <>
      {title}
      {toReview > 0 && (
        <p className="mb-6 border-l-4 border-red-strong bg-white px-4 py-3 text-sm font-semibold">
          {toReview === 1 ? "1 test is" : `${toReview} tests are`} waiting for your review.
        </p>
      )}
      <ul className="flex flex-col gap-4">
        {sorted.map((t) => {
          const s = standings.get(t.item.slug)!;
          return (
            <li key={t.item.slug} className="card flex flex-col gap-2 p-5 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
              <div className="min-w-0">
                <h2 className="display text-xl">
                  <Link href={`${base}/${t.item.slug}`} className="underline-offset-4 hover:underline">{t.item.title}</Link>
                </h2>
                {t.item.kind === "assessment" && (
                  <p className="mt-1 text-xs text-muted">
                    {/* The time of the version recruiters use, or of the newest one; the listing's until there is one. */}
                    {t.item.audience} · {(s.inUse ?? s.latest)?.minutes ? minutesLabel((s.inUse ?? s.latest)!.minutes!) : t.item.duration}
                  </p>
                )}
              </div>
              <p className={`shrink-0 text-sm font-bold ${ready(s) ? "" : "text-muted"}`}>
                {ready(s) && <span aria-hidden className="mr-1.5 inline-block size-2 bg-red-strong align-middle" />}
                {standingLabel(s)}
              </p>
            </li>
          );
        })}
      </ul>
    </>
  );
}
