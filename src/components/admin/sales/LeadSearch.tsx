"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";

/**
 * The Leads search: filters as you type (name, number, email, college),
 * keeping the other filters. The query lives in the URL, so a search can be
 * shared or reloaded.
 */
export function LeadSearch() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [q, setQ] = useState(params.get("q") ?? "");
  const [pending, start] = useTransition();
  const first = useRef(true);

  useEffect(() => {
    if (first.current) { first.current = false; return; }
    const t = setTimeout(() => {
      const next = new URLSearchParams(params);
      if (q.trim()) next.set("q", q.trim()); else next.delete("q");
      start(() => router.replace(`${pathname}${next.size ? `?${next}` : ""}`, { scroll: false }));
    }, 300);
    return () => clearTimeout(t);
    // Only the typed text should trigger a search.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  return (
    <div role="search" className="relative mb-3">
      <svg aria-hidden="true" viewBox="0 0 20 20" className="pointer-events-none absolute left-3.5 top-1/2 size-5 -translate-y-1/2 text-muted">
        <path fill="currentColor" d="M8.5 3a5.5 5.5 0 0 1 4.38 8.83l3.9 3.9a.75.75 0 1 1-1.06 1.06l-3.9-3.9A5.5 5.5 0 1 1 8.5 3Zm0 1.5a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z" />
      </svg>
      <input
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search leads by name, phone, email or college"
        aria-label="Search leads"
        className="block w-full border border-line/60 bg-white py-3 pl-11 pr-24 text-base focus:border-ink focus:outline-none"
      />
      <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-muted" aria-live="polite">
        {pending ? "Searching…" : ""}
      </span>
    </div>
  );
}

/** A filter dropdown that applies as soon as it changes, no Filter button. */
export function AutoSelect(props: React.ComponentProps<"select">) {
  return <select {...props} onChange={(e) => e.currentTarget.form?.requestSubmit()} />;
}
