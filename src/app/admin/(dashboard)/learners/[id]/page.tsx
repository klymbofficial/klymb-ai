import Link from "next/link";
import { notFound } from "next/navigation";
import { PageTitle } from "@/components/admin/PageTitle";
import { StatTile } from "@/components/admin/StatTile";
import { getPmDay } from "@/data/pm-curriculum";
import { tracks } from "@/data/tracks";
import { formatDate } from "@/lib/format";
import { getLearnerDetail } from "@/lib/admin/data";

export default async function LearnerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const learner = await getLearnerDetail((await params).id);
  if (!learner) notFound();

  const trackName = tracks.find((t) => t.slug === learner.track)?.name ?? learner.track;

  return (
    <>
      <PageTitle
        eyebrow={`${trackName} · cohort ${formatDate(learner.cohort_start)}`}
        title={learner.name}
        intro={learner.email}
        actions={<Link href="/admin/learners" className="text-xs font-bold uppercase tracking-wider underline underline-offset-4 hover:text-red-deep">← All learners</Link>}
      />

      <div className="grid gap-0.5 border-2 border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Days submitted" value={learner.days_submitted} hint="of 30" />
        <StatTile label="Checkpoint posts" value={learner.linkedin_posts} hint="of 4 due" tone={learner.linkedin_posts === 0 ? "muted" : "ink"} />
        <StatTile label="Assessments scored" value={learner.assessments_scored} hint="of 4" />
        <StatTile label="Status" value={learner.status} tone={learner.status === "active" ? "ink" : "muted"} />
      </div>

      <section aria-labelledby="evidence" className="mt-8 border-2 border-line bg-paper p-5">
        <h2 id="evidence" className="display text-xl">Evidence accounts</h2>
        <ul className="mt-3 flex flex-wrap gap-6 text-sm">
          <li>
            <span className="block text-[11px] font-extrabold uppercase tracking-[0.14em] text-muted">GitHub</span>
            {learner.github_username
              ? <a href={learner.github_url ?? `https://github.com/${learner.github_username}`} target="_blank" rel="noopener noreferrer" className="font-semibold underline underline-offset-4">{learner.github_username}</a>
              : <span className="font-bold text-red-deep">Not provided</span>}
          </li>
          <li>
            <span className="block text-[11px] font-extrabold uppercase tracking-[0.14em] text-muted">LinkedIn</span>
            {learner.linkedin_slug
              ? <a href={learner.linkedin_url ?? `https://www.linkedin.com/in/${learner.linkedin_slug}`} target="_blank" rel="noopener noreferrer" className="font-semibold underline underline-offset-4">{learner.linkedin_slug}</a>
              : <span className="font-bold text-red-deep">Not provided</span>}
          </li>
        </ul>
      </section>

      <section aria-labelledby="subs" className="mt-8">
        <h2 id="subs" className="display text-2xl">Submissions</h2>
        {learner.submissions.length === 0 ? (
          <p className="mt-3 text-sm text-muted">Nothing submitted yet.</p>
        ) : (
          <ul className="mt-4 flex flex-col gap-4">
            {learner.submissions.map((s) => {
              const day = getPmDay(s.day);
              return (
                <li key={s.day} className="border-2 border-line bg-paper p-5">
                  <div className="flex flex-wrap items-baseline justify-between gap-3 border-b-2 border-line pb-3">
                    <p className="font-extrabold">
                      Day {s.day}
                      <span className="ml-2 font-normal text-muted">{day?.title}</span>
                    </p>
                    <p className="text-xs text-muted nums">
                      {new Date(s.submitted_at).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>

                  <dl className="mt-3 flex flex-col gap-3 text-sm">
                    <div>
                      <dt className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-muted">Deliverable</dt>
                      <dd>
                        {s.deliverable_url
                          ? <a href={s.deliverable_url} target="_blank" rel="noopener noreferrer" className="break-all underline underline-offset-2 hover:text-red-deep">{s.deliverable_url}</a>
                          : <span className="text-muted">No link</span>}
                      </dd>
                    </div>
                    {s.linkedin_post_url && (
                      <div>
                        <dt className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-muted">LinkedIn post</dt>
                        <dd><a href={s.linkedin_post_url} target="_blank" rel="noopener noreferrer" className="break-all underline underline-offset-2 hover:text-red-deep">{s.linkedin_post_url}</a></dd>
                      </div>
                    )}
                    {s.note && (
                      <div>
                        <dt className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-muted">Their notes</dt>
                        <dd className="whitespace-pre-wrap">{s.note}</dd>
                      </div>
                    )}
                    {s.quiz_answers?.some((a) => a?.trim()) && (
                      <div>
                        <dt className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-muted">Knowledge check</dt>
                        <dd>
                          <ol className="mt-1 flex flex-col gap-2">
                            {s.quiz_answers.map((a, i) => (
                              <li key={i}>
                                <span className="block text-xs font-semibold text-muted">{day?.quiz[i] ?? `Question ${i + 1}`}</span>
                                <span className="whitespace-pre-wrap">{a || "-"}</span>
                              </li>
                            ))}
                          </ol>
                        </dd>
                      </div>
                    )}
                  </dl>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </>
  );
}
