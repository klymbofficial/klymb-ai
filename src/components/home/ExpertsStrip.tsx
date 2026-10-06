import clsx from "clsx";

/**
 * Where the course contributors work or have worked. Contributors asked not to
 * be named, so only employers appear: as plain text, never official logos,
 * which would read as the companies endorsing Klymb.
 */
const COMPANIES = ["Amazon", "NatWest", "Microsoft", "Apple", "Google"];

export function ExpertsStrip({ tone = "light", className }: { tone?: "light" | "dark"; className?: string }) {
  const dark = tone === "dark";
  // Repeated so one copy is always wider than the strip, then doubled for the seamless loop.
  const row = [...COMPANIES, ...COMPANIES];

  return (
    <div className={className}>
      <p className={clsx("text-center text-xs font-extrabold uppercase tracking-[0.16em]", dark ? "text-white/60" : "text-muted")}>
        Courses built by professionals from
      </p>
      <div
        className="marquee relative mt-4 overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_12%,black_88%,transparent)]"
        aria-label={`Contributors from ${COMPANIES.join(", ")}`}
        role="img"
      >
        <div className="marquee-track flex w-max">
          {[0, 1].map((copy) => (
            <ul key={copy} aria-hidden="true" className="flex shrink-0 items-center">
              {row.map((name, i) => (
                <li
                  key={`${name}-${i}`}
                  className={clsx("px-7 text-2xl font-bold tracking-tight whitespace-nowrap sm:px-10 sm:text-3xl", dark ? "text-white/80" : "text-ink/55")}
                >
                  {name}
                </li>
              ))}
            </ul>
          ))}
        </div>
      </div>
      <p className={clsx("mx-auto mt-4 max-w-xl text-center text-[11px] leading-relaxed", dark ? "text-white/40" : "text-muted/80")}>
        Company names identify where our contributors work or have worked. Klymb.ai is not affiliated with or endorsed by these companies.
      </p>
    </div>
  );
}
