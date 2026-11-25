"use client";

import { useLinkStatus } from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";

/**
 * Feedback the moment someone clicks (P0 polish): a thin bar across the top
 * that starts on any in-app link press or form submit and finishes when the
 * new view arrives, so a slow server never looks like a dead click. A
 * failsafe ends it after 20 seconds. Reduced motion: no animation, just the bar.
 */
function Bar() {
  const pathname = usePathname();
  const search = useSearchParams();
  const [state, setState] = useState<"idle" | "busy" | "done">("idle");
  const timer = useRef<number | null>(null);
  const here = `${pathname}?${search.toString()}`;
  const [seen, setSeen] = useState(here);
  // The view changed: finish the bar (adjusting state while rendering, not in an effect).
  if (seen !== here) {
    setSeen(here);
    if (state === "busy") setState("done");
  }
  useEffect(() => {
    if (state !== "done") return;
    const t = window.setTimeout(() => setState("idle"), 300);
    return () => window.clearTimeout(t);
  }, [state]);
  useEffect(() => {
    const start = () => {
      setState("busy");
      if (timer.current) window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setState("done"), 20000);
    };
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!a || a.target === "_blank" || a.hasAttribute("download")) return;
      const url = new URL(a.href, location.href);
      if (url.origin !== location.origin) return;
      if (url.pathname === location.pathname && url.search === location.search) return; // a hash or the same view
      start();
    };
    const onSubmit = (e: SubmitEvent) => {
      const f = e.target as HTMLFormElement | null;
      // Forms that navigate (GET search, server actions that redirect); in-page saves show their own "Saving…".
      if (f && (f.method?.toLowerCase() === "get" || f.dataset.navigates === "true")) start();
    };
    document.addEventListener("click", onClick, true);
    document.addEventListener("submit", onSubmit, true);
    return () => {
      document.removeEventListener("click", onClick, true);
      document.removeEventListener("submit", onSubmit, true);
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, []);
  if (state === "idle") return null;
  return (
    <div role="progressbar" aria-label="Loading" aria-busy={state === "busy"} className="pointer-events-none fixed inset-x-0 top-0 z-[60] h-[3px] overflow-hidden">
      <div
        className={state === "busy"
          ? "h-full w-full origin-left animate-[nav-progress_8s_cubic-bezier(.1,.7,.3,1)_forwards] bg-red-strong motion-reduce:animate-none motion-reduce:w-2/3"
          : "h-full w-full bg-red-strong opacity-0 transition-opacity duration-300"}
      />
    </div>
  );
}

export function NavProgress() {
  return <Suspense fallback={null}><Bar /></Suspense>;
}

/**
 * Inside a <Link>: a small dot that pulses while that link's page loads, so
 * a tab press shows at once. Always rendered (no layout shift); only its
 * opacity changes.
 */
export function PendingDot({ className = "" }: { className?: string }) {
  const { pending } = useLinkStatus();
  return (
    <span
      aria-hidden="true"
      className={`ml-1.5 inline-block size-1.5 shrink-0 rounded-full bg-current align-middle transition-opacity duration-150 ${pending ? "animate-pulse opacity-80" : "opacity-0"} ${className}`}
    />
  );
}
