"use client";

import { useEffect, useRef } from "react";

/**
 * Protects a day's course content:
 * - a faint, tiled watermark with the learner's email and today's date, so a
 *   leaked screenshot shows whose account it came from;
 * - prose can't be selected, copied, cut, dragged or printed. Form fields
 *   (answers, links) and code snippets stay usable, because learners need them.
 * This deters casual copying; it can't stop a determined person with a camera,
 * which is what the watermark is for.
 */
export function ContentGuard({ email, children }: { email: string; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const stamp = `${email} · ${new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium" }).format(new Date())}`;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const allowed = (t: EventTarget | null) => t instanceof Element && !!t.closest("input, textarea, select, [contenteditable], pre, code");
    const block = (e: Event) => { if (!allowed(e.target)) e.preventDefault(); };
    const onCopy = (e: ClipboardEvent) => {
      const sel = document.getSelection();
      const node = sel?.anchorNode instanceof Element ? sel.anchorNode : sel?.anchorNode?.parentElement;
      if (allowed(node ?? null)) return;
      e.preventDefault();
      e.clipboardData?.setData("text/plain", "Klymb.ai course content can't be copied.");
    };
    el.addEventListener("copy", onCopy);
    el.addEventListener("cut", onCopy);
    el.addEventListener("contextmenu", block);
    el.addEventListener("dragstart", block);
    return () => {
      el.removeEventListener("copy", onCopy);
      el.removeEventListener("cut", onCopy);
      el.removeEventListener("contextmenu", block);
      el.removeEventListener("dragstart", block);
    };
  }, []);

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="360" height="200"><text x="0" y="110" transform="rotate(-24 180 100)" font-family="sans-serif" font-size="13" fill="rgba(60,40,40,0.2)">${stamp.replace(/[<&>"]/g, "")}</text></svg>`;

  return (
    <div ref={ref} className="content-guard relative">
      {children}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-[40] print:hidden"
        style={{ backgroundImage: `url("data:image/svg+xml,${encodeURIComponent(svg)}")` }}
      />
    </div>
  );
}
