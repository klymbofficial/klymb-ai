import clsx from "clsx";

/**
 * Where the course contributors work or have worked. Contributors asked not to
 * be named, so only employers appear. Marks: Simple Icons (CC0) and Wikimedia
 * Commons; the trademarks belong to their owners, hence the note underneath.
 */
const COMPANIES = [
  { name: "Amazon", logo: "/logos/amazon.svg" },
  { name: "NatWest", logo: "/logos/natwest.svg" },
  { name: "Microsoft", logo: "/logos/microsoft.svg" },
  { name: "Apple", logo: "/logos/apple.svg" },
  { name: "Google", logo: "/logos/google.svg" },
];

export function ExpertsStrip({ tone = "light", className }: { tone?: "light" | "dark"; className?: string }) {
  const dark = tone === "dark";
  // Repeated so one copy is always wider than the strip, then doubled for the seamless loop.
  const row = [...COMPANIES, ...COMPANIES];

  return (
    <div className={className}>
      <p className={clsx("text-center text-[11px] font-extrabold uppercase tracking-[0.2em]", dark ? "text-white/55" : "text-muted")}>
        Courses built by professionals from
      </p>
      <div
        role="img"
        aria-label={`Contributors from ${COMPANIES.map((c) => c.name).join(", ")}`}
        className="marquee relative mt-5 overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_15%,black_85%,transparent)]"
      >
        <div className="marquee-track flex w-max">
          {[0, 1].map((copy) => (
            <ul key={copy} aria-hidden="true" className="flex shrink-0 items-center">
              {row.map(({ name, logo }, i) => (
                <li key={`${name}-${i}`} className="flex items-center gap-2.5 px-8 sm:px-11">
                  {/* eslint-disable-next-line @next/next/no-img-element -- tiny static SVGs, nothing to optimise */}
                  <img
                    src={logo} alt="" width={26} height={26} loading="lazy"
                    className={clsx("size-6 object-contain sm:size-[26px]", dark ? "brightness-0 invert opacity-85" : "grayscale opacity-70 contrast-125")}
                  />
                  <span className={clsx("text-lg font-semibold tracking-tight whitespace-nowrap sm:text-xl", dark ? "text-white/85" : "text-ink/70")}>
                    {name}
                  </span>
                </li>
              ))}
            </ul>
          ))}
        </div>
      </div>
      <p className={clsx("mx-auto mt-5 max-w-md px-4 text-center text-[10px] leading-relaxed", dark ? "text-white/35" : "text-muted/70")}>
        Logos identify where our contributors work or have worked. Klymb.ai is not affiliated with or endorsed by these companies.
      </p>
    </div>
  );
}
