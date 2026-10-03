"use client";

import clsx from "clsx";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

/** Filters live in the URL, so a view can be bookmarked or shared. */
export function RangeTabs({
  param, options, current,
}: {
  param: string;
  options: { key: string; label: string }[];
  current: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  return (
    <div role="group" aria-label={param} className="inline-flex overflow-hidden rounded-lg border border-line/40 bg-card">
      {options.map((o) => (
        <button
          key={o.key}
          type="button"
          aria-pressed={o.key === current}
          onClick={() => {
            const sp = new URLSearchParams(params.toString());
            sp.set(param, o.key);
            router.replace(`${pathname}?${sp}`, { scroll: false });
          }}
          className={clsx(
            "px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition-colors",
            o.key === current ? "bg-ink text-paper" : "hover:bg-surface",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
