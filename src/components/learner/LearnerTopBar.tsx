import { allFree } from "@/data/tracks";
import Image from "next/image";
import Link from "next/link";
import { signOutLearner } from "@/app/(learn)/learn/actions";
import { LearnerNav } from "@/components/learner/LearnerNav";
import { learnerButton } from "@/components/learner/learner-ui";
import { ReminderBell } from "@/components/pwa/ReminderBell";
import { AdminLink } from "@/components/layout/AdminLink";

/** The signed-in bar shared by the dashboard and the day pages: the learner's own links, not the marketing menu. */
export function LearnerTopBar({ name, image, coach = false }: { name: string; image?: string | null; /** Show the voice-coach link: the learner's track has topics to practise. */ coach?: boolean }) {
  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

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

          <div className="flex h-14 items-center gap-3 justify-self-end lg:h-auto">
            <AdminLink className="rounded-md border border-line/50 px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition-colors hover:border-red-deep hover:text-red-deep" />
            <ReminderBell />
            {image ? (
              <Image src={image} alt="" width={28} height={28} className="size-7 rounded-full object-cover" />
            ) : (
              <span aria-hidden="true" className="grid size-7 place-items-center rounded-full bg-surface text-xs font-extrabold">
                {initials || "?"}
              </span>
            )}
            <span className="hidden text-xs font-extrabold uppercase tracking-[0.04em] sm:inline">{name}</span>
            <form action={signOutLearner}>
              <button
                type="submit"
                className={learnerButton("secondary", "ml-1 min-h-9! px-3! py-1.5! text-xs!")}
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>
    </>
  );
}
