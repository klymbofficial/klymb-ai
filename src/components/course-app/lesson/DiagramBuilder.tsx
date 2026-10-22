"use client";

import clsx from "clsx";
import { useRef, useState } from "react";
import type { BuildTask, Lang } from "@/data/system-design/types";
import { Icon } from "../icons";

const UI = {
  en: { tray: "Boxes", left: (n: number) => `${n} left`, wrong: "Not there.", built: "Built!", clean: "First try, no wrong drops.", tries: (n: number) => `${n} wrong ${n === 1 ? "drop" : "drops"} on the way.`, next: "Next: prove it", picked: "Now tap the slot where it goes" },
  hi: { tray: "Boxes", left: (n: number) => `${n} baaki`, wrong: "Yahan nahi.", built: "Ban gaya!", clean: "Pehli baar mein, bina galti.", tries: (n: number) => `Raaste mein ${n} galat drop.`, next: "Agla: prove karo", picked: "Ab woh slot tap karo jahan yeh jaayega" },
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
      <h3 className="m-0 text-[22px] tracking-[-0.02em] lg:text-[26px]">{task.title}</h3>
      <p className="m-0 mt-1 text-sm text-sd-n-800">{task.intro}</p>

      {/* the diagram */}
      <div ref={board} className="sd-grid mt-4 p-3 [--grid:20px] lg:p-5 lg:[--grid:26px]">
        <div className="mx-auto w-max border-2 border-sd-bg bg-sd-bg px-4 py-2 text-sm font-extrabold text-sd-ink">{task.given}</div>
        {task.rows.map((row, r) => (
          <div key={r}>
            <div className="mx-auto h-4 w-0.5 bg-white/40" aria-hidden="true" />
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
                      "min-h-[72px] cursor-pointer border-2 px-2 py-2 text-center transition-[border-color,background-color,transform] duration-200",
                      got && "border-sd-accent bg-sd-accent",
                      !got && !bad && "border-dashed border-white/40 bg-transparent",
                      !got && !bad && picked && "border-sd-accent-400",
                      bad && !drag && "animate-[shake_.35s] border-sd-accent-400 bg-sd-accent/20",
                      !got && over === sid && "scale-[1.03] border-solid border-sd-accent-400 bg-sd-accent/25",
                    )}
                  >
                    {got && <span className="flex items-center justify-center gap-1 text-[13px] font-extrabold text-sd-bg"><Icon name="check" size={14} stroke={3} />{label(got)}</span>}
                    <span className={clsx("block text-[11px] leading-snug", got ? "text-sd-bg/85" : "text-white/80")}>{task.slots[sid].role}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* feedback */}
      <p role="status" aria-live="polite" className="m-0 mt-3 mb-3 min-h-[2.5rem] text-sm">
        {missChip ? (
          <span className="text-sd-accent-700"><b>{ui.wrong}</b> {missChip.label} = {missChip.does}.</span>
        ) : picked ? (
          <span className="font-semibold text-sd-n-700">{ui.picked}</span>
        ) : null}
      </p>

      {/* the tray */}
      {!done ? (
        <div>
          <h6 className="sd-h6 m-0">{ui.tray} · {ui.left(slotIds.length - Object.keys(placed).length)}</h6>
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
                  "cursor-grab touch-none border-2 border-sd-ink px-3.5 py-2.5 text-sm font-extrabold select-none",
                  picked === c.id ? "bg-sd-ink text-sd-bg" : "bg-sd-bg",
                  drag?.id === c.id && "opacity-40",
                )}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="sd-a-pop flex flex-col gap-1.5 bg-sd-ink p-4 text-sd-bg">
          <span className="text-[17px] font-extrabold">{ui.built} {wrong === 0 ? ui.clean : ui.tries(wrong)}</span>
          <span className="text-sm text-sd-bg/85">{task.done}</span>
          <button type="button" onClick={() => onDone(wrong)} className="sd-btn sd-btn-primary mt-2 h-11 self-start gap-2">{ui.next}<Icon name="arrowR" size={16} /></button>
        </div>
      )}

      {drag && (
        <div aria-hidden="true" className="sd-shadow-lg pointer-events-none fixed z-[80] -translate-x-1/2 -translate-y-1/2 border-2 border-sd-ink bg-sd-ink px-3.5 py-2.5 text-sm font-extrabold text-sd-bg" style={{ left: drag.x, top: drag.y }}>
          {label(drag.id)}
        </div>
      )}
    </div>
  );
}
