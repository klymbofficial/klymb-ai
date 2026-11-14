"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { readConsent, writeConsent } from "@/lib/consent";

/** Google Analytics is on unless turned off here; Meta Pixel is on only after OK. */
export function CookiePreferences() {
  const [choice, setChoice] = useState<string | null>(null);

  useEffect(() => {
    const sync = () => setChoice(readConsent()?.choice ?? null);
    sync();
    window.addEventListener("klymb:consent", sync);
    return () => window.removeEventListener("klymb:consent", sync);
  }, []);

  return (
    <div className="card p-5">
      <p className="text-sm">
        <strong>Your current choice:</strong>{" "}
        {choice === "necessary"
          ? "Both off: nothing is sent to Google or Meta"
          : choice === "all"
            ? "Google Analytics and Meta Pixel on"
            : "Google Analytics on (the default), Meta Pixel off"}
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        {choice !== "all" && (
          <Button type="button" soft onClick={() => writeConsent("all")}>Turn both on</Button>
        )}
        {choice !== "necessary" && (
          <Button type="button" soft onClick={() => writeConsent("necessary")}>Turn both off</Button>
        )}
      </div>
      <p className="mt-3 text-xs text-muted">
        Turning them off stops any further data being sent. Events already recorded stay until they age out: 14 months
        at Google, and up to 180 days in Meta&apos;s ad audiences.
      </p>
    </div>
  );
}
