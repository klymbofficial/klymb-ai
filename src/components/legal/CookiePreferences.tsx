"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { readConsent, writeConsent } from "@/lib/consent";

/** Opt-out control: analytics is on unless someone turns it off here. */
export function CookiePreferences() {
  const [choice, setChoice] = useState<string | null>(null);

  useEffect(() => {
    const sync = () => setChoice(readConsent()?.choice ?? "all");
    sync();
    window.addEventListener("klymb:consent", sync);
    return () => window.removeEventListener("klymb:consent", sync);
  }, []);

  return (
    <div className="border-2 border-line bg-paper p-5">
      <p className="text-sm">
        <strong>Your current choice:</strong>{" "}
        {choice === "necessary" ? "Analytics off — nothing is sent to Google" : "Analytics on (the default)"}
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        {choice === "necessary" ? (
          <Button type="button" onClick={() => writeConsent("all")}>Turn analytics back on</Button>
        ) : (
          <Button type="button" onClick={() => writeConsent("necessary")}>Turn analytics off</Button>
        )}
      </div>
      <p className="mt-3 text-xs text-muted">
        Turning analytics off stops any further data being sent. Events Google has already recorded stay until they age
        out of Google&apos;s 14-month retention window.
      </p>
    </div>
  );
}
