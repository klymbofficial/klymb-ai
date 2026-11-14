"use client";

import clsx from "clsx";
import { useEffect, useId, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { syncBox } from "./CourseFilter";

const Glass = ({ className }: { className?: string }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true" className={clsx("shrink-0", className)}>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </svg>
);

/**
 * Search on phones, where the page drops its big search box. A round icon in
 * the course bar stretches across the bar into a field, with the live count
 * beside what you type; folded, the icon keeps showing the query, so a search
 * is never hidden. It sits inside the bar (the positioned parent it spans).
 */
export function CompactSearch({ q, setQ, count }: { q: string; setQ: (v: string) => void; count: number }) {
  const [open, setOpen] = useState(false);
  const btn = useRef<HTMLButtonElement>(null);
  const field = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const id = useId();
  const query = q.trim();

  // Committed before focusing, in the same tap, so phones raise the keyboard.
  const expand = () => {
    syncBox(btn.current, field.current);
    flushSync(() => setOpen(true));
    input.current?.focus();
  };

  const fold = (refocus = false) => {
    syncBox(btn.current, field.current);
    setOpen(false);
    if (refocus) btn.current?.focus();
  };

  // "/" opens it when this is the search on screen (a phone with a keyboard attached).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "/" || !btn.current?.offsetParent || /input|textarea|select/i.test(document.activeElement?.tagName ?? "")) return;
      e.preventDefault();
      syncBox(btn.current, field.current);
      flushSync(() => setOpen(true));
      input.current?.focus();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // While open, a press anywhere else folds it, keeping what was typed.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (field.current?.contains(t) || btn.current?.contains(t)) return;
      syncBox(btn.current, field.current);
      setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open]);

  return (
    <>
      <button
        ref={btn}
        type="button"
        onClick={expand}
        aria-expanded={open}
        aria-controls={id}
        aria-label={query ? `Search courses: ${query}` : "Search courses"}
        className={clsx(
          // It may shrink (the query truncates) so the bar never pushes past a narrow screen.
          "inline-flex h-9 max-w-[9.5rem] min-w-9 items-center justify-center gap-1.5 rounded-lg border px-2.5 text-[13px] font-semibold transition-[background-color,border-color,transform] duration-200 active:scale-[0.97] motion-reduce:transition-none sm:hidden",
          query ? "border-red-deep/30 bg-red-tint text-red-deep" : "border-[#d6d4d3] bg-card text-ink shadow-[0_1px_2px_rgba(32,30,29,0.04)]",
        )}
      >
        <Glass className={query ? "" : "text-muted"} />
        {query && <span className="min-w-0 truncate">{query}</span>}
      </button>

      <div
        ref={field}
        id={id}
        data-open={open ? "" : undefined}
        onBlur={(e) => {
          const next = e.relatedTarget as Node | null;
          if (next && !field.current?.contains(next)) fold();
        }}
        className="morph absolute inset-x-4 top-2 z-[35] flex h-9 items-center gap-2 rounded-[10px] border border-red-deep/45 bg-card pr-1 pl-3 shadow-float sm:hidden"
      >
        <Glass className="text-red-deep" />
        <input
          ref={input}
          type="search"
          enterKeyHint="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === "Escape") {
              e.preventDefault();
              fold(true);
            }
          }}
          aria-label="Search courses"
          placeholder="Title, role or industry"
          className="morph-in h-full min-w-0 flex-1 border-0 bg-transparent text-base outline-none placeholder:text-line focus-visible:outline-none [&::-webkit-search-cancel-button]:hidden"
          style={{ "--i": 0 } as React.CSSProperties}
        />
        {query && (
          <>
            <span key={count} aria-hidden="true" className="count-tick nums shrink-0 rounded-full bg-red-tint px-2 py-0.5 text-xs font-bold text-red-deep">
              {count} found
            </span>
            <button
              type="button"
              onClick={() => { setQ(""); input.current?.focus(); }}
              aria-label="Clear search"
              className="grid size-7 shrink-0 place-items-center rounded-md bg-[#eeeded] text-xs text-muted"
            >
              ✕
            </button>
          </>
        )}
        <button type="button" onClick={() => fold(true)} className="morph-in h-7 shrink-0 rounded-md px-2.5 text-[13px] font-semibold text-red-deep" style={{ "--i": 1 } as React.CSSProperties}>
          Done
        </button>
      </div>
    </>
  );
}
