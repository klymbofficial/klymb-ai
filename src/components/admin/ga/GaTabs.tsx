"use client";

import clsx from "clsx";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useId, useState } from "react";

/**
 * Segmented tabs over panels the server already rendered. The active tab is
 * mirrored into the URL so a refresh or a shared link lands on the same view.
 */
export function GaTabs({ tabs, initial }: { tabs: { key: string; label: string; content: React.ReactNode }[]; initial?: string }) {
  const [active, setActive] = useState(tabs.some((t) => t.key === initial) ? initial! : tabs[0].key);
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const base = useId();

  function choose(key: string) {
    setActive(key);
    const sp = new URLSearchParams(params.toString());
    sp.set("tab", key);
    router.replace(`${pathname}?${sp}`, { scroll: false });
  }

  return (
    <div>
      <div role="tablist" aria-label="Analytics sections" className="flex overflow-x-auto rounded-xl bg-surface p-1">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            id={`${base}-${t.key}`}
            aria-selected={active === t.key}
            aria-controls={`${base}-${t.key}-panel`}
            onClick={() => choose(t.key)}
            className={clsx(
              "flex-1 rounded-lg px-4 py-2.5 text-sm font-bold whitespace-nowrap transition-colors",
              active === t.key ? "bg-card text-ink shadow-card" : "text-muted hover:text-ink",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tabs.map((t) => (
        <div key={t.key} role="tabpanel" id={`${base}-${t.key}-panel`} aria-labelledby={`${base}-${t.key}`} hidden={active !== t.key} className="mt-6">
          {t.content}
        </div>
      ))}
    </div>
  );
}
