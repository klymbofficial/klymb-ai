import clsx from "clsx";
import Link from "next/link";
import { tracks } from "@/data/tracks";

export function TrackSwitcher({ basePath, current, extra = "" }: { basePath: string; current: string; extra?: string }) {
  return (
    <nav aria-label="Preview another track" className="flex flex-wrap gap-2">
      {tracks.map((t) => (
        <Link
          key={t.slug}
          href={`${basePath}?track=${t.slug}${extra}`}
          aria-current={t.slug === current ? "page" : undefined}
          className={clsx("border-2 px-3 py-1.5 text-sm font-bold", t.slug === current ? "border-ink bg-ink text-paper" : "border-line hover:border-ink")}
        >
          {t.name}
        </Link>
      ))}
    </nav>
  );
}
