import clsx from "clsx";
import { Eyebrow } from "./Eyebrow";

export function SectionHeader({
  eyebrow, title, intro, id, className, aside,
}: { eyebrow: string; title: React.ReactNode; intro?: string; id?: string; className?: string; aside?: React.ReactNode }) {
  return (
    <div className={clsx("flex flex-wrap items-end justify-between gap-6", className)}>
      <div className="max-w-3xl">
        <Eyebrow>{eyebrow}</Eyebrow>
        <h2 id={id} className="display mt-3 text-4xl text-balance sm:text-5xl">{title}</h2>
        {intro && <p className="mt-4 max-w-2xl text-lg text-muted text-pretty">{intro}</p>}
      </div>
      {aside}
    </div>
  );
}
