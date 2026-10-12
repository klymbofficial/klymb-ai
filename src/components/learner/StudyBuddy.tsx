"use client";

import { Mascot } from "page-mascot";

/**
 * Kamran, the learner's study buddy: follows the cursor and blinks when poked
 * (page-mascot, MIT, by Kamran Ahmed; sheets in /public/mascots). The bubble
 * says one thing about where they are, so the character has a reason to be there.
 */
export function StudyBuddy({ message }: { message: string }) {
  return (
    <div className="flex items-center gap-3">
      <Mascot
        directions="/mascots/kamran-directions.webp"
        reactions="/mascots/kamran-reactions.webp"
        size={104}
        label="Kamran, your study buddy"
        className="shrink-0 drop-shadow-[0_8px_16px_rgba(0,0,0,0.35)]"
      />
      <p className="relative max-w-[16rem] rounded-2xl rounded-bl-sm bg-white px-4 py-2.5 text-sm font-semibold leading-snug text-ink shadow-[0_8px_24px_rgba(0,0,0,0.25)]">
        {message}
      </p>
    </div>
  );
}
