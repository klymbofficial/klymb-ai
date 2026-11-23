"use client";

import { ArrowRight } from "lucide-react";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { WEBINAR, googleCalendarLink, webinarCountdown, webinarDayWord, webinarFee, webinarOpen } from "@/lib/webinar";

interface Workshop {
  now: number;
  /** Whether sign-up is still open at `now`. */
  open: boolean;
  /** Set once this visitor has registered, so the bar at the bottom can switch to the calendar. */
  registered: boolean;
  setRegistered: (v: boolean) => void;
}

const Ctx = createContext<Workshop | null>(null);

/**
 * One clock for the whole page: the strip on top, the tickets and the bar at
 * the bottom all read the same second. `serverNow` is what the server saw, so
 * the first paint matches the HTML; it ticks from there.
 */
export function WorkshopProvider({ serverNow, children }: { serverNow: number; children: React.ReactNode }) {
  const [now, setNow] = useState(serverNow);
  const [registered, setRegistered] = useState(false);
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const value = useMemo(() => ({ now, open: webinarOpen(now), registered, setRegistered }), [now, registered]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useWorkshop() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useWorkshop needs <WorkshopProvider>");
  return v;
}

const pad = (n: number) => String(n).padStart(2, "0");

/** The four tiles: days, hours, minutes, seconds. */
export function useCountdownParts() {
  const { now } = useWorkshop();
  const c = webinarCountdown(now);
  return {
    phase: c.phase,
    parts: [
      { v: pad(c.days), l: "days" },
      { v: pad(c.hours), l: "hrs" },
      { v: pad(c.minutes), l: "min" },
      { v: pad(c.seconds), l: "sec" },
    ],
  };
}

/** The dark strip above the nav: what this is, and how long to go. */
export function TopStrip() {
  const { now } = useWorkshop();
  const { phase, parts } = useCountdownParts();
  const word = webinarDayWord(now);
  const short = phase === "live" ? "Live now" : phase === "over" ? "This one has ended" : `${parts[0].v === "00" ? "" : `${Number(parts[0].v)}d `}${parts[1].v}h ${parts[2].v}m ${parts[3].v}s`;
  return (
    <div className="bg-ink text-sm text-paper">
      <div className="mx-auto flex max-w-[1280px] flex-wrap items-center justify-between gap-x-5 gap-y-1 px-5 py-2.5 sm:px-8 lg:px-12">
        <p className="flex items-center gap-2.5">
          <span aria-hidden="true" className="tick size-2 rounded-full bg-red-soft" />
          <strong className="text-xs font-extrabold uppercase tracking-[0.08em]">{WEBINAR.price ? `Live webinar · ${WEBINAR.price.label}` : "Free live webinar"}</strong>
          <span className="hidden text-paper/80 sm:inline">{word ? `${word}, ` : ""}{WEBINAR.shortDate} · {WEBINAR.timeLabel}</span>
        </p>
        <p className="nums flex items-center gap-2" aria-live="off">
          {phase === "before" && <span className="hidden text-paper/70 sm:inline">Starts in</span>}
          <strong className="text-[15px]">{short}</strong>
        </p>
      </div>
    </div>
  );
}

/** The bar that follows you down the page: register, then add to calendar. */
export function StickyBar() {
  const { registered, open } = useWorkshop();
  const { phase, parts } = useCountdownParts();
  const title = registered ? "You’re registered" : open ? `${WEBINAR.title} · ${webinarFee()}` : "Registration is closed";
  const cta = registered ? "Add to calendar" : WEBINAR.price ? `Save a seat · ${WEBINAR.price.label}` : "Register free";
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 pb-2.5 pl-2.5 pr-24 sm:pb-4 sm:pl-8 sm:pr-24 xl:px-8">
      <div className="pointer-events-auto mx-auto flex max-w-[880px] items-center gap-4 rounded-2xl bg-ink py-2.5 pl-4 pr-2.5 text-paper shadow-float sm:rounded-full sm:pl-6">
        <div className="hidden min-w-0 flex-1 sm:block">
          <p className="display display-soft truncate text-base">{title}</p>
          <p className="truncate text-[13px] text-paper/75">{WEBINAR.shortDate} · {WEBINAR.startLabel}</p>
        </div>
        {phase === "before" && (
          <ul className="nums hidden gap-1 sm:flex" aria-hidden="true">
            {parts.map((c) => (
              <li key={c.l} className="grid min-w-11 justify-items-center rounded-lg bg-paper/12 px-1.5 py-1">
                <strong className="display display-soft text-[17px] leading-tight">{c.v}</strong>
                <span className="text-[10px] uppercase tracking-[0.08em] text-paper/70">{c.l}</span>
              </li>
            ))}
          </ul>
        )}
        {(registered || open) && (
          <a
            href={registered ? googleCalendarLink() : "#register"}
            {...(registered ? { target: "_blank", rel: "noopener noreferrer" } : {})}
            className="inline-flex flex-none items-center justify-center gap-2 rounded-full bg-red-strong px-5 py-3 max-sm:flex-1 text-base font-bold text-white no-underline transition-[background-color,transform] duration-150 hover:bg-red-press active:scale-[0.98]"
          >
            {cta}
            <ArrowRight size={16} aria-hidden="true" />
          </a>
        )}
      </div>
    </div>
  );
}
