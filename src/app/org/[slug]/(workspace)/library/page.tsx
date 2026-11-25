import type { Metadata } from "next";
import Link from "next/link";
import clsx from "clsx";
import { BTN_PRIMARY, BTN_SECONDARY, OrgPageHead } from "@/components/company/HiringParts";
import { OrgIcon } from "@/components/company/OrgIcons";
import { EmptyPanel, LoadError, RoleOnly } from "@/components/company/OrgPanels";
import { FilterCheck, QuestionAnswer, QuestionCard, QuestionFacts, QuestionStatement } from "@/components/library/LibraryParts";
import { RemoveQuestionButton } from "@/components/library/QuestionForm";
import { requireCompany } from "@/lib/company/auth";
import { klymbLibrary, libraryQuestion, ownLibrary } from "@/lib/company/library-data";
import {
  DIFFICULTIES,
  DIFFICULTY_LABEL,
  QUESTION_TYPES,
  TYPE_LABEL,
  canWriteQuestions,
  filterQuestions,
  libraryHref,
  pageOf,
  readLibraryFilters,
  seesLibrary,
  tagOptions,
  typeCounts,
  type LibraryFilters,
} from "@/lib/company/library-rules";
import { db } from "@/lib/db/client";
import { QuestionDrawer, TryQuestion } from "@/components/library/QuestionDrawer";
import { STATS_MIN, questionStats, type QuestionStats } from "@/lib/company/question-stats";
import { questionStatsRows } from "@/lib/company/question-stats-data";
import { removeQuestion } from "./actions";

export const metadata: Metadata = { title: "Library", robots: { index: false, follow: false } };

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
const field = "w-full rounded-md border-2 border-line/50 bg-white px-3 py-2 text-sm focus:border-ink";
const heading = "mb-2 text-xs font-extrabold uppercase tracking-[0.14em] text-muted";

const toggle = <T,>(list: readonly T[], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

/**
 * The question library, as on HackerEarth: Klymb Library (questions Klymb
 * publishes for every company) and My Library (this company's own). Filters
 * by type, difficulty and tag, a search, and a card per question; opening a
 * card shows the question in a panel, with its answer for the people who set
 * tests. Only types a candidate can answer here are offered.
 */
export default async function LibraryPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { slug } = await params;
  const member = await requireCompany(slug);
  const base = `/org/${member.companySlug}/library`;
  if (!seesLibrary(member)) return <RoleOnly role="recruiters, reviewers and admins" home={`/org/${member.companySlug}`} />;

  const sp = await searchParams;
  const f = readLibraryFilters(sp);
  const writer = canWriteQuestions(member);
  const head = (
    <OrgPageHead
      title="Library"
      actions={writer ? <Link href={`${base}/new`} className={BTN_PRIMARY}><OrgIcon name="plus" size={16} />Create a question</Link> : undefined}
    />
  );

  const sql = db();
  const [list, openQ] = sql
    ? await Promise.all([
        f.tab === "mine" ? ownLibrary(sql, member.companyId) : klymbLibrary(sql),
        // The open question has its own parameter; `q` is the search text.
        one(sp.open) ? libraryQuestion(sql, member.companyId, one(sp.open)!) : Promise.resolve(undefined),
      ])
    : [null, undefined];
  if (!list || openQ === null) return <>{head}<LoadError what="The library" /></>;

  const shown = filterQuestions(list, f);
  const page = pageOf(shown, f.page);
  const counts = typeCounts(list);
  const tags = tagOptions(list);
  const at = (patch: Partial<LibraryFilters>, extra: Record<string, string> = {}) => libraryHref(base, { ...f, page: 1, ...patch }, extra);
  const here = libraryHref(base, f);
  const narrowed = f.types.length > 0 || f.difficulties.length > 0 || !!f.tag || !!f.q;
  const view = one(sp.view) === "answer" ? "answer" : "description";
  const statsRows = openQ && sql ? await questionStatsRows(sql, member.companyId, openQ.id) : [];
  const stats = statsRows ? questionStats(statsRows) : null;

  return (
    <>
      {head}
      <div className="grid gap-8 lg:grid-cols-[15rem_minmax(0,1fr)]">
        <aside aria-label="Filters" className="flex flex-col gap-6">
          <nav aria-label="Libraries">
            <p className={heading}>Libraries</p>
            {(["klymb", "mine"] as const).map((t) => (
              <Link
                key={t}
                href={libraryHref(base, { tab: t, types: [], difficulties: [], tag: null, q: null, page: 1 })}
                aria-current={f.tab === t ? "page" : undefined}
                className={clsx("flex items-center gap-2 py-1 text-sm", f.tab === t ? "font-bold text-ink" : "text-muted hover:text-ink")}
              >
                <span aria-hidden="true" className={clsx("size-3 rounded-full border-2", f.tab === t ? "border-ink bg-ink" : "border-line/60")} />
                {t === "klymb" ? "Klymb Library" : "My Library"}
              </Link>
            ))}
          </nav>
          <div>
            <p className={heading}>Question type</p>
            {QUESTION_TYPES.map((t) => (
              <FilterCheck key={t} href={at({ types: toggle(f.types, t) })} on={f.types.includes(t)}>{TYPE_LABEL[t]} ({counts[t]})</FilterCheck>
            ))}
          </div>
          <div>
            <p className={heading}>Difficulty</p>
            {DIFFICULTIES.map((d) => (
              <FilterCheck key={d} href={at({ difficulties: toggle(f.difficulties, d) })} on={f.difficulties.includes(d)}>{DIFFICULTY_LABEL[d]}</FilterCheck>
            ))}
          </div>
          {tags.length > 0 && (
            <div>
              <p className={heading}>Tags</p>
              <div className="flex flex-wrap gap-1.5">
                {tags.map((t) => {
                  const on = f.tag?.toLowerCase() === t.toLowerCase();
                  return (
                    <Link key={t} href={at({ tag: on ? null : t })} aria-pressed={on} scroll={false} className={clsx("rounded border px-2 py-0.5 text-xs", on ? "border-ink bg-ink text-paper" : "border-line/40 hover:border-ink")}>
                      {t}
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
        </aside>

        <section aria-label="Questions" className="min-w-0">
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <h2 className="display text-xl">Questions ({shown.length})</h2>
            <form method="get" action={base} role="search" className="flex min-w-0 grow basis-64 gap-2">
              {f.tab === "mine" && <input type="hidden" name="tab" value="mine" />}
              {f.types.map((t) => <input key={t} type="hidden" name="type" value={t} />)}
              {f.difficulties.map((d) => <input key={d} type="hidden" name="difficulty" value={d} />)}
              {f.tag && <input type="hidden" name="tag" value={f.tag} />}
              <label className="sr-only" htmlFor="library-search">Search questions</label>
              <input id="library-search" type="search" name="q" defaultValue={f.q ?? ""} placeholder="Search titles, questions and tags" className={field} />
              <button type="submit" className={BTN_SECONDARY} aria-label="Search"><OrgIcon name="search" size={16} /></button>
            </form>
          </div>
          {narrowed && (
            <p className="mb-4 text-sm">
              <Link href={libraryHref(base, { tab: f.tab, types: [], difficulties: [], tag: null, q: null, page: 1 })} className="font-bold underline underline-offset-2">Clear all filters</Link>
            </p>
          )}

          {list.length === 0 ? (
            f.tab === "mine" ? (
              <EmptyPanel title="No questions of your own yet" action={writer ? <Link href={`${base}/new`} className={BTN_PRIMARY}>Create a question</Link> : undefined}>
                {writer ? "Write multiple-choice or written questions your company can reuse in its tests." : "Your recruiters and admins can add your company's own questions here."}
              </EmptyPanel>
            ) : (
              <EmptyPanel title="Klymb's library is empty for now">Klymb adds questions here as they are written. To ask what&apos;s coming, write to team@klymb.ai.</EmptyPanel>
            )
          ) : shown.length === 0 ? (
            <EmptyPanel title="No questions match">Try fewer filters or other words.</EmptyPanel>
          ) : (
            <>
              <ul className="flex flex-col gap-3">
                {page.items.map((q) => (
                  <QuestionCard key={q.id} q={q} open={openQ?.id === q.id} href={libraryHref(base, { ...f, page: page.page }, { open: q.id })} />
                ))}
              </ul>
              {page.pages > 1 && (
                <nav aria-label="Pages" className="mt-6 flex items-center gap-4 text-sm">
                  {page.page > 1 && <Link href={libraryHref(base, { ...f, page: page.page - 1 })} className="font-bold underline underline-offset-2">Previous</Link>}
                  <span className="text-muted">Page {page.page} of {page.pages}</span>
                  {page.page < page.pages && <Link href={libraryHref(base, { ...f, page: page.page + 1 })} className="font-bold underline underline-offset-2">Next</Link>}
                </nav>
              )}
            </>
          )}
        </section>
      </div>

      {openQ && (
        <QuestionDrawer
          key={openQ.id}
          closeHref={here}
          title={openQ.title}
          kicker={`${TYPE_LABEL[openQ.type]} · ${openQ.own ? "Your company" : "Klymb Library"} · ${DIFFICULTY_LABEL[openQ.difficulty]} · ${openQ.points} points`}
          initial={view === "answer" ? "answer" : "description"}
          actions={openQ.own && writer ? (
            <>
              <Link href={`${base}/${openQ.id}/edit`} className={BTN_SECONDARY}>Edit</Link>
              <RemoveQuestionButton remove={removeQuestion.bind(null, member.companySlug, openQ.id)} />
            </>
          ) : undefined}
          tabs={[
            { key: "description", label: "Description", body: <div className="grid gap-8 md:grid-cols-[minmax(0,1fr)_12rem]"><div className="min-w-0"><QuestionStatement q={openQ} /></div><QuestionFacts q={openQ} /></div> },
            {
              key: "answer",
              label: openQ.type === "mcq" ? "Answer" : "Scoring",
              body: (
                <div className="flex flex-col gap-5">
                  <QuestionAnswer q={openQ} />
                  {openQ.explanation && (
                    <div className="rounded-md border-l-4 border-line/50 bg-white p-4 text-sm">
                      <p className="text-xs font-bold text-muted">Why</p>
                      <p className="mt-1 whitespace-pre-line">{openQ.explanation}</p>
                    </div>
                  )}
                </div>
              ),
            },
            { key: "analytics", label: "Analytics", body: <QuestionAnalytics stats={stats} /> },
            ...(openQ.type === "mcq" && openQ.options
              ? [{ key: "try" as const, label: "Try question", body: <TryQuestion statement={openQ.statement} options={openQ.options} partial={openQ.partial} points={openQ.points} /> }]
              : []),
          ]}
        />
      )}
    </>
  );
}

/** Attempts, success and use over time, from this company's own candidates. */
function QuestionAnalytics({ stats }: { stats: QuestionStats | null }) {
  if (!stats) return <p className="text-sm text-error">Analytics can&apos;t be loaded right now.</p>;
  const top = Math.max(1, ...stats.months.map((m) => m.count));
  return (
    <div className="flex flex-col gap-6">
      <dl className="grid grid-cols-3 gap-3">
        {[
          ["Attempted", String(stats.attempts)],
          ["Full marks", stats.fullRate === null ? "—" : `${stats.fullRate}%`],
          ["Average score", stats.averageRate === null ? "—" : `${stats.averageRate}%`],
        ].map(([k, v]) => (
          <div key={k} className="rounded-md border border-line/30 bg-white p-3">
            <dt className="text-xs font-bold text-muted">{k}</dt>
            <dd className="mt-1 text-xl font-black">{v}</dd>
          </div>
        ))}
      </dl>
      {stats.fullRate !== null && (
        <div>
          <p className="mb-1 text-xs font-bold text-muted">Success rate</p>
          <div className="h-3 overflow-hidden rounded-full bg-line/20"><div className="h-full bg-[#2f7d4f]" style={{ width: `${stats.fullRate}%` }} /></div>
        </div>
      )}
      <div>
        <p className="mb-2 text-xs font-bold text-muted">Attempts per month (last 12)</p>
        <div className="flex h-28 items-end gap-1" role="img" aria-label={stats.months.map((m) => `${m.month}: ${m.count}`).join(", ")}>
          {stats.months.map((m) => (
            <div key={m.month} className="flex flex-1 flex-col items-center gap-1">
              <div className="w-full rounded-t bg-ink/80" style={{ height: `${(100 * m.count) / top}%`, minHeight: m.count ? 2 : 0 }} />
              <span className="text-[0.6rem] text-muted">{m.month.slice(5)}</span>
            </div>
          ))}
        </div>
      </div>
      <p className="text-xs text-muted">
        From your company&apos;s candidates only, using the automatic marks given at submission.
        {stats.attempts < STATS_MIN ? ` Rates appear once ${STATS_MIN} people have answered it (${stats.attempts} so far).` : ""}
      </p>
    </div>
  );
}
