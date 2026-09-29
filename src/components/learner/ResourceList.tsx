import Image from "next/image";
import { ExternalLink } from "lucide-react";
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
    <ul className="grid grid-cols-[repeat(auto-fill,minmax(11rem,1fr))] gap-5">
      {resources.map((r) => {
        const id = youTubeId(r.url);
        return (
          <li key={r.url + r.label}>
            <a
              href={r.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex h-full min-h-37 flex-col gap-1.5 rounded-lg border border-line/30 bg-card p-5 transition-[border-color,box-shadow,transform] duration-300 hover:-translate-y-0.5 hover:border-red-strong/60 hover:shadow-card"
            >
              <span className="block text-[11px] font-bold uppercase tracking-[0.04em] text-red-deep">{KIND_LABEL[r.kind]}</span>
              <span className="block font-heading text-[15px] leading-tight font-bold group-hover:underline">{r.label}</span>
              {id && (
                <Image
                  src={`https://i.ytimg.com/vi/${id}/mqdefault.jpg`}
                  alt=""
                  width={320}
                  height={180}
                  className="h-auto w-full rounded-lg border border-line/30 object-cover"
                />
              )}
              <span className="mt-auto flex items-center justify-between gap-2 pt-4 text-xs text-muted">
                <span className="truncate">{new URL(r.url).hostname.replace("www.", "")}</span>
                <ExternalLink aria-hidden="true" className="size-4 shrink-0 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </span>
            </a>
          </li>
        );
      })}
    </ul>
  );
}
