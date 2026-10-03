import clsx from "clsx";

/**
 * Fades and lifts content into place. Pure CSS (`.appear` in globals.css), so
 * text is painted with the HTML instead of waiting for JavaScript: the hero
 * copy is the page's largest paint, and hiding it until hydration cost
 * seconds. Where the browser supports scroll-driven animation the reveal
 * follows the element into view; elsewhere it plays once on load.
 */
export function Appear({
  children, delay = 0, y = 16, className,
}: { children: React.ReactNode; delay?: number; y?: number; className?: string }) {
  return (
    <div className={clsx("appear", className)} style={{ "--appear-delay": `${delay}s`, "--appear-y": `${y}px` } as React.CSSProperties}>
      {children}
    </div>
  );
}
