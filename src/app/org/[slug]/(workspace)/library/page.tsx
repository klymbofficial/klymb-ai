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
        one(sp.q) ? libraryQuestion(sql, member.companyId, one(sp.q)!) : Promise.resolve(undefined),
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
                  <QuestionCard key={q.id} q={q} open={openQ?.id === q.id} href={libraryHref(base, { ...f, page: page.page }, { q: q.id })} />
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
        <div className="fixed inset-0 z-40 flex justify-end">
          <Link href={here} scroll={false} aria-label="Close the question" className="absolute inset-0 bg-ink/40" />
          <aside role="dialog" aria-modal="true" aria-labelledby="question-title" className="relative z-10 flex h-full w-full max-w-4xl flex-col overflow-y-auto bg-paper shadow-xl">
            <div className="flex items-start justify-between gap-4 border-b border-line/30 p-5">
              <div className="min-w-0">
                <p className="text-xs font-bold text-muted">{TYPE_LABEL[openQ.type]} question{openQ.own ? " · Your company" : " · Klymb Library"}</p>
                <h2 id="question-title" className="display mt-1 break-words text-2xl">{openQ.title}</h2>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {openQ.own && writer && (
                  <>
                    <Link href={`${base}/${openQ.id}/edit`} className={BTN_SECONDARY}>Edit</Link>
                    <RemoveQuestionButton remove={removeQuestion.bind(null, member.companySlug, openQ.id)} />
                  </>
                )}
                <Link href={here} scroll={false} aria-label="Close" className="grid size-10 place-items-center rounded-md border-2 border-line/50 hover:border-ink"><OrgIcon name="close" size={18} /></Link>
              </div>
            </div>
            <nav aria-label="Question" className="flex gap-6 border-b border-line/30 px-5">
              {(["description", "answer"] as const).map((v) => (
                <Link
                  key={v}
                  href={libraryHref(base, f, v === "answer" ? { q: openQ.id, view: "answer" } : { q: openQ.id })}
                  scroll={false}
                  aria-current={view === v ? "page" : undefined}
                  className={clsx("-mb-px border-b-2 py-3 text-sm font-bold", view === v ? "border-red-strong text-ink" : "border-transparent text-muted hover:text-ink")}
                >
                  {v === "description" ? "Description" : openQ.type === "mcq" ? "Answer" : "Scoring"}
                </Link>
              ))}
            </nav>
            <div className="grid gap-8 p-5 md:grid-cols-[minmax(0,1fr)_12rem]">
              <div className="min-w-0">{view === "answer" ? <QuestionAnswer q={openQ} /> : <QuestionStatement q={openQ} />}</div>
              <QuestionFacts q={openQ} />
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
