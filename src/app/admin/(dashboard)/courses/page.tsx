import Link from "next/link";
import { PageTitle } from "@/components/admin/PageTitle";
import { requireAdmin } from "@/lib/admin/auth";
import { getCurriculum } from "@/data/curricula";
import { allTracks } from "@/data/tracks";

/** Every track's 30 days, opened exactly as a learner sees them, all unlocked and read-only. */
export default async function AdminCoursesPage() {
  await requireAdmin();
  const tracks = allTracks.filter((t) => t.contentLive && getCurriculum(t.slug));

  return (
    <>
      <PageTitle
        eyebrow="Content"
        title="Course preview"
        intro="Open any day of any track as a learner sees it. Every day is unlocked, nothing can be submitted, and your own progress isn't touched."
      />
      <div className="grid gap-4 md:grid-cols-2">
        {tracks.map((t) => {
          const days = getCurriculum(t.slug)!.days;
          return (
            <section key={t.slug} className="card p-5">
              <div className="flex items-baseline justify-between gap-3">
                <h2 className="display text-xl">{t.name}</h2>
                <Link href={`/learn/day/1?track=${t.slug}`} className="text-sm font-bold text-red-deep underline underline-offset-2">Open Day 1 →</Link>
              </div>
              {t.listed === false && <p className="mt-1 text-xs text-muted">Invite-only: hidden from the public site.</p>}
              <ol className="mt-4 grid grid-cols-6 gap-1.5 sm:grid-cols-10">
                {days.map((d) => (
                  <li key={d.day}>
                    <Link
                      href={`/learn/day/${d.day}?track=${t.slug}`}
                      title={`Day ${d.day}: ${d.title}`}
                      className={`grid h-9 place-items-center rounded-md text-sm font-bold transition-colors ${d.kind === "build" ? "bg-surface hover:bg-red-tint" : "bg-red-strong text-white hover:bg-red-press"}`}
                    >
                      {d.day}
                    </Link>
                  </li>
                ))}
              </ol>
            </section>
          );
        })}
      </div>
    </>
  );
}
