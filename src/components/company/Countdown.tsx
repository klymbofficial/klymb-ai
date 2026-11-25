"use client";

import { useEffect, useRef, useState } from "react";
import { ANNOUNCE_AT_MINUTES, clockText } from "@/lib/company/attempt-rules";

/**
 * Time left, counted against the server's clock: the page passes the
 * server's "now" and the deadline, so a wrong clock on the candidate's
 * computer doesn't change what they see. Display only; the deadline itself
 * is enforced on the server. Screen readers hear the time at 30, 10, 5 and
 * 1 minutes left rather than every second.
 */
export function Countdown({ deadline, serverNow }: { deadline: string; serverNow: string }) {
  // How far this computer's clock is from the server's, measured once on load.
  const [skew] = useState(() => new Date(serverNow).getTime() - Date.now());
  const end = new Date(deadline).getTime();
  // First render from the server's own numbers, so the server and the browser draw the same time.
  const [left, setLeft] = useState(() => Math.max(0, end - new Date(serverNow).getTime()));
  const [said, setSaid] = useState("");
  const announced = useRef(new Set<number>());

  useEffect(() => {
    const tick = () => {
      const ms = Math.max(0, end - (Date.now() + skew));
      setLeft(ms);
      const minutes = Math.ceil(ms / 60000);
      for (const m of ANNOUNCE_AT_MINUTES) {
        if (minutes === m && !announced.current.has(m)) {
          announced.current.add(m);
          setSaid(`${m} minute${m === 1 ? "" : "s"} left.`);
        }
      }
      if (ms === 0) setSaid("Time is up.");
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [end, skew]);

  const low = left > 0 && left <= 5 * 60000;
  const soon = left > 5 * 60000 && left <= 10 * 60000;
  return (
    <div className={`flex items-baseline gap-2 rounded-md border-2 px-3 py-1 ${low ? "border-error bg-[#fdecea]" : soon ? "border-[#b26a00] bg-[#fff4e0]" : "border-line/40 bg-white"}`}>
      <span className="text-[0.65rem] font-extrabold uppercase tracking-[0.14em] text-muted">Time left</span>
      <span role="timer" aria-live="off" className={`font-mono text-2xl font-bold tabular-nums ${low ? "text-error" : soon ? "text-[#8a5200]" : ""}`}>
        {left === 0 ? "00:00" : clockText(left)}
      </span>
      <span className="sr-only" aria-live="polite">{said}</span>
    </div>
  );
}
