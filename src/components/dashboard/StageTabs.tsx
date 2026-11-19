"use client";

import clsx from "clsx";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { useSky } from "./DaySky";

export type StageKey = "build" | "test";

export interface Stage {
  key: StageKey;
  /** The panel's id, also the hash that opens it: "build-skills", "test-skills". */
  anchor: string;
  number: string;
  first: string;
  accent: string;
  pct: number;
  meta: string;
}

const Ctx = createContext<{ stages: Stage[]; selected: StageKey; choose: (s: Stage) => void }>({ stages: [], selected: "build", choose: () => {} });

/**
 * Which stage is open, shared by the rail (on the sky) and the panels (below
 * it). A link to a stage's anchor (#test-skills) opens it.
 */
export function StageProvider({ stages, current, children }: { stages: Stage[]; current: StageKey; children: ReactNode }) {
  const [selected, setSelected] = useState<StageKey>(current);

  const openFromHash = useCallback(() => {
    const id = decodeURIComponent(window.location.hash.slice(1));
    const s = stages.find((x) => x.anchor === id);
    if (s) setSelected(s.key);
  }, [stages]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the hash is only readable after hydration
    openFromHash();
    window.addEventListener("hashchange", openFromHash);
    return () => window.removeEventListener("hashchange", openFromHash);
  }, [openFromHash]);

  const choose = useCallback((s: Stage) => {
    setSelected(s.key);
    window.history.replaceState(null, "", `#${s.anchor}`);
  }, []);

  return <Ctx.Provider value={{ stages, selected, choose }}>{children}</Ctx.Provider>;
}

/** Stacked layers for building, a target for testing: flat two-tone marks in the brand reds. */
function Mark({ stage }: { stage: StageKey }) {
  return stage === "build" ? (
    <svg viewBox="0 0 48 48" className="size-10" aria-hidden="true">
      <path d="M24 27 L44 35 L24 43 L4 35 Z" fill="#f3c4c0" />
      <path d="M24 17.5 L44 25.5 L24 33.5 L4 25.5 Z" fill="#df8a86" />
      <path d="M24 5 L44 13 L24 21 L4 13 Z" fill="#83050b" />
    </svg>
  ) : (
    <svg viewBox="0 0 48 48" className="size-10" aria-hidden="true">
      <g stroke="#83050b" strokeWidth="3" strokeLinecap="round"><path d="M24 2.5v7M24 38.5v7M2.5 24h7M38.5 24h7" /></g>
      <circle cx="24" cy="24" r="13.5" fill="#fff" stroke="#83050b" strokeWidth="3.5" />
      <circle cx="24" cy="24" r="8.5" fill="#df8a86" />
      <circle cx="24" cy="24" r="3.8" fill="#83050b" />
    </svg>
  );
}

/** The stages as tabs, on glass over the sky (lighter glass on a dark sky). Arrow keys move between them. */
export function StageRail() {
  const { stages, selected, choose } = useContext(Ctx);
  const { dark } = useSky();
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const onKey = (e: KeyboardEvent, i: number) => {
    const step = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0;
    if (!step) return;
    e.preventDefault();
    const next = (i + step + stages.length) % stages.length;
    choose(stages[next]);
    tabs.current[next]?.focus();
  };
  return (
    <div role="tablist" aria-label="Your stages" className={clsx("grid gap-2.5 rounded-[26px] border p-2.5 backdrop-blur-md sm:grid-cols-2 sm:gap-3", dark ? "border-white/15 bg-white/10" : "border-white/70 bg-white/45")}>
      {stages.map((s, i) => {
        const active = s.key === selected;
        return (
          <button
            key={s.key}
            ref={(el) => { tabs.current[i] = el; }}
            type="button"
            role="tab"
            id={`${s.anchor}-tab`}
            aria-selected={active}
            aria-controls={s.anchor}
            tabIndex={active ? 0 : -1}
            onClick={() => choose(s)}
            onKeyDown={(e) => onKey(e, i)}
            className={clsx(
              "flex min-h-20 items-center gap-3.5 rounded-2xl border px-3.5 py-3 text-left transition-[background-color,border-color,color] duration-200",
              active ? "border-white bg-white text-ink shadow-[0_14px_30px_-14px_rgba(32,30,29,0.35)]" : dark ? "border-white/15 bg-black/20 text-white hover:bg-black/30" : "border-white/60 bg-white/50 text-ink hover:bg-white/75",
            )}
          >
            <span aria-hidden="true" className={clsx("flex size-14 shrink-0 items-center justify-center rounded-2xl", active ? "bg-red-tint" : "bg-white")}><Mark stage={s.key} /></span>
            <span className="min-w-0 flex-1">
              <span className={clsx("block text-xs font-extrabold tracking-[0.14em]", active ? "text-red-deep" : dark ? "text-white/85" : "text-muted")}>{s.number}</span>
              <span className="display display-soft mt-0.5 block text-xl leading-tight">{s.first} <span className={active ? "text-red-deep" : undefined}>{s.accent}</span></span>
              <span className="mt-1.5 flex items-center gap-2 text-sm">
                <span className="font-bold nums">{s.pct}%</span>
                <span aria-hidden="true" className={clsx("h-1.5 w-14 shrink-0 overflow-hidden rounded-full", !active && dark ? "bg-white/25" : "bg-ink/10")}>
                  <span className="block h-full rounded-full bg-red" style={{ width: `${Math.max(4, s.pct)}%` }} />
                </span>
                <span className={clsx("truncate", active ? "text-muted" : dark ? "text-white/85" : "text-muted")}>{s.meta}</span>
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

/** How far through a stage, as a ring with the number inside. */
function Ring({ pct, active }: { pct: number; active: boolean }) {
  const r = 13;
  const c = 2 * Math.PI * r;
  return (
    <svg viewBox="0 0 32 32" className="size-9 shrink-0" aria-hidden="true">
      <circle cx="16" cy="16" r={r} fill="none" strokeWidth="3" className={active ? "stroke-white/25" : "stroke-ink/10"} />
      <circle cx="16" cy="16" r={r} fill="none" strokeWidth="3" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - Math.min(100, pct) / 100)} transform="rotate(-90 16 16)" className={active ? "stroke-white" : "stroke-red"} />
      <text x="16" y="16" dy="0.36em" textAnchor="middle" className="fill-current text-[9px] font-extrabold">{pct}</text>
    </svg>
  );
}

/**
 * Phones: the two stages as one slim switch, a ring for each, that rides at
 * the top of the screen as the page scrolls. Takes the place of the tall
 * tiles, so the next step is on the first screen.
 */
export function StageSwitch() {
  const { stages, selected, choose } = useContext(Ctx);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const onKey = (e: KeyboardEvent, i: number) => {
    const step = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0;
    if (!step) return;
    e.preventDefault();
    const next = (i + step + stages.length) % stages.length;
    choose(stages[next]);
    tabs.current[next]?.focus();
  };
  return (
    <div role="tablist" aria-label="Your stages" className="grid grid-cols-2 gap-1 rounded-2xl border border-ink/10 bg-card/95 p-1 shadow-[0_12px_30px_-14px_rgba(32,30,29,0.45)] backdrop-blur-md">
      {stages.map((s, i) => {
        const active = s.key === selected;
        return (
          <button
            key={s.key}
            ref={(el) => { tabs.current[i] = el; }}
            type="button"
            role="tab"
            id={`${s.anchor}-switch`}
            aria-selected={active}
            aria-controls={s.anchor}
            tabIndex={active ? 0 : -1}
            onClick={() => {
              choose(s);
              // Back to the top of the stage when switching from far down the page, once it is showing.
              requestAnimationFrame(() => {
                const panel = document.getElementById(s.anchor);
                if (panel && panel.getBoundingClientRect().top < 0) panel.scrollIntoView({ block: "start" });
              });
            }}
            onKeyDown={(e) => onKey(e, i)}
            className={clsx("flex min-h-12 items-center gap-2.5 rounded-xl px-2.5 py-1.5 text-left transition-colors", active ? "bg-red-deep text-white" : "text-ink hover:bg-surface")}
          >
            <Ring pct={s.pct} active={active} />
            <span className="min-w-0">
              <span className={clsx("block text-[10px] font-extrabold tracking-[0.14em]", active ? "text-white/80" : "text-muted")}>{s.number}</span>
              <span className="block truncate text-sm font-bold leading-tight">{s.first} {s.accent}<span className="sr-only">, {s.pct}%</span></span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

/** One stage's panel, shown while its tab is chosen. */
export function StagePanel({ stage, children }: { stage: StageKey; children: ReactNode }) {
  const { stages, selected } = useContext(Ctx);
  const s = stages.find((x) => x.key === stage)!;
  return (
    <div id={s.anchor} role="tabpanel" aria-labelledby={`${s.anchor}-tab`} hidden={stage !== selected} className="scroll-mt-24">
      {children}
    </div>
  );
}
