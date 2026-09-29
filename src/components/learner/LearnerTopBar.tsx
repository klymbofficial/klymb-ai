import Image from "next/image";
import Link from "next/link";
import { signOutLearner } from "@/app/(learn)/learn/actions";
import { cohort } from "@/data/config";
import { navLinks } from "@/data/program";
import { formatDate } from "@/lib/format";

/** The signed-in bar shared by the dashboard and the day pages. */
export function LearnerTopBar({ name, image }: { name: string; image?: string | null }) {
  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  return (
    <>
      <div className="ticker bg-red-strong py-1.5 text-[10px] font-bold uppercase tracking-[0.06em] text-white sm:text-[11px]">
        <p className="ticker-track">
          Next cohort starts {formatDate(cohort.startDate)} / Enrollment closes {formatDate(cohort.enrollmentDeadline)}
          {cohort.enrollmentDeadlineIsPlaceholder && " (date TBC)"}
        </p>
      </div>

      <header className="border-b border-line/25 bg-card">
        {/* Equal outer columns keep the nav at the true centre, whatever the
            widths of the wordmark and the account block. */}
        <div className="grid h-15 grid-cols-[1fr_auto] items-center gap-4 px-4 sm:px-8 lg:grid-cols-[1fr_auto_1fr] lg:px-20">
          <Link href="/learn" aria-label="Klymb.ai dashboard" className="display inline-flex items-baseline justify-self-start text-lg">
            KLYMB<span className="text-red">.AI</span>
          </Link>

          <nav aria-label="Primary" className="hidden lg:block">
            <ul className="flex items-center gap-8 text-sm font-semibold">
              {navLinks.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="transition-colors hover:text-red-deep">{l.label}</Link>
                </li>
              ))}
            </ul>
          </nav>

          <div className="flex items-center gap-3 justify-self-end">
            {image ? (
              <Image src={image} alt="" width={28} height={28} className="size-7 rounded-full object-cover" />
            ) : (
              <span aria-hidden="true" className="grid size-7 place-items-center rounded-full bg-surface text-[10px] font-extrabold">
                {initials || "?"}
              </span>
            )}
            <span className="hidden text-xs font-extrabold uppercase tracking-[0.04em] sm:inline">{name}</span>
            <form action={signOutLearner}>
              <button
                type="submit"
                className="ml-2 rounded-md bg-red-strong px-4 py-2 text-[11px] font-bold uppercase tracking-wider text-white transition-colors hover:bg-red-press"
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
