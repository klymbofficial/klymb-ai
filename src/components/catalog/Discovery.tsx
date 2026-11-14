import clsx from "clsx";
import Link from "next/link";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { availableIn, industries, programsForIndustry, programsForRole, roles } from "@/data/catalog";

type Active = { kind: "role" | "industry"; slug: string } | null;

function openLabel(n: number) {
  return n === 0 ? "None open yet" : `${n} open`;
}

function Chip({ href, name, open, current }: { href: string; name: string; open: number; current: boolean }) {
  return (
    <li>
      <Link
        href={href}
        aria-current={current ? "page" : undefined}
        className={clsx(
          "flex h-full flex-col gap-0.5 rounded-card border-2 px-4 py-3 transition-colors",
          current ? "border-ink bg-ink text-paper" : "border-line/35 bg-card hover:border-red-strong/60 hover:bg-red-tint/50",
        )}
      >
        <span className="text-[15px] font-extrabold leading-snug">{name}</span>
        <span className={clsx("text-xs font-semibold", current ? "text-paper/70" : open === 0 ? "text-muted" : "text-red-deep")}>{openLabel(open)}</span>
      </Link>
    </li>
  );
}

/** The two ways in: by the job you do, or by the industry you work in. `active` marks the page you are on. */
export function Discovery({ active = null }: { active?: Active }) {
  return (
    <div className="grid gap-10 lg:grid-cols-2 lg:gap-12">
      <nav aria-labelledby="by-role">
        <Eyebrow>By role</Eyebrow>
        <h2 id="by-role" className="display mt-2 text-xl">What job do you do, or want next?</h2>
        <ul className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          {roles.map((r) => (
            <Chip key={r.slug} href={`/courses/roles/${r.slug}`} name={r.name} open={availableIn(programsForRole(r.slug)).length} current={active?.kind === "role" && active.slug === r.slug} />
          ))}
        </ul>
      </nav>
      <nav aria-labelledby="by-industry">
        <Eyebrow>By industry</Eyebrow>
        <h2 id="by-industry" className="display mt-2 text-xl">Which industry is your team in?</h2>
        <ul className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          {industries.map((i) => (
            <Chip key={i.slug} href={`/courses/industries/${i.slug}`} name={i.name} open={availableIn(programsForIndustry(i.slug)).length} current={active?.kind === "industry" && active.slug === i.slug} />
          ))}
        </ul>
      </nav>
    </div>
  );
}
