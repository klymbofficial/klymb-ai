"use client";

import clsx from "clsx";
import { useEffect, useRef, useState } from "react";

/**
 * The old job title gets struck through, then the role that replaces it rises
 * in letter by letter: the split-text reveal on string-tune.fiddle.digital.
 * Runs once when it scrolls into view. CSS transitions (`.strike-*` in
 * globals.css), so no animation library on first load; reduced motion shows
 * the end state. Screen readers hear "QA Engineer, becoming AI Test Architect".
 */
export function StrikeReveal({
  from,
  to,
  as: Tag = "h3",
  fromClassName,
  toClassName,
  className,
  delay = 0,
  id,
}: {
  from: string;
  to: string;
  as?: "h1" | "h2" | "h3";
  fromClassName?: string;
  toClassName?: string;
  className?: string;
  delay?: number;
  id?: string;
}) {
  const ref = useRef<HTMLHeadingElement>(null);
  const [shown, setShown] = useState(false);
  const strikeAt = delay + 0.15;
  const revealAt = strikeAt + 0.55;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.dataset.armed = ""; // hide the end state only once script can reveal it
    const io = new IntersectionObserver(([e]) => {
      if (e.intersectionRatio >= 0.6 || e.isIntersecting && e.boundingClientRect.top < window.innerHeight * 0.6) {
        setShown(true);
        io.disconnect();
      }
    }, { threshold: [0, 0.6] });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <Tag ref={ref} id={id} className={clsx("strike flex flex-col", shown && "is-shown", className)}>
      <span className="sr-only">{`${from}, becoming ${to}`}</span>
      {/* The job as it was: struck, then faded. */}
      <span aria-hidden="true" className={clsx("relative w-fit", fromClassName)}>
        <span className="strike-old inline-block" style={{ transitionDelay: `${strikeAt + 0.4}s` }}>{from}</span>
        <span
          className="strike-line absolute top-[54%] left-[-2%] h-[0.09em] min-h-[2px] w-[104%] origin-left rounded-full bg-red-strong"
          style={{ transitionDelay: `${strikeAt}s` }}
        />
      </span>

      {/* The role it becomes: each letter rises out of a clipped line; words never break. */}
      <span aria-hidden="true" className={clsx("block overflow-hidden pb-[0.08em]", toClassName)}>
        <span className="mr-[0.3em] inline-block text-red-strong">→</span>
        {to.split(" ").map((word, w, words) => {
          const offset = words.slice(0, w).join(" ").length + (w ? 1 : 0);
          return (
            <span key={w} className="inline-block whitespace-nowrap">
              {word.split("").map((ch, i) => (
                <span key={i} className="strike-char inline-block" style={{ transitionDelay: `${revealAt + (offset + i) * 0.022}s` }}>
                  {ch}
                </span>
              ))}
              {w < words.length - 1 && <span className="inline-block">&nbsp;</span>}
            </span>
          );
        })}
      </span>
    </Tag>
  );
}
