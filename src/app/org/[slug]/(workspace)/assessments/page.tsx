import type { Metadata } from "next";
import { CreateAssessment } from "@/components/company/CreateAssessment";
import { OrgPageHead } from "@/components/company/HiringParts";
import { EmptyPanel, LoadError, RoleOnly } from "@/components/company/OrgPanels";
import { TestList, type TestRow } from "@/components/company/TestList";
import { companyStandings } from "@/lib/company/assessment-data";
import { canReview, canWriteTests, seesAssessments } from "@/lib/company/assessment-rules";
import { requireCompany } from "@/lib/company/auth";
import { canSchedule, durationText, seesHiring } from "@/lib/company/batch-rules";
import { companyCatalog } from "@/lib/company/catalog-data";
import { publishedFacts, testCounts } from "@/lib/company/test-hub-data";
import { testStatus } from "@/lib/company/test-hub-view";
import { db } from "@/lib/db/client";
import { klymbLibrary, ownLibrary } from "@/lib/company/library-data";
import { activeRoles } from "@/lib/company/roles-data";
import { startBlocked } from "@/lib/company/test-settings";
import { companyTestSettings } from "@/lib/company/test-settings-data";

export const metadata: Metadata = { title: "Assessments", robots: { index: false, follow: false } };

const day = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" });

/**
 * The company's tests in a recruiter's test list: status rail, search and
 * sort, and a card per test with its time, version, take-up across every
 * batch, and the actions the person's roles allow. Only those who hire,
 * review or run the workspace open it.
 */
export default async function AssessmentsPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { slug } = await params;
  const sp = await searchParams;
  const member = await requireCompany(slug);
  const base = `/org/${member.companySlug}/assessments`;
  if (!seesAssessments(member)) return <RoleOnly role="recruiters, reviewers and admins" home={`/org/${member.companySlug}`} />;

  const writer = canWriteTests(member);
  const sql = db();
  // The Create modal's roles and a slim view of the questions it can draw on (tags and difficulty; never the answers).
  const [roles, klymb, mine] = writer && sql ? await Promise.all([activeRoles(sql), klymbLibrary(sql), ownLibrary(sql, member.companyId)]) : [[], [], []];
  const pool = [...(klymb ?? []), ...(mine ?? [])].map(({ id, type, status, tags, difficulty, points, minutes }) => ({ id, type, status, tags, difficulty, points, minutes }));
  const head = (
    <OrgPageHead
      title="Assessments"
      actions={writer ? <CreateAssessment slug={member.companySlug} roles={roles ?? []} pool={pool} startOpen={sp.create === "1"} /> : undefined}
    />
  );
  const catalog = sql ? await companyCatalog(sql, member.companyId) : null;
  const tests = (catalog ?? []).flatMap((e) => (e.item.kind === "assessment" ? [{ ...e, item: e.item }] : []));
  const slugs = tests.map((t) => t.item.slug);
  const [standings, counts, dates, settings] = sql && catalog
    ? await Promise.all([companyStandings(sql, member.companyId, slugs), testCounts(sql, member.companyId), publishedFacts(sql, member.companyId, slugs), companyTestSettings(sql, member.companyId)])
    : [null, null, null, null];
  if (!catalog || !standings || !counts || !dates || !settings) return <>{head}<LoadError what="Assessments" /></>;
  if (!tests.length) {
    return (
      <>
        {head}
        <EmptyPanel title="No tests yet">
          {writer ? "Create one with Create assessment: pick a role and Klymb picks the questions, or write your own." : "Klymb adds them as your plan includes them, and your recruiters can write their own. To ask what's available, write to team@klymb.ai."}
        </EmptyPanel>
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
    const facts = shown ? dates.get(shown.id) ?? null : null;
    const published = facts?.at ?? null;
    // Who published it (user, 26 Nov): Klymb for Klymb's tests; the person, by name, for the company's own.
    const publisher = !facts ? null : t.own ? { key: facts.by, label: facts.name ?? facts.by } : { key: "klymb", label: "Klymb" };
    const href = `${base}/${t.item.slug}`;
    const waiting = s.latest && !s.latestReview;
    const own = settings.get(t.item.slug);
    const blocked = own ? startBlocked(own) : null;
    return {
      slug: t.item.slug,
      href,
      title: t.item.title,
      role: t.item.audience,
      status,
      duration: shown?.minutes ? durationText(shown.minutes) : t.item.duration,
      versionLine: shown ? `Version ${shown.version}${published ? ` · published ${day(published)}` : ""}` : "Not published yet",
      publishedAt: published,
      publisher,
      note: waiting
        ? reviewer ? `Version ${s.latest!.version} is waiting for your review.` : `Version ${s.latest!.version} is waiting for a reviewer in your company.`
        : s.latestReview?.decision === "declined" ? `Version ${s.latest!.version} was declined.` : null,
      invited: c.invited,
      taken: c.taken,
      reportHref: seesPeople && s.latest ? `${href}?tab=candidates` : null,
      previewHref: s.latest ? `${href}?preview=1` : null,
      inviteHref: recruiter && s.inUse && !blocked ? `${href}?tab=candidates&invite=1` : null,
      own: !!t.own,
      tags: own?.tags ?? [],
      blocked,
      editHref: t.own && writer ? `${href}/edit` : null,
    };
  });

  return (
    <>
      {head}
      <TestList rows={rows} now={new Date().toISOString()} />
    </>
  );
}
