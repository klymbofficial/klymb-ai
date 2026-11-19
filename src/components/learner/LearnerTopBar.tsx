import { currentEmail } from "@/auth";
import { KlymbLogo } from "@/components/layout/KlymbLogo";
import { LearnerNav } from "@/components/learner/LearnerNav";
import { ReminderBell } from "@/components/pwa/ReminderBell";
import { AccountMenu } from "./AccountMenu";

/**
 * The learner's frame, shared by the dashboard, the track and day pages, the
 * course reader, the hackathon and the profile.
 *
 * From 1024px it is a sidebar fixed at the left, the way the dashboard on the
 * main platform is laid out: the homepage's climbing wordmark (back to the
 * dashboard), the learner's places, then reminders and the account at the
 * foot. The learner layout makes room for it (see `.learner-shell` in
 * globals.css). `compact` narrows it to icons for pages that need the width
 * for reading: a day, a module.
 *
 * Under 1024px it is a bar across the top with the places on a second row, so
 * none of them hides behind a menu.
 */
export async function LearnerTopBar({
  name, image, coach, compact = false,
}: {
  name: string;
  image?: string | null;
  /** The voice coach of the track on this page, when that track has topics to practise. */
  coach?: string;
  compact?: boolean;
}) {
  const email = await currentEmail();

  return (
    <>
      <aside
        aria-label="Klymb.ai"
        data-rail={compact ? "compact" : "wide"}
        className={`learner-rail fixed inset-y-0 left-0 z-40 hidden flex-col border-r border-ink/10 bg-card lg:flex ${compact ? "w-[72px] items-center px-2" : "w-[248px] px-4"}`}
      >
        <KlymbLogo href="/dashboard" label="Klymb.ai dashboard" short={compact} className={`h-20 shrink-0 ${compact ? "justify-center" : "px-3"}`} />
        <LearnerNav coach={coach} variant="rail" compact={compact} />
        <div className={`mt-auto flex flex-col gap-1 border-t border-ink/10 py-4 ${compact ? "items-center" : ""}`}>
          <ReminderBell placement="above" />
          <AccountMenu name={name} email={email} image={image} placement="up" compact={compact} />
        </div>
      </aside>

      <header className="border-b border-ink/15 bg-paper lg:hidden">
        <div className="mx-auto grid w-full max-w-[1280px] grid-cols-[1fr_auto] items-center gap-x-6 px-4 sm:px-8">
          <KlymbLogo href="/dashboard" label="Klymb.ai dashboard" className="h-14 justify-self-start" />
          <div className="flex h-14 items-center gap-1 justify-self-end">
            <ReminderBell />
            <AccountMenu name={name} email={email} image={image} />
          </div>
          <LearnerNav coach={coach} variant="bar" />
        </div>
      </header>
    </>
  );
}
