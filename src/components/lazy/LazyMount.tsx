"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Renders a placeholder of the right size until the reader scrolls near it,
 * then mounts the real component (whose code is loaded only then). Keeps
 * heavy, below-the-fold interactive pieces out of the first load.
 */
export function LazyMount({ children, className, margin = "600px", fallback }: { children: React.ReactNode; className?: string; margin?: string; fallback?: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [show, setShow] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => e.isIntersecting && setShow(true), { rootMargin: margin });
    io.observe(el);
    return () => io.disconnect();
  }, [margin]);
  return <div ref={ref} className={show ? undefined : className}>{show ? children : (fallback ?? null)}</div>;
}
