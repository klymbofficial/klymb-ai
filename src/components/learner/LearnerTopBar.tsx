import { allFree, getTrack } from "@/data/tracks";
import Image from "next/image";
import Link from "next/link";
import { signOutLearner } from "@/app/(learn)/learn/actions";
import { getCurriculum } from "@/data/curricula";
import { topicsFor } from "@/lib/coach/topics";
import { nextDayFor } from "@/lib/day-lock";
import { ReminderBell } from "@/components/pwa/ReminderBell";
import { AdminLink } from "@/components/layout/AdminLink";

/** Which page is open, so its link reads as current: a day page passes its day number. */
export type LearnerPlace = "dashboard" | "coach" | number;

/**
 * The signed-in bar shared by the dashboard, the day pages and the coach.
 * Its links are the learner's own places, never the sales pages: those would
 * only send an enrolled learner round to /learn again.
 */
export function LearnerTopBar({
  name, image, track, submittedDays = [], current,
}: { name: string; image?: string | null; track?: string; submittedDays?: number[]; current?: LearnerPlace }) {
  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  // The day link only once the track's days exist, and only while one is left to do.
  const curriculum = track && getTrack(track)?.contentLive ? getCurriculum(track) : undefined;
  const today = curriculum ? nextDayFor(submittedDays, curriculum.days.length) : null;
  const links = [
    { label: "Dashboard", href: "/learn", on: current === "dashboard" },
    ...(today ? [{ label: `Today: Day ${today}`, href: `/learn/day/${today}`, on: current === today }] : []),
    ...(track && topicsFor(track).length > 0 ? [{ label: "Voice coach", href: "/learn/coach", on: current === "coach" }] : []),
  ];

  return (
    <>
      <div className="ticker bg-red-strong py-1.5 text-xs font-bold uppercase tracking-[0.06em] text-white sm:text-xs">
        <p className="ticker-track">
          {allFree ? "One problem a day / Weekly checkpoints / Interview prep" : "One problem a day / Weekly checkpoints / 100% fee back when you finish"}
        </p>
      </div>

      <header className="border-b border-line/25 bg-card">
        {/* Equal outer columns keep the nav at the true centre, whatever the
            widths of the wordmark and the account block. On phones the links
            drop to a second row rather than hiding. */}
        <div className="grid grid-cols-[1fr_auto] items-center gap-x-4 px-4 sm:px-8 lg:h-15 lg:grid-cols-[1fr_auto_1fr] lg:px-20">
          <Link href="/learn" aria-label="Klymb.ai dashboard" className="display inline-flex h-15 items-center justify-self-start text-lg lg:h-auto">
            KLYMB<span className="text-red">.AI</span>
          </Link>

          <nav aria-label="Learner" className="col-span-2 row-start-2 -mx-4 overflow-x-auto border-t border-line/25 px-4 sm:-mx-8 sm:px-8 lg:col-span-1 lg:col-start-2 lg:row-start-1 lg:mx-0 lg:border-0 lg:px-0">
            <ul className="flex items-center gap-6 py-2.5 text-sm font-semibold whitespace-nowrap lg:gap-8 lg:py-0">
              {links.map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    aria-current={l.on ? "page" : undefined}
                    className="transition-colors hover:text-red-deep aria-[current=page]:text-red-deep aria-[current=page]:underline aria-[current=page]:underline-offset-8"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div className="col-start-2 row-start-1 flex items-center gap-3 justify-self-end lg:col-start-3">
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
            {/* Quiet on purpose: the page's own next step is the button to see, not this one. */}
            <form action={signOutLearner}>
              <button
                type="submit"
                className="ml-2 rounded-md border border-line/50 px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition-colors hover:border-red-deep hover:text-red-deep"
              >
                Log out
              </button>
            </form>
          </div>
        </div>
      </header>
    </>
  );
}
