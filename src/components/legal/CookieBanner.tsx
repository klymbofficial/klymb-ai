"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { readConsent, writeConsent } from "@/lib/consent";

/** Asked once, remembered for 180 days, and re-asked when the policy version changes. */
export function CookieBanner() {
  const [open, setOpen] = useState(false);
  const reduced = useReducedMotion();

  useEffect(() => {
    const sync = () => setOpen(readConsent() === null);
    sync();
    window.addEventListener("klymb:consent", sync);
    return () => window.removeEventListener("klymb:consent", sync);
  }, []);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          role="dialog"
          aria-label="Cookie choices"
          initial={reduced ? false : { y: 24, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={reduced ? { opacity: 0 } : { y: 24, opacity: 0 }}
          transition={{ duration: 0.25, ease: [0.2, 0.7, 0.3, 1] }}
          className="fixed inset-x-0 bottom-0 z-50 border-t-2 border-ink bg-paper"
          style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        >
          <div className="mx-auto flex max-w-5xl flex-col gap-4 px-4 py-5 sm:flex-row sm:items-center sm:px-6">
            <p className="flex-1 text-sm">
              We use cookies that keep you signed in — those are essential. We would also like to measure how the site is
              used, with Google Analytics. That one is your choice, and nothing is sent to Google unless you allow it.{" "}
              <Link href="/cookies" className="font-semibold underline underline-offset-2">Cookie Policy</Link>
            </p>
            <div className="flex shrink-0 gap-2">
              <button
                type="button"
                onClick={() => writeConsent("necessary")}
                className="border-2 border-ink px-4 py-2.5 text-sm font-bold uppercase tracking-wider hover:bg-surface"
              >
                Necessary only
              </button>
              <button
                type="button"
                onClick={() => writeConsent("all")}
                className="border-2 border-red-strong bg-red-strong px-4 py-2.5 text-sm font-bold uppercase tracking-wider text-white hover:bg-red-deep hover:border-red-deep"
              >
                Accept all
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
