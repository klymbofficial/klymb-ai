import Link from "next/link";
import { notFound } from "next/navigation";
import { AssessmentEditor } from "@/components/admin/AssessmentEditor";
import { EmptyState } from "@/components/admin/EmptyState";
import { PageTitle } from "@/components/admin/PageTitle";
import { CandidatePreview, VersionDetails } from "@/components/company/AssessmentParts";
import { codeItem } from "@/data/business-catalog";
import { requireAdmin } from "@/lib/admin/auth";
import { allReviews, loadDraft, loadVersions } from "@/lib/company/assessment-data";
import { candidateTask, contentOf, startingDraft } from "@/lib/company/assessment-rules";
import { loadCatalog } from "@/lib/company/catalog-data";
import { klymbLibrary } from "@/lib/company/library-data";
import { db } from "@/lib/db/client";

const day = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" });
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
const tab = (current: boolean) => (current ? "bg-ink px-3 py-2 text-sm font-bold text-paper" : "border border-line/50 px-3 py-2 text-sm font-bold hover:border-ink");

/**
 * One assessment, for Klymb: the draft editor, every published version, and
 * each company's decision on each version (with a decline's note). `?v=N`
 * opens a published version read-only, as reviewers or candidates see it.
 */
export default async function AdminAssessmentPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdmin();
  const { slug } = await params;
  const code = codeItem(slug);
  if (code?.kind !== "assessment") notFound();

  const sql = db();
  const [draft, versions, catalog, klymbQs] = sql ? await Promise.all([loadDraft(sql, slug), loadVersions(sql, slug), loadCatalog(sql), klymbLibrary(sql)]) : [null, null, null, null];
  const reviews = sql && versions ? await allReviews(sql, versions.map((v) => v.id)) : null;
  const back = <Link href="/admin/catalog" className="mb-4 inline-block text-sm font-bold underline underline-offset-4">← Business catalog</Link>;
  if (draft === null || !versions || !catalog || !reviews) {
    return <>{back}<EmptyState title="Assessment unavailable" body="The database isn't reachable from here right now." /></>;
  }

  const sp = await searchParams;
  const asked = one(sp.v);
  const latest = versions[0] ?? null;
  const nextVersion = (latest?.version ?? 0) + 1;

  if (asked !== undefined) {
    const v = versions.find((x) => String(x.version) === asked);
    if (!v) notFound();
    const candidate = one(sp.view) === "candidate";
    const href = (view: "full" | "candidate") => `/admin/catalog/assessments/${slug}?v=${v.version}${view === "candidate" ? "&view=candidate" : ""}`;
    return (
      <>
        <Link href={`/admin/catalog/assessments/${slug}`} className="mb-4 inline-block text-sm font-bold underline underline-offset-4">← Draft and versions</Link>
        <PageTitle eyebrow={`Version ${v.version} · read-only`} title={v.title} intro={`Published ${day(v.publishedAt)} by ${v.publishedBy}. A published version never changes.`} />
        <nav aria-label="View" className="mb-6 flex flex-wrap gap-1">
          <Link href={href("full")} aria-current={!candidate ? "page" : undefined} className={tab(!candidate)}>Full test</Link>
          <Link href={href("candidate")} aria-current={candidate ? "page" : undefined} className={tab(candidate)}>What candidates see</Link>
        </nav>
        {candidate ? <div className="card max-w-3xl p-5 sm:p-8"><CandidatePreview t={candidateTask(v)} /></div> : <div className="max-w-3xl"><VersionDetails v={v} /></div>}
      </>
    );
  }

  const start = draft ?? startingDraft(code);
  return (
    <>
      {back}
      <PageTitle
        eyebrow="Assessment"
        title={code.title}
        intro={latest ? `Version ${latest.version} is the newest. Editing here changes only the draft; publishing makes version ${nextVersion}.` : "Nothing published yet. Write the draft, then publish it as version 1."}
      />

      <div className="grid gap-x-10 gap-y-10 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="min-w-0">
          {draft && <p className="mb-6 text-xs text-muted">Draft saved {day(draft.updatedAt!)} by {draft.updatedBy}.</p>}
          <AssessmentEditor
            slug={slug}
            library={klymbQs ? { klymb: klymbQs, mine: null } : undefined}
            initial={contentOf(start)}
            revision={start.revision}
            skills={catalog.get(slug)?.skills ?? [...code.suggestedSkills]}
            latest={latest ? { version: latest.version, content: contentOf(latest) } : null}
            nextVersion={nextVersion}
          />
        </div>

        <aside aria-labelledby="versions" className="flex flex-col gap-4">
          <h2 id="versions" className="display text-lg">Versions</h2>
          {versions.length ? (
            <ol className="flex flex-col gap-4">
              {versions.map((v) => {
                const decided = reviews.filter((r) => r.versionId === v.id);
                return (
                  <li key={v.id} className="card flex flex-col gap-2 p-4 text-sm">
                    <Link href={`/admin/catalog/assessments/${slug}?v=${v.version}`} className="font-bold underline underline-offset-4">Version {v.version}</Link>
                    <span className="text-xs text-muted">{day(v.publishedAt)} · {v.publishedBy}</span>
                    {decided.length ? (
                      <ul className="flex flex-col gap-1.5 text-xs">
                        {decided.map((r) => (
                          <li key={r.company}>
                            <strong>{r.company}</strong>: {r.decision === "approved" ? "approved" : "declined"} by {r.decidedBy}
                            {r.note && <span className="mt-0.5 block text-muted">“{r.note}”</span>}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <span className="text-xs text-muted">No company has decided yet.</span>
                    )}
                  </li>
                );
              })}
            </ol>
          ) : (
            <p className="text-sm text-muted">None yet.</p>
          )}
          <p className="text-xs text-muted">Each company that has this test approves every new version before their recruiters can pick it.</p>
        </aside>
      </div>
    </>
  );
}
