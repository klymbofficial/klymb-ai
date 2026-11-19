"use client";

import { useEffect, useState } from "react";

const pad = (n: number) => (n < 10 ? `0${n}` : String(n));

/** Days, hours, minutes and seconds to `targetIso`, ticking every second. Dashes until it mounts, so the server and client render alike. */
export function Countdown({ targetIso, label }: { targetIso: string; label: string }) {
  const [t, setT] = useState<{ d: number; h: number; m: number; s: number } | null>(null);
  const [live, setLive] = useState("");

  useEffect(() => {
    const target = new Date(targetIso).getTime();
    let lastMinute = -1;

    function tick() {
      const ms = Math.max(0, target - Date.now());
      const total = Math.floor(ms / 1000);
      const d = Math.floor(total / 86400);
      const h = Math.floor((total % 86400) / 3600);
      const m = Math.floor((total % 3600) / 60);
      const s = total % 60;
      setT({ d, h, m, s });
      if (m !== lastMinute) {
        lastMinute = m;
        setLive(ms === 0 ? "The countdown has ended." : `${d} days, ${h} hours and ${m} minutes remaining.`);
      }
      return ms;
    }

    const first = window.setTimeout(tick, 0);
    const timer = window.setInterval(() => {
      if (tick() === 0) window.clearInterval(timer);
    }, 1000);
    const onVisibility = () => { if (!document.hidden) tick(); };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [targetIso]);

  const show = t ? { d: pad(t.d), h: pad(t.h), m: pad(t.m), s: pad(t.s) } : { d: "--", h: "--", m: "--", s: "--" };
  const units = [["d", "Days"], ["h", "Hrs"], ["m", "Min"], ["s", "Sec"]] as const;

  return (
    <div className="hk-count" role="timer" aria-label={label}>
      {units.map(([k, name], i) => (
        <div key={k} className="hk-count__group">
          {i > 0 && <span className="hk-count__sep" aria-hidden="true">:</span>}
          <div className="hk-count__unit">
            <span className="hk-count__value">{show[k]}</span>
            <span className="hk-count__label">{name}</span>
          </div>
        </div>
      ))}
      <p className="sr-only" aria-live="polite">{live}</p>
    </div>
  );
}
