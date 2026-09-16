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
    <ul className="grid gap-4 sm:grid-cols-2">
      {resources.map((r) => {
        const id = youTubeId(r.url);
        return (
          <li key={r.url + r.label}>
            <a
              href={r.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex h-full flex-col gap-2 border-2 border-line bg-paper p-4 transition-colors hover:border-ink"
            >
              <span className="flex items-baseline gap-2">
                <span className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-red-deep">{KIND_LABEL[r.kind]}</span>
                <span className="text-sm font-bold group-hover:underline">{r.label}</span>
              </span>
              {id && (
                <Image
                  src={`https://i.ytimg.com/vi/${id}/mqdefault.jpg`}
                  alt=""
                  width={320}
                  height={180}
                  className="h-auto w-full border border-line object-cover"
                />
              )}
              <span className="mt-auto truncate text-xs text-muted">{new URL(r.url).hostname.replace("www.", "")}</span>
            </a>
          </li>
        );
      })}
    </ul>
  );
}
