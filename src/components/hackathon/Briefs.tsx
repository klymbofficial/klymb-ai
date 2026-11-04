import { Markdown } from "@/components/ui/Markdown";
import type { HackathonBrief } from "@/data/hackathon";

/** The problem statements, each closed to its one-line tagline until opened. */
export function Briefs({ briefs }: { briefs: HackathonBrief[] }) {
  return (
    <div className="flex flex-col gap-3">
      {briefs.map((b, i) => {
        const [tagline, ...rest] = b.statement.split("\n");
        return (
          <details key={b.id} className="card group px-6 py-4 open:pb-6">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-1">
              <span>
                <span className="block text-xs font-extrabold uppercase tracking-[0.14em] text-muted">Problem {i + 1}</span>
                <span className="mt-1 block text-lg font-extrabold">{b.title}</span>
                <span className="mt-0.5 block text-sm text-muted">{tagline}</span>
              </span>
              <span aria-hidden="true" className="text-xl text-muted transition-transform group-open:rotate-45">+</span>
            </summary>
            <Markdown text={rest.join("\n")} className="mt-4 border-t border-line/20 pt-4 text-[15px] leading-relaxed text-ink/85" />
          </details>
        );
      })}
    </div>
  );
}
