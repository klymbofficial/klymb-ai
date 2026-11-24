import type { Metadata } from "next";
import { OrgPageHead } from "@/components/company/HiringParts";
import { EmptyPanel, LoadError, RoleOnly } from "@/components/company/OrgPanels";
import { TestList, type TestRow } from "@/components/company/TestList";
import { companyStandings } from "@/lib/company/assessment-data";
import { canReview, seesAssessments } from "@/lib/company/assessment-rules";
import { requireCompany } from "@/lib/company/auth";
import { canSchedule, durationText, seesHiring } from "@/lib/company/batch-rules";
import { companyCatalog } from "@/lib/company/catalog-data";
import { publishedDates, testCounts } from "@/lib/company/test-hub-data";
import { testStatus } from "@/lib/company/test-hub-view";
import { db } from "@/lib/db/client";

export const metadata: Metadata = { title: "Assessments", robots: { index: false, follow: false } };

const day = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" });

/**
 * The company's tests in a recruiter's test list: status rail, search and
 * sort, and a card per test with its time, version, take-up across every
 * batch, and the actions the person's roles allow. Only those who hire,
 * review or run the workspace open it.
 */
export default async function AssessmentsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const member = await requireCompany(slug);
  const base = `/org/${member.companySlug}/assessments`;
  if (!seesAssessments(member)) return <RoleOnly role="recruiters, reviewers and admins" home={`/org/${member.companySlug}`} />;

  const head = <OrgPageHead title="Assessments" />;
  const sql = db();
  const catalog = sql ? await companyCatalog(sql, member.companyId) : null;
  const tests = (catalog ?? []).flatMap((e) => (e.item.kind === "assessment" ? [{ ...e, item: e.item }] : []));
  const slugs = tests.map((t) => t.item.slug);
  const [standings, counts, dates] = sql && catalog
    ? await Promise.all([companyStandings(sql, member.companyId, slugs), testCounts(sql, member.companyId), publishedDates(sql, slugs)])
    : [null, null, null];
  if (!catalog || !standings || !counts || !dates) return <>{head}<LoadError what="Assessments" /></>;
  if (!tests.length) {
    return (
      <>
        {head}
        <EmptyPanel title="No tests yet">Klymb adds them as your plan includes them. To ask what&apos;s available, write to team@klymb.ai.</EmptyPanel>
      </>
    );
  }

  const seesPeople = seesHiring(member);
  const recruiter = canSchedule(member);
  const reviewer = canReview(member);
  const rows: TestRow[] = tests.map((t) => {
    const s = standings.get(t.item.slug)!;
    const shown = s.inUse ?? s.latest;
    const status = testStatus(s);
    const c = counts.get(t.item.slug) ?? { invited: 0, taken: 0, batches: 0 };
    const published = shown ? dates.get(shown.id) ?? null : null;
    const href = `${base}/${t.item.slug}`;
    const waiting = s.latest && !s.latestReview;
    return {
      slug: t.item.slug,
      href,
      title: t.item.title,
      role: t.item.audience,
      status,
      duration: shown?.minutes ? durationText(shown.minutes) : t.item.duration,
      versionLine: shown ? `Version ${shown.version}${published ? ` · published ${day(published)}` : ""}` : "Not published yet",
      publishedAt: published,
      note: waiting
        ? reviewer ? `Version ${s.latest!.version} is waiting for your review.` : `Version ${s.latest!.version} is waiting for a reviewer in your company.`
        : s.latestReview?.decision === "declined" ? `Version ${s.latest!.version} was declined.` : null,
      invited: c.invited,
      taken: c.taken,
      reportHref: seesPeople && s.latest ? `${href}?tab=candidates` : null,
      previewHref: s.latest ? `${href}?tab=preview` : null,
      inviteHref: recruiter && s.inUse ? `/org/${member.companySlug}/hiring/new?test=${encodeURIComponent(t.item.slug)}` : null,
    };
  });

  return (
    <>
      {head}
      <TestList rows={rows} now={new Date().toISOString()} />
    </>
  );
}
