import Link from "next/link";
import { EmptyState } from "@/components/admin/EmptyState";
import { PageTitle } from "@/components/admin/PageTitle";
import { RangeTabs } from "@/components/admin/RangeTabs";
import { StatTile } from "@/components/admin/StatTile";
import { BarList } from "@/components/charts/BarList";
import { FunnelBars } from "@/components/charts/FunnelBars";
import { rangeDays, RANGES } from "@/lib/admin/analytics";
import { requireAdmin } from "@/lib/admin/auth";
import { getSdAnalytics, getSdLearner } from "@/lib/admin/system-design";

const when = (iso: string) => new Date(iso).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
const dayName = (lesson: string | null) => (lesson === "0-0" ? "Day 0" : lesson === "1-0" ? "Day 1" : lesson ?? "");
const pct = (a: number, b: number) => (b ? `${Math.round((a / b) * 100)}%` : "–");

function Panel({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) {
  return (
    <section className="card p-5">
      <h2 className="display text-xl">{title}</h2>
      {note && <p className="mt-1 text-xs text-muted">{note}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

/** One learner's whole trail through the course, oldest first. */
async function LearnerTrail({ anon }: { anon: string }) {
  const events = await getSdLearner(anon);
  const who = events.find((e) => e.email)?.email ?? `Anonymous ${anon.slice(0, 8)}`;
  return (
    <>
      <PageTitle eyebrow="System Design · one learner" title={who} intro={`${events.length} events. Times are IST.`} actions={<Link href="/admin/system-design" className="rounded-lg border border-line/50 px-3 py-1.5 text-xs font-bold hover:bg-ink hover:text-paper">Back to all learners</Link>} />
      {!events.length ? (
        <EmptyState title="Nothing recorded" body="This learner has no activity in the course." />
      ) : (
        <ol className="card divide-y divide-line/25 overflow-hidden">
          {events.map((e, i) => {
            const p = e.props ?? {};
            const detail =
              e.event === "step_done" && (e.step === "pre" || e.step === "post") ? `score ${p.score}/${p.of}` :
              e.event === "step_done" && e.step === "est" ? `${p.inRange}/${p.of} estimates in range (${p.vals})` :
              e.event === "step_done" && e.step === "built" ? `${p.wrong} wrong drops` :
              e.event === "step_done" && e.step === "design" ? `${p.chars} characters written` :
              e.event === "step_done" && e.step === "follow" ? `had ${p.covered}/${p.of} covered` :
              e.event === "video_progress" ? `${p.pct}% of the video` :
              e.event === "ping" ? `on ${e.step}, video at ${p.t}s` :
              e.event === "screen" ? String(p.screen ?? "") :
              Object.entries(p).map(([k, v]) => `${k}: ${v}`).join(", ");
            return (
              <li key={i} className="grid grid-cols-[120px_90px_1fr] gap-3 px-5 py-2.5 text-sm max-sm:grid-cols-[1fr_auto]">
                <span className="text-muted">{when(e.created_at)}</span>
                <span className="font-bold">{dayName(e.lesson)}</span>
                <span className="max-sm:col-span-2"><b>{e.event === "step_done" ? `Finished ${e.step}` : e.event.replace("_", " ")}</b> {detail && <span className="text-muted">· {detail}</span>}</span>
              </li>
            );
          })}
        </ol>
      )}
    </>
  );
}

export default async function AdminSystemDesignPage({ searchParams }: { searchParams: Promise<{ range?: string; learner?: string }> }) {
  await requireAdmin();
  const { range, learner } = await searchParams;
  if (learner) return <LearnerTrail anon={learner} />;

  const days = rangeDays(range);
  const data = await getSdAnalytics(days);
  const title = (
    <PageTitle
      eyebrow="Course activity"
      title="System Design"
      intro="Everything learners do in the System Design course: who opened what, which steps they finished, how they answered, where they stopped, and what they told us."
      actions={<RangeTabs param="range" current={range ?? "30d"} options={RANGES.map((r) => ({ key: r.key, label: r.label }))} />}
    />
  );

  if (!data.ok) {
    return (
      <>
        {title}
        <EmptyState
          title={data.reason === "no-table" ? "Activity tables aren't set up yet" : "Database not connected"}
          body={data.reason === "no-table" ? "Run supabase/migrations/20261023000000_system_design_activity.sql in the Supabase SQL editor once. Activity starts recording right after." : "Supabase isn't configured for this environment."}
        />
      </>
    );
  }
  const t = data.totals;

  return (
    <>
      {title}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <StatTile label="Visitors" value={t.visitors} hint={`Last ${days} days, one per browser`} />
        <StatTile label="Started a day" value={t.started} hint={pct(t.started, t.visitors) + " of visitors"} />
        <StatTile label="Finished a day" value={t.completedAny} hint={pct(t.completedAny, t.started) + " of starters"} tone="red" />
        <StatTile label="Signed in" value={t.signedIn} hint="Visitors we know by email" />
        <StatTile label="Rating" value={t.avgRating ?? "–"} hint={`${t.feedback} feedback`} />
      </div>

      {data.lessons.map((l) => (
        <div key={l.id} className="mt-10 flex flex-col gap-6">
          <h2 className="display text-3xl">Day {l.day} · {l.app}</h2>
          <div className="grid gap-6 lg:grid-cols-2">
            <Panel title="Step by step" note="People who reached each step. The biggest fall is the step to fix first.">
              <FunnelBars steps={l.funnel} />
            </Panel>
            <div className="flex flex-col gap-6">
              <Panel title="Where people stopped" note="Last step seen for everyone who hasn't finished the day.">
                <BarList rows={l.stoppedAt} unit="people" emptyLabel="Nobody stuck yet." />
              </Panel>
              <Panel title="Minutes per step" note="Average time on each step, per person who spent time there.">
                <BarList rows={l.time} unit="min" emptyLabel="No time recorded yet." />
              </Panel>
            </div>
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            <Panel title="Video watch-through">
              <FunnelBars steps={l.video} />
            </Panel>
            <Panel title="Feedback" note={l.feedback.count ? `${l.feedback.count} responses · average ${l.feedback.avg} of 5` : "No feedback yet."}>
              <div className="grid gap-6 sm:grid-cols-2">
                <BarList rows={l.feedback.ratings} unit="people" />
                <div className="flex flex-col gap-4">
                  <div><p className="mb-2 text-xs font-extrabold uppercase tracking-[0.14em] text-muted">Explained easily?</p><BarList rows={l.feedback.clarity} unit="" emptyLabel="–" /></div>
                  <div><p className="mb-2 text-xs font-extrabold uppercase tracking-[0.14em] text-muted">Will finish the course?</p><BarList rows={l.feedback.willFinish} unit="" emptyLabel="–" /></div>
                </div>
              </div>
            </Panel>
          </div>
          <Panel title="Questions" note="Latest answer per learner. A low score means the question or the teaching needs work.">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead className="text-xs uppercase tracking-[0.1em] text-muted"><tr><th className="py-2 pr-3">Question</th><th className="py-2 pr-3">Answered</th><th className="py-2 pr-3">Right</th><th className="py-2">Most common wrong answer</th></tr></thead>
                <tbody className="divide-y divide-line/25">
                  {l.answers.map((a) => (
                    <tr key={a.id} className="align-top">
                      <td className="py-2.5 pr-3"><span className="text-xs font-bold text-muted">{a.kind}</span><br />{a.prompt}</td>
                      <td className="nums py-2.5 pr-3">{a.answered}</td>
                      <td className="nums py-2.5 pr-3 font-extrabold">{pct(a.right, a.answered)}</td>
                      <td className="py-2.5 text-muted">{a.topWrong ? `${a.topWrong.label} (${a.topWrong.value})` : "–"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
          {l.estimates.length > 0 && (
            <Panel title="Estimates" note="Share of learners within the tolerance of the answer.">
              <ul className="flex flex-col gap-2 text-sm">
                {l.estimates.map((e) => <li key={e.prompt} className="flex justify-between gap-3"><span>{e.prompt} <span className="text-muted">(≈ {e.answer.toLocaleString("en-IN")} {e.unit})</span></span><b className="nums">{pct(e.inRange, e.answered)} of {e.answered}</b></li>)}
              </ul>
            </Panel>
          )}
        </div>
      ))}

      <div className="mt-10 grid gap-6 lg:grid-cols-3">
        <Panel title="Language"><BarList rows={data.lang} unit="people" /></Panel>
        <Panel title="Device"><BarList rows={data.device} unit="people" /></Panel>
        <Panel title="Pages they visit" note="Screens opened inside the course."><BarList rows={data.screens} unit="views" /></Panel>
        <Panel title="Welcome screen"><BarList rows={data.welcome} unit="people" /></Panel>
        <Panel title="Kamran’s tour"><BarList rows={data.tour} unit="people" /></Panel>
        <Panel title="Google sign-in clicks" note="Where people chose to sign in."><BarList rows={data.signins} unit="clicks" emptyLabel="No sign-in clicks yet." /></Panel>
        <Panel title="Other"><ul className="flex flex-col gap-2 text-sm"><li>Turned subtitles off: <b>{data.subsOff}</b></li><li>LinkedIn shares and image downloads: <b>{data.shares}</b></li></ul></Panel>
      </div>

      <div className="mt-10">
        <Panel title="What learners say we should improve" note="Newest first.">
          {data.comments.length ? (
            <ul className="divide-y divide-line/25">
              {data.comments.map((c, i) => (
                <li key={i} className="py-3 text-sm">
                  <p className="whitespace-pre-wrap">{c.improve}</p>
                  <p className="mt-1 text-xs text-muted">{dayName(c.lesson)} · {c.rating}★ · {c.email ?? "anonymous"} · {when(c.created_at)}</p>
                </li>
              ))}
            </ul>
          ) : <p className="text-sm text-muted">No comments yet.</p>}
        </Panel>
      </div>

      <div className="mt-10">
        <Panel title="Learners" note="Everyone who opened the course, most recent first. Open one to see their whole trail.">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="text-xs uppercase tracking-[0.1em] text-muted"><tr><th className="py-2 pr-3">Learner</th><th className="py-2 pr-3">Where they are</th><th className="py-2 pr-3">Days done</th><th className="py-2 pr-3">Steps</th><th className="py-2 pr-3">Minutes</th><th className="py-2 pr-3">Device</th><th className="py-2">Last seen</th></tr></thead>
              <tbody className="divide-y divide-line/25">
                {data.learners.slice(0, 200).map((l) => (
                  <tr key={l.anon}>
                    <td className="py-2.5 pr-3"><Link className="font-bold underline underline-offset-4" href={`/admin/system-design?learner=${l.anon}`}>{l.email ?? `Anonymous ${l.anon.slice(0, 8)}`}</Link></td>
                    <td className="py-2.5 pr-3">{l.where}</td>
                    <td className="py-2.5 pr-3">{l.done.map(dayName).join(", ") || "–"}</td>
                    <td className="nums py-2.5 pr-3">{l.stepsDone}</td>
                    <td className="nums py-2.5 pr-3">{l.minutes}</td>
                    <td className="py-2.5 pr-3">{l.device ?? "–"}{l.lang ? ` · ${l.lang === "hi" ? "Hinglish" : "English"}` : ""}</td>
                    <td className="py-2.5 text-muted">{when(l.last)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!data.learners.length && <p className="py-6 text-center text-sm text-muted">No activity yet in this window.</p>}
          </div>
        </Panel>
      </div>
    </>
  );
}
