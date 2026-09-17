"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { clearConsent, readConsent, writeConsent } from "@/lib/consent";

/** Lets someone see and change the choice they already made. */
export function CookiePreferences() {
  const [choice, setChoice] = useState<string | null>(null);

  useEffect(() => {
    const sync = () => setChoice(readConsent()?.choice ?? null);
    sync();
    window.addEventListener("klymb:consent", sync);
    return () => window.removeEventListener("klymb:consent", sync);
  }, []);

  return (
    <div className="border-2 border-line bg-paper p-5">
      <p className="text-sm">
        <strong>Your current choice:</strong>{" "}
        {choice === "all" ? "Analytics allowed" : choice === "necessary" ? "Necessary cookies only" : "Not chosen yet"}
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button type="button" onClick={() => writeConsent("all")} variant={choice === "all" ? "secondary" : "primary"}>
          Allow analytics
        </Button>
        <Button type="button" onClick={() => writeConsent("necessary")} variant="secondary">
          Necessary only
        </Button>
        <Button type="button" onClick={clearConsent} variant="secondary">
          Ask me again
        </Button>
      </div>
      <p className="mt-3 text-xs text-muted">
        Turning analytics off stops any further data being sent. Events Google has already recorded stay until they age
        out of Google&apos;s 14-month retention window.
      </p>
    </div>
  );
}
