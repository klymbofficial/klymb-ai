"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { readConsent, writeConsent } from "@/lib/consent";

/**
 * Tells first-time visitors about analytics and the ad tags. Google Analytics
 * is opt-out, as the Cookie Policy states; the Meta Pixel is opt-in and loads
 * only after OK. Once a choice is saved the banner does not return until the
 * policy version changes.
 */
export function CookieBanner() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const sync = () => setOpen(readConsent() === null);
    sync();
    window.addEventListener("klymb:consent", sync);
    return () => window.removeEventListener("klymb:consent", sync);
  }, []);

  if (!open) return null;
  return (
    <div
      role="region"
      aria-label="Cookie notice"
      className="fixed inset-x-2 bottom-[max(0.5rem,env(safe-area-inset-bottom))] z-50 rounded-2xl bg-night/95 px-3.5 py-3 text-[13px] text-paper shadow-float backdrop-blur sm:inset-x-auto sm:bottom-4 sm:left-4 sm:max-w-sm sm:p-4 sm:text-sm"
    >
      {/* On a phone the help button sits over the right-hand corner: the text and buttons stay clear of it. */}
      <p className="pr-16 leading-snug text-white/80 sm:pr-0 sm:leading-relaxed">
        We use Google Analytics to see which pages help people. Tap OK to also allow Meta Pixel, Google Ads and Microsoft Clarity, so our ads reach people who visited and we can see where pages confuse people. We never sell your data.{" "}
        <Link href="/cookies" className="font-semibold text-white underline underline-offset-2">Cookie Policy</Link>
      </p>
      <div className="mt-2 flex gap-2 sm:mt-3">
        <button type="button" onClick={() => writeConsent("all")} className="rounded-lg bg-white px-4 py-1.5 font-bold text-ink hover:bg-paper sm:py-2">
          OK
        </button>
        <button type="button" onClick={() => writeConsent("necessary")} className="rounded-lg border border-white/30 px-4 py-1.5 font-bold hover:bg-white/10 sm:py-2">
          No thanks
        </button>
      </div>
    </div>
  );
}
