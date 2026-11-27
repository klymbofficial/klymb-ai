"use client";

import { useEffect, useRef } from "react";

/** A scrolling list that opens with the current lesson in view, without moving the page itself. */
export function OutlineScroll({ className, children }: { className?: string; children: React.ReactNode }) {
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = box.current;
    const cur = el?.querySelector<HTMLElement>("[aria-current=page]");
    if (!el || !cur) return;
    el.scrollTop = cur.offsetTop - el.offsetTop - el.clientHeight / 2 + cur.clientHeight / 2;
  }, []);
  return <div ref={box} className={className}>{children}</div>;
}
