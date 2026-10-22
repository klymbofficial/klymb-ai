"use client";

import clsx from "clsx";
import { useRef, useState } from "react";
import type { BuildTask, Lang } from "@/data/system-design/types";

const UI = {
  en: { tray: "Boxes", left: (n: number) => `${n} left`, wrong: "Not there.", built: "Built!", clean: "First try, no wrong drops.", tries: (n: number) => `${n} wrong ${n === 1 ? "drop" : "drops"} on the way.`, next: "Next: prove it →", picked: "Now tap the slot where it goes" },
  hi: { tray: "Boxes", left: (n: number) => `${n} baaki`, wrong: "Yahan nahi.", built: "Ban gaya!", clean: "Pehli baar mein, bina galti.", tries: (n: number) => `Raaste mein ${n} galat drop.`, next: "Agla: prove karo →", picked: "Ab woh slot tap karo jahan yeh jaayega" },
};

/**
 * Drag a box from the tray onto the slot whose job it does, or tap a box and
 * then a slot (easier with a thumb). Right drops lock in; wrong ones bounce
 * back with what that box actually does, which is the lesson.
 */
export function DiagramBuilder({ task, lang, onDone }: { task: BuildTask; lang: Lang; onDone: (wrong: number) => void }) {
  const ui = UI[lang];
  const [placed, setPlaced] = useState<Record<string, string>>({});
  const [picked, setPicked] = useState<string | null>(null);
  const [miss, setMiss] = useState<{ slot: string; chip: string } | null>(null);
  const [wrong, setWrong] = useState(0);
  const [drag, setDrag] = useState<{ id: string; x: number; y: number } | null>(null);
  const [over, setOver] = useState<string | null>(null);
  const start = useRef<{ id: string; x: number; y: number; moved: boolean; lastX: number; lastY: number } | null>(null);
  const board = useRef<HTMLDivElement>(null);

  const slotIds = task.rows.flat();
  const done = slotIds.every((s) => placed[s]);
  const used = new Set(Object.values(placed));
  const tray = task.chips.filter((c) => !used.has(c.id));
  const label = (id: string) => task.chips.find((c) => c.id === id)?.label ?? id;

  function drop(chip: string, slot: string) {
    setPicked(null);
    if (placed[slot]) return;
    if (task.slots[slot].answer === chip) {
      setPlaced((p) => ({ ...p, [slot]: chip }));
      setMiss(null);
    } else {
      setWrong((w) => w + 1);
      setMiss({ slot, chip });
    }
  }

  /**
   * The empty slot a drop at (x, y) lands in: the one under the pointer, or the
   * nearest one within a thumb's width, so a box released on a slot's edge still counts.
   */
  function slotAt(x: number, y: number) {
    let best: { id: string; d: number } | null = null;
    for (const el of board.current?.querySelectorAll<HTMLElement>("[data-slot]") ?? []) {
      const id = el.dataset.slot!;
      if (placed[id]) continue;
      const r = el.getBoundingClientRect();
      const d = Math.hypot(Math.max(r.left - x, 0, x - r.right), Math.max(r.top - y, 0, y - r.bottom));
      if (d <= 44 && (!best || d < best.d)) best = { id, d };
    }
    return best?.id ?? null;
  }

  const onDown = (id: string) => (e: React.PointerEvent) => {
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* no capture: moves still reach the box while the pointer is over it, and release still drops */ }
    start.current = { id, x: e.clientX, y: e.clientY, moved: false, lastX: e.clientX, lastY: e.clientY };
  };
  const onMove = (e: React.PointerEvent) => {
    const s = start.current;
    if (!s) return;
    s.lastX = e.clientX;
    s.lastY = e.clientY;
    if (!s.moved && Math.hypot(e.clientX - s.x, e.clientY - s.y) < 8) return;
    if (!s.moved) setMiss(null);
    s.moved = true;
    setDrag({ id: s.id, x: e.clientX, y: e.clientY });
    setOver(slotAt(e.clientX, e.clientY));
  };
  /** Release, or the browser taking the pointer away: either way the box lands where it was let go. */
  const finish = (x?: number, y?: number) => {
    const s = start.current;
    start.current = null;
    setDrag(null);
    setOver(null);
    if (!s) return;
    if (!s.moved) { setPicked((p) => (p === s.id ? null : s.id)); return; }
    const slot = slotAt(x ?? s.lastX, y ?? s.lastY);
    if (slot) drop(s.id, slot);
  };

  const missChip = miss && task.chips.find((c) => c.id === miss.chip);

  return (
    <div>
      <p className="text-lg font-extrabold leading-tight">{task.title}</p>
      <p className="mt-1 text-sm text-muted">{task.intro}</p>

      {/* the diagram */}
      <div ref={board} className="mt-4 rounded-2xl bg-night p-3 sm:p-4" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.05) 1px, transparent 1px)", backgroundSize: "20px 20px" }}>
        <div className="mx-auto w-max rounded-xl border-2 border-white/60 bg-white/10 px-4 py-2 text-sm font-extrabold text-white">{task.given}</div>
        {task.rows.map((row, r) => (
          <div key={r}>
            <div className="mx-auto h-4 w-0.5 bg-white/30" aria-hidden="true" />
            <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${row.length}, minmax(0, 1fr))` }}>
              {row.map((sid) => {
                const got = placed[sid];
                const bad = miss?.slot === sid;
                return (
                  <button
                    key={sid}
                    type="button"
                    data-slot={sid}
                    onClick={() => picked && drop(picked, sid)}
                    aria-label={got ? `${label(got)}: ${task.slots[sid].role}` : task.slots[sid].role}
                    className={clsx(
                      "min-h-[72px] rounded-xl border-2 px-2 py-2 text-center transition-[border-color,background-color,transform] duration-200",
                      got && "border-emerald-400 bg-emerald-400/15",
                      !got && !bad && "border-dashed border-white/35 bg-white/[0.03]",
                      !got && picked && "border-yellow-300/80",
                      bad && !drag && "animate-[shake_.35s] border-red-soft bg-red-soft/15",
                      !got && over === sid && "scale-[1.03] border-solid border-yellow-300 bg-yellow-300/15",
                    )}
                  >
                    {got && <span className="block text-[13px] font-extrabold text-emerald-300">✓ {label(got)}</span>}
                    <span className={clsx("block text-[11px] leading-snug", got ? "text-white/70" : "text-white/80")}>{task.slots[sid].role}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* feedback */}
      <p role="status" aria-live="polite" className="mt-3 mb-3 min-h-[2.5rem] text-sm">
        {missChip ? (
          <span className="text-red-deep"><b>{ui.wrong}</b> {missChip.label} = {missChip.does}.</span>
        ) : picked ? (
          <span className="font-semibold text-muted">{ui.picked}</span>
        ) : null}
      </p>

      {/* the tray */}
      {!done ? (
        <div>
          <p className="text-xs font-extrabold uppercase tracking-wider text-muted">{ui.tray} · {ui.left(slotIds.length - Object.keys(placed).length)}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {tray.map((c) => (
              <button
                key={c.id}
                type="button"
                onPointerDown={onDown(c.id)}
                onPointerMove={onMove}
                onPointerUp={(e) => finish(e.clientX, e.clientY)}
                onLostPointerCapture={() => finish()}
                onPointerCancel={() => finish()}
                className={clsx(
                  "touch-none select-none rounded-lg border-2 px-3.5 py-2.5 text-sm font-extrabold transition-[transform,background-color] active:scale-95",
                  picked === c.id ? "border-ink bg-ink text-paper" : "border-ink/80 bg-card",
                  drag?.id === c.id && "opacity-40",
                )}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="rounded-xl bg-emerald-50 p-4">
          <p className="font-extrabold text-emerald-800">{ui.built} {wrong === 0 ? ui.clean : ui.tries(wrong)}</p>
          <p className="mt-1 text-sm text-emerald-900/80">{task.done}</p>
          <button type="button" onClick={() => onDone(wrong)} className="mt-3 rounded-lg bg-ink px-5 py-3 text-sm font-bold text-paper transition-transform active:scale-[0.97]">{ui.next}</button>
        </div>
      )}

      {drag && (
        <div aria-hidden="true" className="pointer-events-none fixed z-50 -translate-x-1/2 -translate-y-1/2 rounded-lg border-2 border-ink bg-ink px-3.5 py-2.5 text-sm font-extrabold text-paper shadow-float" style={{ left: drag.x, top: drag.y }}>
          {label(drag.id)}
        </div>
      )}
    </div>
  );
}
