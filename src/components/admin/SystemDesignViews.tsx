import clsx from "clsx";
import { BarList } from "@/components/charts/BarList";
import type { SdAnalytics } from "@/lib/admin/system-design";

export const pct = (a: number, b: number) => (b ? `${Math.round((a / b) * 100)}%` : "–");

export function Panel({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) {
  return (
    <section className="card p-5">
      <h2 className="display text-xl">{title}</h2>
      {note && <p className="mt-1 text-xs text-muted">{note}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

export type Data = Extract<SdAnalytics, { ok: true }>;
type Lesson = Data["lessons"][number];

/** The step with the biggest fall from the one before it: where to look first. */
function biggestDrop(l: Lesson) {
  let best: { at: number; lost: number } | null = null;
  l.funnel.forEach((st, i) => {
    if (!i) return;
    const lost = l.funnel[i - 1].value - st.value;
    if (lost > 0 && (!best || lost > best.lost)) best = { at: i, lost };
  });
  return best as { at: number; lost: number } | null;
}

const SAID: Record<string, string> = { yes: "Yes", mostly: "Mostly", no: "No", maybe: "Maybe" };
const said = (rows: { label: string; value: number }[]) => rows.map((x) => `${SAID[x.label] ?? x.label}: ${x.value}`).join(" · ") || "–";

/** A verdict on a question or estimate: is it working as teaching? */
function verdict(right: number, answered: number) {
  if (answered < 3) return { label: "Too few answers", tone: "muted" as const };
  const r = right / answered;
  if (r < 0.5) return { label: "Needs work", tone: "red" as const };
  if (r >= 0.8) return { label: "Easy", tone: "ok" as const };
  return { label: "About right", tone: "ink" as const };
}

export function Chip({ tone, children }: { tone: "red" | "ok" | "ink" | "muted"; children: React.ReactNode }) {
  return (
    <span className={clsx("inline-block whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-extrabold uppercase tracking-wider", {
      "bg-red/10 text-red": tone === "red",
      "bg-ink text-paper": tone === "ok",
      "bg-surface text-ink": tone === "ink",
      "bg-surface text-muted": tone === "muted",
    })}>{children}</span>
  );
}

/** The headline facts as sentences, so the page can be read without decoding charts. */
export function PlainWords({ data, days }: { data: Data; days: number }) {
  const t = data.totals;
  const lines: string[] = [];
  lines.push(`In the last ${days} days, ${t.visitors} ${t.visitors === 1 ? "person" : "people"} opened the course. ${t.started} pressed Start on a day and ${t.completedAny} finished one. ${t.signedIn} signed in with Google.`);
  if (data.overview.played) lines.push(`Overview video: ${data.overview.played} played it, ${data.overview.finished} watched to the end.`);
  for (const l of data.lessons) {
    const opened = l.funnel[0].value;
    if (!opened) { lines.push(`Day ${l.day} (${l.app}): nobody has opened it yet.`); continue; }
    const done = l.funnel[l.funnel.length - 1].value;
    const drop = biggestDrop(l);
    lines.push(`Day ${l.day} (${l.app}): ${opened} opened it, ${done} finished it.${drop ? ` The biggest drop is before “${l.funnel[drop.at].label}”: ${drop.lost} ${drop.lost === 1 ? "person stopped" : "people stopped"} there.` : ""}`);
  }
  const hardest = data.lessons.flatMap((l) => l.answers.filter((a) => a.answered > 0).map((a) => ({ ...a, day: l.day }))).sort((a, b) => a.right / a.answered - b.right / b.answered)[0];
  if (hardest) lines.push(`Hardest question so far (Day ${hardest.day}): “${hardest.prompt}”, ${Math.round((hardest.right / hardest.answered) * 100)}% got it right${hardest.answered < 3 ? ` (only ${hardest.answered} ${hardest.answered === 1 ? "answer" : "answers"} so far, so too early to judge)` : ""}.`);
  const fb = data.lessons.reduce((n, l) => n + l.feedback.count, 0);
  if (fb) {
    const yes = data.lessons.reduce((n, l) => n + (l.feedback.willFinish.find((x) => x.label === "yes")?.value ?? 0), 0);
    lines.push(`Feedback: ${fb} ${fb === 1 ? "response" : "responses"}, average ${t.avgRating} out of 5. ${yes} said they’ll finish the whole course.${data.comments.length ? ` ${data.comments.length} left a comment (below).` : ""}`);
  } else lines.push("No feedback yet. It’s asked at the end of each day.");
  return (
    <section className="card p-5">
      <h2 className="display text-xl">In plain words</h2>
      <ul className="mt-3 flex list-disc flex-col gap-2 pl-5 text-[15px] leading-relaxed">{lines.map((l) => <li key={l}>{l}</li>)}</ul>
    </section>
  );
}

/** How far people get through one day: each step, with the biggest drop called out. */
function Journey({ l }: { l: Lesson }) {
  const first = Math.max(1, l.funnel[0].value);
  const drop = biggestDrop(l);
  return (
    <ol className="flex flex-col gap-1.5">
      {l.funnel.map((st, i) => (
        <li key={st.label}>
          <div className="grid grid-cols-[150px_1fr_36px] items-center gap-3 text-sm max-sm:grid-cols-[110px_1fr_30px]">
            <span className={clsx("truncate", st.value ? "font-bold" : "text-muted")}>{st.label}</span>
            <span className="h-3 overflow-hidden rounded-full bg-surface"><span className={clsx("block h-3 rounded-full", drop?.at === i ? "bg-red" : "bg-ink")} style={{ width: `${(st.value / first) * 100}%` }} /></span>
            <span className="nums text-right font-extrabold">{st.value}</span>
          </div>
          {drop?.at === i && <p className="mt-0.5 ml-[162px] text-xs font-bold text-red max-sm:ml-0">↑ Biggest drop: {drop.lost} stopped before this step</p>}
        </li>
      ))}
    </ol>
  );
}

export function DayView({ l }: { l: Lesson }) {
  const v = l.video;
  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        <Panel title="How far people get" note="Each step of the day, in order. Red marks the step where most people stopped.">
          <Journey l={l} />
        </Panel>
        <div className="flex flex-col gap-6">
          <Panel title="Where they’re stuck" note="The step each unfinished learner was on last.">
            <BarList rows={l.stoppedAt} unit="people" emptyLabel="Nobody stuck right now." />
          </Panel>
          <Panel title="Time on each step" note="Average minutes per person.">
            <BarList rows={l.time} unit="min" emptyLabel="No time recorded yet." />
          </Panel>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Video" note={`Of ${v[0].value || 0} who started the video, how many reached each point.`}>
          <div className="grid grid-cols-4 gap-2 text-center">
            {v.map((m) => (
              <div key={m.label} className="rounded-lg bg-surface p-3">
                <p className="display nums text-2xl">{m.value}</p>
                <p className="text-xs text-muted">{m.label.replace(" of the video", "")}</p>
              </div>
            ))}
          </div>
        </Panel>
        <Panel title="Feedback for this day" note={l.feedback.count ? `${l.feedback.count} ${l.feedback.count === 1 ? "response" : "responses"} · average ${l.feedback.avg} of 5` : "No feedback for this day yet."}>
          {l.feedback.count ? (
            <dl className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-lg bg-surface p-3"><dt className="text-xs text-muted">Rating</dt><dd className="display nums text-2xl">{l.feedback.avg}<span className="text-sm text-muted"> /5</span></dd></div>
              <div className="rounded-lg bg-surface p-3"><dt className="text-xs text-muted">Explained easily</dt><dd className="text-sm font-extrabold">{said(l.feedback.clarity)}</dd></div>
              <div className="rounded-lg bg-surface p-3"><dt className="text-xs text-muted">Will finish</dt><dd className="text-sm font-extrabold">{said(l.feedback.willFinish)}</dd></div>
            </dl>
          ) : <p className="text-sm text-muted">It’s asked at the end of the day.</p>}
        </Panel>
      </div>

      <Panel title="Questions" note="Is each question teaching well? “Needs work” means under half got it right: fix the question or the explanation before it.">
        <ul className="divide-y divide-line/25">
          {l.answers.map((a) => {
            const vd = verdict(a.right, a.answered);
            return (
              <li key={a.id} className="grid gap-2 py-3 text-sm sm:grid-cols-[1fr_140px]">
                <div>
                  <p className="text-xs font-bold text-muted">{a.kind}</p>
                  <p>{a.prompt}</p>
                  {a.topWrong && <p className="mt-1 text-xs text-muted">Most picked wrong answer: “{a.topWrong.label}” ({a.topWrong.value})</p>}
                </div>
                <div className="flex flex-col items-start gap-1 sm:items-end">
                  <Chip tone={vd.tone}>{vd.label}</Chip>
                  <span className="text-xs text-muted">{a.answered ? `${pct(a.right, a.answered)} right of ${a.answered}` : "No answers yet"}</span>
                </div>
              </li>
            );
          })}
        </ul>
      </Panel>

      {l.estimates.length > 0 && (
        <Panel title="Estimates" note="How many got the number roughly right.">
          <ul className="divide-y divide-line/25">
            {l.estimates.map((e) => {
              const vd = verdict(e.inRange, e.answered);
              return (
                <li key={e.prompt} className="grid gap-2 py-3 text-sm sm:grid-cols-[1fr_140px]">
                  <p>{e.prompt} <span className="text-muted">(answer ≈ {e.answer.toLocaleString("en-IN")} {e.unit})</span></p>
                  <div className="flex flex-col items-start gap-1 sm:items-end"><Chip tone={vd.tone}>{vd.label}</Chip><span className="text-xs text-muted">{e.answered ? `${pct(e.inRange, e.answered)} close of ${e.answered}` : "No answers yet"}</span></div>
                </li>
              );
            })}
          </ul>
        </Panel>
      )}
    </div>
  );
}

