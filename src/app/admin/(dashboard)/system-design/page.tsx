import Link from "next/link";
import { EmptyState } from "@/components/admin/EmptyState";
import { PageTitle } from "@/components/admin/PageTitle";
import { RangeTabs } from "@/components/admin/RangeTabs";
import { StatTile } from "@/components/admin/StatTile";
import { BarList } from "@/components/charts/BarList";
import { rangeDays, RANGES } from "@/lib/admin/analytics";
import { requireAdmin } from "@/lib/admin/auth";
import { lessonDay } from "@/lib/course-app";
import { getOfferFunnel, getSdAnalytics, getSdLearner } from "@/lib/admin/system-design";
import { trailLines, type Tone } from "@/lib/admin/sd-event-words";
import { Chip, DayView, Panel, PlainWords, pct } from "@/components/admin/SystemDesignViews";
import { WhatsAppAnnounce } from "@/components/admin/WhatsAppAnnounce";
import { announcementStatus } from "@/lib/sd-community";
import { SD_WHATSAPP_PUSH } from "@/lib/sd-whatsapp-announce";

// The WhatsApp announcement sends one email at a time from this page's action.
export const maxDuration = 300;

const when = (iso: string) => new Date(iso).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
const dayName = (lesson: string | null) => (lesson && /^\d+-\d+$/.test(lesson) ? lessonDay(lesson) : lesson ?? "");

const FUNNEL_WORDS: Record<string, string> = {
  view: "Opened the offer", form_start: "Started the form", claim: "Tapped Claim", blocked: "Told to leave the app", open_browser: "Tapped Open in browser", google: "Sent to Google",
  order_failed: "Order failed", rzp_open: "Razorpay opened", rzp_closed: "Closed Razorpay", rzp_failed: "Payment failed", paid: "Paid",
};

const TONE: Record<Tone, string> = { learn: "bg-sky-500", win: "bg-emerald-500", miss: "bg-red-500", nav: "bg-line", setting: "bg-amber-500" };

/** One learner's whole trail through the course, oldest first. */
async function LearnerTrail({ anon }: { anon: string }) {
  const events = await getSdLearner(anon);
  const who = events.find((e) => e.email)?.email ?? `Anonymous ${anon.slice(0, 8)}`;
  return (
    <>
      <PageTitle eyebrow="System Design · one learner" title={who} intro="Everything they did, oldest first. Green = a win, red = a miss, blue = learning, grey = moving around. Times are IST." actions={<Link href="/admin/system-design" className="rounded-lg border border-line/50 px-3 py-1.5 text-xs font-bold hover:bg-ink hover:text-paper">Back to all learners</Link>} />
      {!events.length ? (
        <EmptyState title="Nothing recorded" body="This learner has no activity in the course." />
      ) : (
        <ol className="card divide-y divide-line/25 overflow-hidden">
          {trailLines(events).map((l, i) => (
            <li key={i} className="grid grid-cols-[150px_70px_1fr] items-baseline gap-3 px-5 py-2.5 text-sm max-sm:grid-cols-[1fr_auto]">
              <span className="text-muted">{when(l.at)}{l.until && when(l.until) !== when(l.at) ? ` – ${when(l.until).split(", ").pop()}` : ""}</span>
              <span className="font-bold">{dayName(l.lesson === "overview" ? null : l.lesson)}</span>
              <span className="flex items-baseline gap-2 max-sm:col-span-2">
                <span aria-hidden className={`size-2 shrink-0 translate-y-[-1px] rounded-full ${TONE[l.tone]}`} />
                <span><span className={l.tone === "nav" ? "text-muted" : "font-semibold"}>{l.text}</span>{l.detail && <span className="text-muted"> · {l.detail}</span>}</span>
              </span>
            </li>
          ))}
        </ol>
      )}
    </>
  );
}

export default async function AdminSystemDesignPage({ searchParams }: { searchParams: Promise<{ range?: string; learner?: string; day?: string; all?: string; q?: string }> }) {
  const admin = await requireAdmin();
  const { range, learner, day, all, q: rawQ } = await searchParams;
  const q = (rawQ ?? "").trim().toLowerCase().slice(0, 100);
  const showAll = all === "1";
  if (learner) return <LearnerTrail anon={learner} />;

  const days = rangeDays(range);
  const [data, funnel, announce] = await Promise.all([getSdAnalytics(days), getOfferFunnel(days), admin.owner ? announcementStatus() : null]);
  const title = (
    <PageTitle
      eyebrow="Course activity"
      title="System Design"
      intro="Who is taking the course, how far they get, which questions trip them up, and what they tell us."
      actions={<RangeTabs param="range" current={range ?? "30d"} options={RANGES.map((r) => ({ key: r.key, label: r.label }))} />}
    />
  );

  if (!data.ok) {
    return (
      <>
        {title}
        <EmptyState
          title={data.reason === "no-table" ? "Activity tables aren't set up yet" : "Database not connected"}
          body={data.reason === "no-table" ? "Run the System Design activity migration in the Neon SQL editor once. Activity starts recording right after." : "DATABASE_URL isn't set for this environment."}
        />
      </>
    );
  }
  const t = data.totals;
  // Days people have actually opened get tabs; the rest are summed up in "In plain words".
  const openedDays = data.lessons.filter((l) => l.funnel[0].value > 0);
  const dayTabs = openedDays.length ? openedDays : data.lessons;
  const lesson = data.lessons.find((l) => l.id === day) ?? dayTabs[0];
  const SHOWN = 25;
  // A search looks through every learner in the window, not only the ones shown.
  const found = q ? data.learners.filter((l) => (l.email ?? "").toLowerCase().includes(q) || l.anon.toLowerCase().includes(q)) : data.learners;
  const learners = showAll || q ? found.slice(0, 500) : found.slice(0, SHOWN);
  const opened = funnel.find((r) => r.step === "view");
  const openedTotal = (opened?.inApp ?? 0) + (opened?.browser ?? 0);
  const keep = (extra: Record<string, string>) => {
    const q = new URLSearchParams({ ...(range ? { range } : {}), ...(day ? { day } : {}), ...extra });
    return `/admin/system-design?${q}`;
  };

  return (
    <>
      {title}

      {/* The headline numbers first. */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <StatTile label="Opened the course" value={t.visitors} hint={`Last ${days} days`} />
        <StatTile label="Started a day" value={t.started} hint={`${pct(t.started, t.visitors)} of them`} />
        <StatTile label="Finished a day" value={t.completedAny} hint={`${pct(t.completedAny, t.started)} of starters`} tone="red" />
        <StatTile label="Signed in" value={t.signedIn} hint="Known by email" />
        <StatTile label="Rating" value={t.avgRating ?? "–"} hint={`${t.feedback} ${t.feedback === 1 ? "response" : "responses"}`} />
      </div>

      <nav aria-label="On this page" className="mt-5 flex flex-wrap gap-2 text-xs font-bold">
        {[["learners", "Learners"], ["day", "Day by day"], ["said", "What they said"], ["funnel", "Offer funnel"], ...(announce ? [["announce", "WhatsApp group"]] : []), ["more", "More detail"]].map(([id, label]) => (
          <a key={id} href={`#${id}`} className="rounded-full border border-line/50 bg-white px-3 py-1.5 hover:bg-ink hover:text-paper">{label}</a>
        ))}
      </nav>

      <div className="mt-6"><PlainWords data={data} days={days} /></div>

      <div id="learners" className="mt-8 scroll-mt-6">
        <Panel title="Who’s taking the course" note={q ? `${found.length} ${found.length === 1 ? "learner matches" : "learners match"} “${q}”. Click a name to see everything they did, step by step.` : `Most recent first. Click a name to see everything they did, step by step.${data.learners.length > SHOWN && !showAll ? ` Showing the latest ${SHOWN} of ${data.learners.length}.` : ""}`}>
          <form method="get" action="/admin/system-design#learners" role="search" className="mb-3 flex flex-wrap items-center gap-2">
            {range && <input type="hidden" name="range" value={range} />}
            {day && <input type="hidden" name="day" value={day} />}
            <input name="q" type="search" defaultValue={rawQ ?? ""} placeholder="Search by email" aria-label="Search learners by email" autoComplete="off" spellCheck={false} className="w-full max-w-xs rounded-lg border border-line/50 bg-white px-3 py-1.5 text-sm focus:border-ink focus:outline-none" />
            <button type="submit" className="rounded-lg border border-line/50 px-3 py-1.5 text-xs font-bold hover:bg-ink hover:text-paper">Search</button>
            {q && <Link href={`${keep({})}#learners`} className="text-xs font-bold text-muted underline underline-offset-4">Clear</Link>}
          </form>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-left text-sm">
              <thead className="text-xs uppercase tracking-[0.1em] text-muted"><tr><th className="py-2 pr-3">Learner</th><th className="py-2 pr-3">Right now</th><th className="py-2 pr-3">Finished</th><th className="py-2 pr-3">Time spent</th><th className="py-2 pr-3">On</th><th className="py-2">Last seen</th></tr></thead>
              <tbody className="divide-y divide-line/25">
                {learners.map((l) => (
                  <tr key={l.anon}>
                    <td className="py-2.5 pr-3"><Link className="font-bold underline underline-offset-4" href={`/admin/system-design?learner=${l.anon}`}>{l.email ?? <span className="font-semibold text-muted">Anonymous · {l.anon.slice(0, 6)}</span>}</Link></td>
                    <td className="py-2.5 pr-3">{l.where === "Browsing" ? <span className="text-muted">Just looking around</span> : l.where}</td>
                    <td className="py-2.5 pr-3">{l.done.length ? <span className="flex flex-wrap gap-1">{l.done.map((d) => <Chip key={d} tone="ok">{dayName(d)}</Chip>)}</span> : <span className="text-muted">–</span>}</td>
                    <td className="nums py-2.5 pr-3">{l.minutes ? `${l.minutes} min` : <span className="text-muted">under a minute</span>}</td>
                    <td className="py-2.5 pr-3">{l.device === "phone" ? "Phone" : l.device === "desktop" ? "Laptop" : "–"}{l.lang ? ` · ${l.lang === "hi" ? "Hinglish" : "English"}` : ""}</td>
                    <td className="py-2.5 text-muted">{when(l.last)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!data.learners.length && <p className="py-6 text-center text-sm text-muted">No activity yet in this window.</p>}
            {!!data.learners.length && q && !found.length && <p className="py-6 text-center text-sm text-muted">No learner matches “{q}” in this window. Try a wider range above.</p>}
          </div>
          {!q && data.learners.length > SHOWN && (
            <p className="mt-3 text-sm">
              {showAll
                ? <Link href={`${keep({})}#learners`} className="font-bold underline underline-offset-4">Show only the latest {SHOWN}</Link>
                : <Link href={`${keep({ all: "1" })}#learners`} className="font-bold underline underline-offset-4">Show all {Math.min(500, data.learners.length)} learners</Link>}
            </p>
          )}
        </Panel>
      </div>

      <div id="day" className="mt-10 flex scroll-mt-6 flex-wrap items-end justify-between gap-3">
        <h2 className="display text-3xl">Day {lesson.day} · {lesson.app}</h2>
        <RangeTabs param="day" current={lesson.id} options={dayTabs.map((l) => ({ key: l.id, label: `Day ${l.day}` }))} />
      </div>
      {openedDays.length > 0 && openedDays.length < data.lessons.length && (
        <p className="mt-1 text-xs text-muted">Only days someone has opened have a tab. {data.lessons.length - openedDays.length} more {data.lessons.length - openedDays.length === 1 ? "day hasn’t" : "days haven’t"} been opened yet.</p>
      )}
      <div className="mt-4"><DayView l={lesson} /></div>

      <div id="said" className="mt-10 scroll-mt-6">
        <Panel title="What learners said" note="Their answer to “What should we improve?”, newest first.">
          {data.comments.length ? (
            <ul className="divide-y divide-line/25">
              {data.comments.map((c, i) => (
                <li key={i} className="py-3 text-sm">
                  <p className="whitespace-pre-wrap text-[15px]">“{c.improve}”</p>
                  <p className="mt-1 text-xs text-muted">{dayName(c.lesson)} · {c.rating}★ · {c.email ?? "anonymous"} · {when(c.created_at)}</p>
                </li>
              ))}
            </ul>
          ) : <p className="text-sm text-muted">No comments yet.</p>}
        </Panel>
      </div>

      <div id="funnel" className="mt-10 scroll-mt-6">
        <Panel title="Offer page funnel" note="People reaching each step of /system-design. Inside an app means Instagram and other in-app browsers. Excludes anyone who turned analytics off.">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-sm">
              <thead><tr className="text-left text-xs uppercase tracking-[0.1em] text-muted"><th className="py-2 font-semibold">Step</th><th className="py-2 text-right font-semibold">Inside an app</th><th className="py-2 text-right font-semibold">Real browser</th><th className="py-2 text-right font-semibold">Total</th><th className="py-2 text-right font-semibold">Of everyone who opened</th></tr></thead>
              <tbody>
                {funnel.map((r) => {
                  const total = r.inApp + r.browser;
                  return (
                    <tr key={r.step} className={`border-t border-line/25 ${total ? "" : "text-muted"}`}>
                      <td className={`py-1.5 ${r.step === "paid" ? "font-bold" : ""}`}>{FUNNEL_WORDS[r.step]}</td>
                      <td className="py-1.5 text-right tabular-nums">{r.inApp}</td>
                      <td className="py-1.5 text-right tabular-nums">{r.browser}</td>
                      <td className="py-1.5 text-right font-bold tabular-nums">{total}</td>
                      <td className="py-1.5 text-right tabular-nums">{r.step === "view" || !openedTotal ? "" : total > openedTotal ? "–" : pct(total, openedTotal)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>

      {announce && (
        <div id="announce" className="mt-10 scroll-mt-6">
          <Panel title="WhatsApp group announcement" note={`Once only, to paid learners (granted seats and company learners are left out). Email: “Join the System Design learners' WhatsApp group”, with the join button. Phone: “${SD_WHATSAPP_PUSH.title}: ${SD_WHATSAPP_PUSH.body}” to ${announce.devices} devices.`}>
            <WhatsAppAnnounce learners={announce.learners} devices={announce.devices} sentAt={announce.sent?.at ?? null} />
          </Panel>
        </div>
      )}

      <details id="more" className="group mt-10 scroll-mt-6">
        <summary className="cursor-pointer list-none text-sm font-bold underline underline-offset-4 [&::-webkit-details-marker]:hidden">More detail: language, device, city, screens, welcome, tour and sign-ins</summary>
        <div className="mt-4 grid gap-6 lg:grid-cols-3">
          <Panel title="Language"><BarList rows={data.lang} unit="people" /></Panel>
          <Panel title="Device"><BarList rows={data.device} unit="people" /></Panel>
          <Panel title="City (approximate)"><BarList rows={data.city} unit="people" emptyLabel="No city recorded yet." /></Panel>
          <Panel title="Country"><BarList rows={data.country} unit="people" emptyLabel="No country recorded yet." /></Panel>
          <Panel title="Screens they open"><BarList rows={data.screens} unit="views" /></Panel>
          <Panel title="Welcome screen"><BarList rows={data.welcome} unit="people" /></Panel>
          <Panel title="Kamran’s tour"><BarList rows={data.tour} unit="people" /></Panel>
          <Panel title="Google sign-in clicks"><BarList rows={data.signins} unit="clicks" emptyLabel="No sign-in clicks yet." /></Panel>
          <Panel title="Other"><ul className="flex flex-col gap-2 text-sm"><li>Turned subtitles off: <b>{data.subsOff}</b></li><li>LinkedIn shares and image downloads: <b>{data.shares}</b></li></ul></Panel>
        </div>
      </details>
    </>
  );
}
