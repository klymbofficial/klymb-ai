import { allFree } from "@/data/tracks";
import Link from "next/link";
import { currentEmail } from "@/auth";
import { LearnerNav } from "@/components/learner/LearnerNav";
import { ReminderBell } from "@/components/pwa/ReminderBell";
import { AccountMenu } from "./AccountMenu";

/**
 * The signed-in bar shared by the dashboard, the track page, the day pages and
 * the coach: the wordmark, which is the way back to the dashboard, the
 * learner's own links rather than the marketing menu, and the account menu.
 */
export async function LearnerTopBar({
  name, image, coach,
}: {
  name: string;
  image?: string | null;
  /** The voice coach of the track on this page, when that track has topics to practise. */
  coach?: string;
}) {
  const email = await currentEmail();

  return (
    <>
      <div className="ticker bg-red-strong py-1.5 text-xs font-bold uppercase tracking-[0.06em] text-white sm:text-xs">
        <p className="ticker-track">
          {allFree ? "One problem a day / Weekly checkpoints / Interview prep" : "One problem a day / Weekly checkpoints / 100% fee back when you finish"}
        </p>
      </div>

      <header className="border-b border-line/25 bg-card">
        {/* Equal outer columns keep the nav at the true centre, whatever the
            widths of the wordmark and the account block. */}
        <div className="grid grid-cols-[1fr_auto] items-center gap-x-4 px-4 sm:px-8 lg:h-15 lg:grid-cols-[1fr_auto_1fr] lg:px-20">
          <Link href="/learn" aria-label="Klymb.ai dashboard" className="display inline-flex h-14 items-center justify-self-start text-lg lg:h-auto">
            KLYMB<span className="text-red">.AI</span>
          </Link>

          <LearnerNav coach={coach} />

          <div className="flex h-14 items-center gap-2 justify-self-end lg:h-auto">
            <ReminderBell />
            <AccountMenu name={name} email={email} image={image} />
          </div>
        </div>
      </header>
    </>
  );
}
