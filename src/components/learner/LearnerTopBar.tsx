import { allFree } from "@/data/tracks";
import Link from "next/link";
import { currentEmail } from "@/auth";
import { ReminderBell } from "@/components/pwa/ReminderBell";
import { AccountMenu } from "./AccountMenu";

/**
 * The signed-in bar shared by the dashboard, the track page, the day pages and
 * the coach: the wordmark, which is the way back to the dashboard, and the
 * account menu. Nothing between them: where to go next is each page's job,
 * from the dashboard's course cards to a track's own up-next card.
 */
export async function LearnerTopBar({ name, image }: { name: string; image?: string | null }) {
  const email = await currentEmail();

  return (
    <>
      <div className="ticker bg-red-strong py-1.5 text-xs font-bold uppercase tracking-[0.06em] text-white sm:text-xs">
        <p className="ticker-track">
          {allFree ? "One problem a day / Weekly checkpoints / Interview prep" : "One problem a day / Weekly checkpoints / 100% fee back when you finish"}
        </p>
      </div>

      <header className="border-b border-line/25 bg-card">
        <div className="flex h-15 items-center justify-between gap-4 px-4 sm:px-8 lg:px-20">
          <Link href="/learn" aria-label="Klymb.ai dashboard" className="display inline-flex items-baseline text-lg">
            KLYMB<span className="text-red">.AI</span>
          </Link>
          <div className="flex items-center gap-2">
            <ReminderBell />
            <AccountMenu name={name} email={email} image={image} />
          </div>
        </div>
      </header>
    </>
  );
}
