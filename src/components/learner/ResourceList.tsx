import Image from "next/image";
import type { DayResource } from "@/types/curriculum";

const KIND_LABEL: Record<DayResource["kind"], string> = {
  watch: "Watch",
  read: "Read",
  use: "Use",
  prep: "Prep",
};

/** YouTube links get their real thumbnail; everything else gets a typographic card. */
function youTubeId(url: string) {
  return url.match(/[?&]v=([\w-]{6,})/)?.[1] ?? null;
}

export function ResourceList({ resources }: { resources: DayResource[] }) {
  if (!resources.length) return null;

  return (
    <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {resources.map((r) => {
        const id = youTubeId(r.url);
        return (
          <li key={r.url + r.label}>
            <a
              href={r.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex h-full flex-col gap-2 rounded-xl border border-line/35 bg-card p-4 transition-colors hover:border-red-strong"
            >
              <span className="block text-[10px] font-extrabold uppercase tracking-[0.14em] text-red-deep">{KIND_LABEL[r.kind]}</span>
              <span className="block text-sm font-bold group-hover:underline">{r.label}</span>
              {id && (
                <Image
                  src={`https://i.ytimg.com/vi/${id}/mqdefault.jpg`}
                  alt=""
                  width={320}
                  height={180}
                  className="h-auto w-full rounded-lg border border-line/30 object-cover"
                />
              )}
              <span className="mt-auto flex items-center justify-between gap-2 pt-2 text-xs text-muted">
                <span className="truncate">{new URL(r.url).hostname.replace("www.", "")}</span>
                <span aria-hidden="true" className="shrink-0">↗</span>
              </span>
            </a>
          </li>
        );
      })}
    </ul>
  );
}
