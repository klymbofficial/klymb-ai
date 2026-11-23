import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CandidatePreview, VersionDetails } from "@/components/company/AssessmentParts";
import { ReviewPanel } from "@/components/company/ReviewPanel";
import { EmptyPanel, LoadError, RoleOnly } from "@/components/company/OrgPanels";
import { companyReviews, loadVersions } from "@/lib/company/assessment-data";
import { candidateTask, canReview, seesAssessments, standingOf } from "@/lib/company/assessment-rules";
import { requireCompany } from "@/lib/company/auth";
import { companyCatalog } from "@/lib/company/catalog-data";
import { db } from "@/lib/db/client";

export const metadata: Metadata = { title: "Assessment", robots: { index: false, follow: false } };

const h2 = "text-xs font-extrabold uppercase tracking-[0.14em] text-muted";
const day = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" });
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

/**
 * One test, one version at a time: the full test with the reviewers'
 * scoring guide, or exactly what a candidate will see. A reviewer approves
 * or declines the newest version for the company; older versions are kept
 * read-only with the decision made on each.
 */
export default async function AssessmentPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string; item: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { slug, item: itemSlug } = await params;
  const member = await requireCompany(slug);
  const base = `/org/${member.companySlug}/assessments`;
  if (!seesAssessments(member)) return <RoleOnly role="recruiters, reviewers and admins" home={`/org/${member.companySlug}`} />;

  const sql = db();
  const catalog = sql ? await companyCatalog(sql, member.companyId) : null;
  if (!sql || !catalog) return <LoadError what="This test" />;
  const entry = catalog.find((e) => e.item.slug === itemSlug && e.item.kind === "assessment");
  if (!entry) notFound();
  const versions = await loadVersions(sql, itemSlug);
  const reviews = versions ? await companyReviews(sql, member.companyId, versions.map((v) => v.id)) : null;
  if (!versions || !reviews) return <LoadError what="This test" />;

  const back = <Link href={base} className="text-sm font-bold underline underline-offset-4 hover:text-red-deep">← Assessments</Link>;
  if (!versions.length) {
    return (
      <>
        {back}
        <h1 className="display mt-4 mb-6 text-3xl">{entry.item.title}</h1>
        <EmptyPanel title="Not published yet">
          Klymb is still writing this test. You can see what it covers in the{" "}
          <Link href={`/org/${member.companySlug}/catalog/${itemSlug}`} className="font-bold underline underline-offset-2">catalog</Link>.
        </EmptyPanel>
      </>
    );
  }

  const sp = await searchParams;
  const asked = Number(one(sp.v));
  const latest = versions[0];
  const shown = one(sp.v) === undefined ? latest : versions.find((v) => v.version === asked);
  if (!shown) notFound();
  const candidate = one(sp.view) === "candidate";
  const isLatest = shown.id === latest.id;
  const standing = standingOf(versions, reviews);
  const review = reviews.get(shown.id) ?? null;
  const hrefFor = (v: number, view: "full" | "candidate") => `${base}/${itemSlug}?v=${v}${view === "candidate" ? "&view=candidate" : ""}`;

  return (
    <>
      {back}

      <header className="mt-4 mb-6 flex flex-col gap-2">
        <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-muted">
          Assessment · Version {shown.version}{isLatest ? (versions.length > 1 ? ", newest" : "") : ` of ${latest.version}`}
        </p>
        <h1 className="display text-3xl">{shown.title}</h1>
        <p className="text-xs text-muted">Published by Klymb on {day(shown.publishedAt)}</p>
        {!isLatest && (
          <p className="text-sm font-semibold">
            An older version. <Link href={hrefFor(latest.version, "full")} className="underline underline-offset-4">See version {latest.version}</Link>
          </p>
        )}
      </header>

      {isLatest && canReview(member) ? (
        <ReviewPanel slug={member.companySlug} item={itemSlug} versionId={shown.id} version={shown.version} review={review} inUse={standing.inUse?.version ?? null} />
      ) : (
        <p className="mb-8 text-sm">
          {review
            ? review.decision === "approved"
              ? `Approved by ${review.decidedBy} on ${day(review.decidedAt)}.`
              : `Declined by ${review.decidedBy} on ${day(review.decidedAt)}.`
            : isLatest
              ? `Waiting for a reviewer in your company to approve it.${standing.inUse ? ` Until then, recruiters use version ${standing.inUse.version}.` : ""}`
              : "No decision was made on this version."}
          {review?.note && <span className="mt-1 block text-muted">“{review.note}”</span>}
        </p>
      )}

      <div className="grid gap-x-10 gap-y-8 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="min-w-0">
          <nav aria-label="View" className="mb-6 flex flex-wrap gap-1">
            {(["full", "candidate"] as const).map((view) => {
              const current = (view === "candidate") === candidate;
              return (
                <Link
                  key={view}
                  href={hrefFor(shown.version, view)}
                  aria-current={current ? "page" : undefined}
                  className={current ? "bg-ink px-3 py-2 text-sm font-bold text-paper" : "border border-line/50 px-3 py-2 text-sm font-bold hover:border-ink"}
                >
                  {view === "full" ? "Full test" : "What candidates see"}
                </Link>
              );
            })}
          </nav>
          {candidate ? (
            <div className="card p-5 sm:p-8">
              <CandidatePreview t={candidateTask(shown)} />
            </div>
          ) : (
            <VersionDetails v={shown} />
          )}
        </div>

        <aside className="border-t border-line/30 pt-5" aria-labelledby="versions">
          <h2 id="versions" className={h2}>Versions</h2>
          <ol className="mt-3 flex flex-col gap-3 text-sm">
            {versions.map((v) => {
              const r = reviews.get(v.id);
              return (
                <li key={v.id}>
                  <Link href={hrefFor(v.version, candidate ? "candidate" : "full")} aria-current={v.id === shown.id ? "page" : undefined} className="font-bold underline-offset-4 hover:underline aria-[current=page]:underline">
                    Version {v.version}
                  </Link>
                  <span className="block text-xs text-muted">
                    {day(v.publishedAt)} · {r ? (r.decision === "approved" ? "Approved" : "Declined") : v.id === latest.id ? "Waiting for review" : "Not reviewed"}
                    {standing.inUse?.id === v.id && " · in use"}
                  </span>
                </li>
              );
            })}
          </ol>
          <p className="mt-4 text-xs text-muted">A published version never changes. Klymb&apos;s edits come as a new version, and runs keep the version they started on.</p>
        </aside>
      </div>
    </>
  );
}
