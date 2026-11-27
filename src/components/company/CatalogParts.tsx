import clsx from "clsx";
import Link from "next/link";
import { KIND_LABEL } from "@/data/business-catalog";
import type { CatalogEntry } from "@/lib/company/catalog";

/** Course, assessment or program; an assessment also says it can't be used yet, since that decides what you can do with it. */
export function KindLine({ entry }: { entry: CatalogEntry }) {
  const { item } = entry;
  return (
    <p className="flex flex-wrap items-center gap-2 text-[11px] font-extrabold uppercase tracking-[0.14em] text-muted">
      <span>{KIND_LABEL[item.kind]}</span>
      {item.kind === "assessment" && <span className="border border-ink/60 px-1.5 py-0.5 tracking-[0.08em] text-ink">Preview only</span>}
    </p>
  );
}

export function SkillChips({ skills, hrefFor, className }: { skills: string[]; hrefFor?: (skill: string) => string; className?: string }) {
  if (!skills.length) return null;
  return (
    <ul className={clsx("flex flex-wrap gap-1.5", className)} aria-label="Skills">
      {skills.map((s) => (
        <li key={s}>
          {hrefFor ? (
            <Link href={hrefFor(s)} className="inline-block border border-line/50 px-2 py-0.5 text-xs font-semibold hover:border-ink">{s}</Link>
          ) : (
            <span className="inline-block border border-line/50 px-2 py-0.5 text-xs font-semibold">{s}</span>
          )}
        </li>
      ))}
    </ul>
  );
}

/** Who takes it, level and length; a program's number of steps. */
export function MetaLine({ entry }: { entry: CatalogEntry }) {
  const { item } = entry;
  const parts =
    item.kind === "program"
      ? [`${item.steps.length} ${item.steps.length === 1 ? "step" : "steps"}`]
      : [item.audience, item.level, item.duration];
  return <p className="text-xs text-muted">{parts.join(" · ")}</p>;
}
