"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";

type Item = { q: string; a: string };

/** One answer open at a time. The list reserves its tallest state, so opening an answer never pushes the rules down the page. */
export function FaqAccordion({ items }: { items: readonly Item[] }) {
  const [openIndex, setOpenIndex] = useState(0);
  const listRef = useRef<HTMLDivElement | null>(null);
  const panelRefs = useRef<(HTMLDivElement | null)[]>([]);
  const btnRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [heights, setHeights] = useState<number[]>(() => items.map(() => 0));
  const [reservedMin, setReservedMin] = useState<number | null>(null);

  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    function measure() {
      const next = panelRefs.current.map((p) => (p ? p.scrollHeight : 0));
      setHeights(next);
      // Every row collapsed, plus the tallest single answer.
      const rows = btnRefs.current.reduce((sum, b) => sum + (b?.offsetHeight ?? 0), 0);
      const gaps = 8 * Math.max(0, items.length - 1);
      setReservedMin(Math.ceil(rows + gaps + Math.max(0, ...next) + 2 * items.length));
    }
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [items.length]);

  function onKey(e: KeyboardEvent<HTMLButtonElement>, i: number) {
    let target: number | null = null;
    if (e.key === "ArrowDown") target = (i + 1) % items.length;
    else if (e.key === "ArrowUp") target = (i - 1 + items.length) % items.length;
    else if (e.key === "Home") target = 0;
    else if (e.key === "End") target = items.length - 1;
    if (target !== null) {
      e.preventDefault();
      btnRefs.current[target]?.focus();
    }
  }

  return (
    <div className="hk-faq__list" ref={listRef} style={reservedMin ? { minHeight: `${reservedMin}px` } : undefined}>
      {items.map((item, i) => {
        const isOpen = i === openIndex;
        return (
          <div key={item.q} className={`hk-faqi${isOpen ? " is-open" : ""}`}>
            <h3 className="hk-faqi__h">
              <button
                className="hk-faqi__btn"
                type="button"
                id={`faq-b${i + 1}`}
                aria-expanded={isOpen}
                aria-controls={`faq-p${i + 1}`}
                ref={(el) => { btnRefs.current[i] = el; }}
                onClick={() => setOpenIndex(isOpen ? -1 : i)}
                onKeyDown={(e) => onKey(e, i)}
              >
                <span className="hk-faqi__q">{item.q}</span>
                <span className="hk-faqi__icon" aria-hidden="true"><i /><i /></span>
              </button>
            </h3>
            <div className="hk-faqi__panel" id={`faq-p${i + 1}`} role="region" aria-labelledby={`faq-b${i + 1}`} style={{ height: isOpen ? `${heights[i] ?? 0}px` : "0px" }}>
              <div ref={(el) => { panelRefs.current[i] = el; }}>
                <p>{item.a}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
