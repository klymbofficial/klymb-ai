import clsx from "clsx";
import Link from "next/link";
import { Badge, type Tone } from "@/components/company/HiringParts";
import { OrgIcon } from "@/components/company/OrgIcons";
import { DIFFICULTY_LABEL, TYPE_LABEL, isMulti, type Difficulty, type LibraryQuestion } from "@/lib/company/library-rules";

const DIFF_TONE: Record<Difficulty, Tone> = { easy: "green", medium: "amber", hard: "red" };

/** The question's first line, for a card. */
export const summaryOf = (statement: string) => {
  const first = statement.split("\n").find((l) => l.trim()) ?? "";
  return first.length > 180 ? `${first.slice(0, 177)}…` : first;
};

/** A filter that switches on or off by following its link. */
export function FilterCheck({ href, on, children }: { href: string; on: boolean; children: React.ReactNode }) {
  return (
    <Link href={href} role="checkbox" aria-checked={on} scroll={false} className="flex items-start gap-2 py-1 text-sm hover:text-red-deep">
      <span aria-hidden="true" className={clsx("mt-0.5 grid size-4 shrink-0 place-items-center rounded-sm border-2", on ? "border-ink bg-ink text-paper" : "border-line/60 bg-white")}>
        {on && <svg viewBox="0 0 12 12" className="size-3" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2.5 6.5l2.5 2.5 4.5-5" /></svg>}
      </span>
      <span>{children}</span>
    </Link>
  );
}

/** One question in the list: title, first line, then difficulty, points, time, tags and type. */
export function QuestionCard({ q, href, open }: { q: LibraryQuestion; href: string; open: boolean }) {
  const more = q.tags.length - 2;
  return (
    <li>
      <Link
        href={href}
        scroll={false}
        aria-current={open ? "true" : undefined}
        className={clsx("block rounded-lg border bg-white p-4 hover:border-ink", open ? "border-ink" : "border-line/30")}
      >
        <p className="font-bold">{q.title}</p>
        <p className="mt-1 text-sm text-muted">{summaryOf(q.statement)}</p>
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-line/20 pt-3 text-xs">
          <Badge tone={DIFF_TONE[q.difficulty]}>{DIFFICULTY_LABEL[q.difficulty]}</Badge>
          <span>Score {q.points}</span>
          <span className="inline-flex items-center gap-1"><OrgIcon name="clock" size={14} />Recommended time {q.minutes} min</span>
          {q.tags.length > 0 && <span className="text-muted">{q.tags.slice(0, 2).join(", ")}{more > 0 && ` +${more} more`}</span>}
        </div>
        <p className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted">
          {TYPE_LABEL[q.type]}
          {q.type === "mcq" && isMulti(q) && " · several correct"}
          {q.own && <Badge tone="blue">Your company</Badge>}
        </p>
      </Link>
    </li>
  );
}

/** The question as a candidate will read it: the statement and, for multiple choice, the options (never which are right). */
export function QuestionStatement({ q }: { q: LibraryQuestion }) {
  return (
    <div className="flex flex-col gap-4">
      <p className="whitespace-pre-wrap text-sm leading-relaxed">{q.statement}</p>
      {q.type === "mcq" && q.options && (
        <div>
          <p className="mb-2 text-xs font-bold text-muted">{isMulti(q) ? "Candidates pick all that apply" : "Candidates pick one"}</p>
          <ol className="flex flex-col gap-2">
            {q.options.map((o, i) => (
              <li key={i} className="flex items-start gap-3 rounded-md border border-line/30 px-3 py-2 text-sm">
                <span aria-hidden="true" className={clsx("mt-0.5 size-4 shrink-0 border-2 border-line/60", isMulti(q) ? "rounded-sm" : "rounded-full")} />
                <span className="whitespace-pre-wrap">{o.text}</span>
              </li>
            ))}
          </ol>
        </div>
      )}
      {q.type !== "mcq" && <p className="text-xs text-muted">{q.type === "written_file" ? "Candidates write an answer and may attach up to 3 files." : "Candidates write an answer."}</p>}
    </div>
  );
}

/** The answer side, for the people who set tests: the right options and how marks work, or the scoring areas and guides. */
export function QuestionAnswer({ q }: { q: LibraryQuestion }) {
  if (q.type === "mcq" && q.options) {
    const multi = isMulti(q);
    return (
      <div className="flex flex-col gap-4">
        <ol className="flex flex-col gap-2">
          {q.options.map((o, i) => (
            <li key={i} className={clsx("flex items-start justify-between gap-3 rounded-md border px-3 py-2 text-sm", o.correct ? "border-[#14532d] bg-[#e4f2ec]" : "border-line/30")}>
              <span className="whitespace-pre-wrap">{o.text}</span>
              {o.correct && <span className="shrink-0 text-xs font-bold text-[#14532d]">Correct</span>}
            </li>
          ))}
        </ol>
        <p className="text-sm text-muted">
          {multi
            ? q.partial
              ? `Partial marks: ${q.points} points × (right picks − wrong picks) ÷ ${q.options.filter((o) => o.correct).length}, never below zero.`
              : `All or nothing: ${q.points} points only for exactly the right options.`
            : `${q.points} points for the right option.`}{" "}
          In a test it is marked automatically when the candidate submits, and a reviewer confirms or changes the mark.
        </p>
      </div>
    );
  }
  return (
    <ol className="flex flex-col gap-3">
      {(q.rubric ?? []).map((c, i) => (
        <li key={i} className="rounded-md border border-line/30 p-3 text-sm">
          <p className="flex justify-between gap-3 font-bold"><span>{c.title}</span><span className="shrink-0">{c.points} pts</span></p>
          {c.skill && <p className="text-xs text-muted">{c.skill}</p>}
          {c.guide && <p className="mt-2 whitespace-pre-wrap">{c.guide}</p>}
        </li>
      ))}
    </ol>
  );
}

/** The right column of the panel: difficulty, maximum score, time and tags. */
export function QuestionFacts({ q }: { q: LibraryQuestion }) {
  return (
    <dl className="flex flex-col gap-4 text-sm">
      <div><dt className="text-xs font-bold text-muted">Difficulty level</dt><dd className="mt-1"><Badge tone={DIFF_TONE[q.difficulty]}>{DIFFICULTY_LABEL[q.difficulty]}</Badge></dd></div>
      <div><dt className="text-xs font-bold text-muted">Maximum score</dt><dd className="display mt-1 text-3xl">{q.points}</dd></div>
      <div><dt className="text-xs font-bold text-muted">Recommended time</dt><dd className="mt-1">{q.minutes} min</dd></div>
      {q.tags.length > 0 && (
        <div>
          <dt className="text-xs font-bold text-muted">Tags</dt>
          <dd className="mt-1 flex flex-wrap gap-1.5">{q.tags.map((t) => <span key={t} className="rounded border border-line/40 px-2 py-0.5 text-xs">{t}</span>)}</dd>
        </div>
      )}
    </dl>
  );
}
