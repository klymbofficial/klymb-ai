"use client";

import clsx from "clsx";
import { useEffect, useState } from "react";
import { cohort } from "@/data/config";
import { priceFrom } from "@/data/tracks";
import { formatDate, formatINR } from "@/lib/format";
import { ButtonLink } from "@/components/ui/Button";

/**
 * On phones, keeps the price, the real enrolment deadline and the call to
 * action one tap away once the hero has scrolled past. Hidden again near the
 * registration form so it never covers it.
 */
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
      aria-hidden={!show}
      className={clsx(
        "fixed inset-x-0 bottom-0 z-40 border-t border-line/30 bg-paper/95 px-4 py-3 backdrop-blur transition-transform duration-300 lg:hidden",
        show ? "translate-y-0" : "pointer-events-none translate-y-full",
      )}
    >
      <div className="mx-auto flex max-w-xl items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-base font-extrabold nums">From {formatINR(priceFrom)}</p>
          <p className="truncate text-xs text-muted">Enrolment closes {formatDate(cohort.enrollmentDeadline)} · Refunded if you finish</p>
        </div>
        <ButtonLink href="#pricing" className="shrink-0" soft>Reserve seat</ButtonLink>
      </div>
    </div>
  );
}
