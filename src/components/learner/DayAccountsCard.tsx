"use client";

import { type ComponentProps, useState } from "react";
import { EvidenceProfile } from "@/components/learner/EvidenceProfile";
import { accountsMissing } from "@/lib/learner/evidence";

/**
 * On a day page, when a submission would be refused for want of the learner's
 * GitHub or LinkedIn: the form for them, right above the submit box. Every
 * submitted link is checked against these accounts, and a challenge starts
 * with neither (nothing is asked when it begins), so this is where they are
 * asked, at the moment they matter. `needsLinkedin` is true on a day that asks
 * for a LinkedIn post; on other days only a missing GitHub shows the card.
 *
 * Whether to show it is decided once, when the page opens. Saving re-renders
 * the page with the accounts filled in, and the card stays up showing "Saved."
 * rather than vanishing under the person's cursor; it is gone the next time
 * the page opens.
 */
export function DayAccountsCard({ needsLinkedin, ...accounts }: Omit<ComponentProps<typeof EvidenceProfile>, "compact"> & { needsLinkedin: boolean }) {
  const [show] = useState(() => accountsMissing(accounts, needsLinkedin));
  if (!show) return null;
  return (
    <div className="mb-8 rounded-lg border border-red-strong/25 bg-red-strong/5 p-4 sm:p-5">
      <EvidenceProfile {...accounts} compact />
    </div>
  );
}
