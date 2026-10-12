"use client";

import clsx from "clsx";
import { Mascot } from "page-mascot";

/**
 * Kamran, Klymb's study buddy: follows the cursor and blinks when poked
 * (page-mascot, MIT, by Kamran Ahmed; sheets in /public/mascots). The bubble
 * says one thing about where the visitor is, so the character has a reason to
 * be there. `tone="light"` outlines the bubble for pale backgrounds.
 */
export function StudyBuddy({ message, tone = "dark", size = 104 }: { message: string; tone?: "dark" | "light"; size?: number }) {
  return (
    <div className="flex items-center gap-3">
      <Mascot
        directions="/mascots/kamran-directions.webp"
        reactions="/mascots/kamran-reactions.webp"
        size={size}
        label="Kamran, your study buddy"
        className={clsx("shrink-0", tone === "dark" ? "drop-shadow-[0_8px_16px_rgba(0,0,0,0.35)]" : "drop-shadow-[0_6px_12px_rgba(0,0,0,0.12)]")}
      />
      <p
        className={clsx(
          "relative max-w-[18rem] rounded-2xl rounded-bl-sm bg-white px-4 py-2.5 text-sm font-semibold leading-snug text-ink",
          tone === "dark" ? "shadow-[0_8px_24px_rgba(0,0,0,0.25)]" : "shadow-card ring-1 ring-line/40",
        )}
      >
        {message}
      </p>
    </div>
  );
}
