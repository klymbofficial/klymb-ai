"use client";

import clsx from "clsx";
import Link from "next/link";
import { useEffect, useState } from "react";

/**
 * On phones, once the first screen has scrolled past, keeps one way in for each
 * audience a tap away: courses for individuals, team training for
 * organizations. The two buttons are the same size and style, and each says who
 * it is for. Hidden again near the registration form so it never covers it.
 * Draft wording, for the final copy review.
 */
const routes = [
  { who: "For individuals", label: "Explore courses", href: "/courses" },
  { who: "For organizations", label: "Team training", href: "/training-solutions" },
];

export function StickyEnrolBar() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const onScroll = () => {
      const form = document.getElementById("register");
      const nearForm = form ? form.getBoundingClientRect().top < window.innerHeight : false;
      setShow(window.scrollY > window.innerHeight * 0.8 && !nearForm);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div
      inert={!show}
      className={clsx(
        "fixed inset-x-0 bottom-0 z-40 border-t border-line/30 bg-paper/95 px-4 py-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom))] backdrop-blur transition-transform duration-300 lg:hidden",
        show ? "translate-y-0" : "pointer-events-none translate-y-full",
      )}
    >
      <nav aria-label="Ways to start" className="mx-auto grid max-w-xl grid-cols-2 gap-3">
        {routes.map((r) => (
          <Link
            key={r.href}
            href={r.href}
            className="flex min-h-11 flex-col items-center justify-center rounded-lg bg-red-strong px-3 py-1.5 text-center text-white transition-[background-color,transform] duration-150 hover:bg-red-press active:scale-[0.97]"
          >
            <span className="text-[11px] font-extrabold uppercase tracking-[0.1em] text-white/80">{r.who}</span>
            <span className="text-sm font-bold">{r.label}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}
