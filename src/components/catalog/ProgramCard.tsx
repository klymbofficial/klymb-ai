import clsx from "clsx";
import Link from "next/link";
import { getIndustry, getRole, type Program } from "@/data/catalog";
import { StatusBadge } from "./StatusBadge";

/** One program in a list. An unavailable one looks quieter and leads to the page that says how to ask about it. */
export function ProgramCard({ program }: { program: Program }) {
  const open = program.status === "available";
  const tags = [...program.roles.map((r) => getRole(r)?.name), ...program.industries.map((i) => getIndustry(i)?.name)].filter(Boolean);

  return (
    <article
      className={clsx(
        "group relative flex h-full flex-col gap-4 rounded-card p-6 transition-[transform,box-shadow] duration-200",
        open ? "card hover:-translate-y-1 hover:shadow-float" : "border-2 border-dashed border-line/50 bg-transparent",
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-muted">{program.kind}</p>
        <StatusBadge status={program.status} />
      </div>
      <div>
        <h3 className={clsx("display text-2xl", !open && "text-ink/80")}>
          <Link
            href={`/courses/${program.slug}`}
            className="after:absolute after:inset-0 after:rounded-card focus-visible:after:outline-3 focus-visible:after:outline-red"
          >
            {program.name}
          </Link>
        </h3>
        <p className="mt-2 text-[15px] leading-relaxed text-muted">{program.summary}</p>
      </div>
      <ul className="mt-auto flex flex-wrap gap-1.5" aria-label="Roles and industries">
        {tags.map((t) => (
          <li key={t} className="rounded-md border border-line/40 px-2.5 py-1 text-xs font-semibold">{t}</li>
        ))}
      </ul>
      <p className={clsx("inline-flex items-center gap-2 border-t pt-4 text-sm font-bold", open ? "border-line/25 text-red-deep" : "border-line/30 text-ink")}>
        {open ? "See the course" : "How to ask about this"}
        <span aria-hidden="true" className="transition-transform group-hover:translate-x-0.5">→</span>
      </p>
    </article>
  );
}
