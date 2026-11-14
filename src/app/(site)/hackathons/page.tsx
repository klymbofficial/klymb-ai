import type { Metadata } from "next";
import { currentEmail } from "@/auth";
import { Briefs } from "@/components/hackathon/Briefs";
import { NotifyButton } from "@/components/hackathon/NotifyButton";
import { Appear } from "@/components/motion/Appear";
import { ButtonLink } from "@/components/ui/Button";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { HACKATHON, hackathonPhase } from "@/data/hackathon";
import { hasInterest, myTeam, publishedResults } from "@/lib/hackathon";

export const metadata: Metadata = { title: "Hackathons", description: HACKATHON.tagline };

/** Four columns of short cards: how it works, what to submit, the rules, how it's judged. */
function CardRow({ id, eyebrow, title, items }: { id: string; eyebrow: string; title: string; items: readonly { title: string; body: string }[] }) {
  return (
    <section aria-labelledby={id} className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <Eyebrow>{eyebrow}</Eyebrow>
      <h2 id={id} className="display mt-3 text-[clamp(1.6rem,3.2vw,2.3rem)]">{title}</h2>
      <ol className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((s, i) => (
          <li key={s.title} className="card p-5">
            <span className="text-sm font-bold text-red-strong nums">{String(i + 1).padStart(2, "0")}</span>
            <h3 className="mt-1.5 font-extrabold">{s.title}</h3>
            <p className="mt-1 text-sm leading-relaxed text-muted">{s.body}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

/**
 * The hackathon's public page. What it leads with follows the event's phase:
 * "coming soon" with a sign-up, registration, the live build, judging, then
 * the winners. The briefs appear at kickoff.
 */
export default async function HackathonsPage() {
  const results = await publishedResults();
  const phase = hackathonPhase(results.length > 0);
  const email = await currentEmail();
  const [team, interested] = email ? await Promise.all([myTeam(email), hasInterest(email)]) : [null, false];
  const h = HACKATHON;

  const lead = {
    "coming-soon": ["The next hackathon is coming", "Dates are being set. Get an email the moment registration opens."],
    registration: ["Registration is open", h.registrationClosesLabel || "Register solo or as a team of up to three."],
    closed: ["Registration has closed", `The build starts ${h.kickoffLabel}.`],
    live: ["The build is on", `Submissions close ${h.deadlineLabel}.`],
    judging: ["Judging is under way", h.resultsLabel || "Winners are announced here soon."],
    results: ["The winners", "Thank you to every team who built something."],
  }[phase];

  return (
    <>
      <section aria-labelledby="hack-title" className="mx-auto max-w-7xl px-4 pb-6 sm:px-6">
        <div className="relative overflow-hidden rounded-slab bg-night p-8 text-paper shadow-float sm:p-12 lg:p-16">
          <span aria-hidden="true" className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(60% 80% at 100% 0%,rgba(131,5,11,.6),transparent 70%)" }} />
          <div className="relative">
            <Appear><p className="text-xs font-extrabold uppercase tracking-[0.16em] text-red-soft">Hackathon</p></Appear>
            <Appear delay={0.08} y={24}><h1 id="hack-title" className="display mt-4 max-w-3xl text-[clamp(2.4rem,6vw,4.25rem)]">{h.name}</h1></Appear>
            <Appear delay={0.14}><p className="mt-4 max-w-xl text-lg text-white/80">{h.tagline}</p></Appear>
            <Appear delay={0.2} className="mt-8">
              <p className="text-xl font-extrabold">{lead[0]}</p>
              <p className="mt-1 text-sm text-white/70">{lead[1]}</p>
              <div className="mt-5">
                {phase === "coming-soon" && (email ? <NotifyButton already={interested} /> : <ButtonLink href="/learn/login" variant="inverse" soft arrow>Log in to get notified</ButtonLink>)}
                {phase === "registration" && <ButtonLink href="/learn/hackathon" variant="inverse" soft arrow>{team ? "Go to your team" : "Register"}</ButtonLink>}
                {(phase === "closed" || phase === "live" || phase === "judging") && team && <ButtonLink href="/learn/hackathon" variant="inverse" soft arrow>{phase === "live" ? "Submit your entry" : "Go to your team"}</ButtonLink>}
              </div>
              {(h.kickoffLabel || h.deadlineLabel) && phase !== "results" && (
                <dl className="mt-8 grid max-w-xl gap-4 border-t border-white/15 pt-5 text-sm sm:grid-cols-2">
                  {h.kickoffLabel && <div><dt className="text-white/60">Kickoff</dt><dd className="font-bold">{h.kickoffLabel}</dd></div>}
                  {h.deadlineLabel && <div><dt className="text-white/60">Deadline</dt><dd className="font-bold">{h.deadlineLabel}</dd></div>}
                </dl>
              )}
            </Appear>
          </div>
        </div>
      </section>

      {phase === "results" && (
        <section aria-labelledby="winners-title" className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
          <h2 id="winners-title" className="display text-[clamp(1.6rem,3.2vw,2.3rem)]">Winners</h2>
          <ol className="mt-6 grid gap-4 md:grid-cols-3">
            {results.map((r) => (
              <li key={r.place} className="card p-6">
                <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-red-deep">#{r.place} · {r.title}</p>
                <p className="mt-2 text-xl font-extrabold">{r.team}</p>
                <p className="mt-1 text-sm text-muted">{r.members.join(", ")}</p>
                <div className="mt-4 flex flex-wrap gap-4 text-sm font-bold">
                  {r.liveUrl && <a href={r.liveUrl} target="_blank" rel="noopener noreferrer nofollow" className="underline underline-offset-4">See it live</a>}
                  {r.repoUrl && <a href={r.repoUrl} target="_blank" rel="noopener noreferrer nofollow" className="underline underline-offset-4">Code</a>}
                </div>
              </li>
            ))}
          </ol>
        </section>
      )}

      <CardRow id="how" eyebrow="How it works" title="Register, build for 48 hours, submit." items={h.steps} />
      <CardRow id="deliver" eyebrow="What to submit" title="Three links, before the deadline." items={[...h.deliverables, { title: "Notes", body: "Anything you built before kickoff, disclosed in your submission notes." }]} />
      <CardRow id="rules" eyebrow="Rules" title="Fair, simple, one entry each." items={h.rules} />
      <CardRow id="judging" eyebrow="Judging" title="What wins." items={[...h.criteria, { title: "Prizes", body: h.prizes.length ? h.prizes.map((p) => `${p.place}: ${p.reward}`).join(" · ") : "Prizes are announced soon." }]} />

      <section aria-labelledby="briefs-title" className="mx-auto max-w-7xl px-4 pt-10 pb-16 sm:px-6 sm:pb-24">
        <Eyebrow>The problems</Eyebrow>
        <h2 id="briefs-title" className="display mt-3 text-[clamp(1.6rem,3.2vw,2.3rem)]">Pick one of three.</h2>
        {phase === "live" || phase === "judging" || phase === "results"
          ? <div className="mt-6"><Briefs briefs={h.briefs} /></div>
          : <p className="mt-4 max-w-xl text-muted">The three problem statements appear here at kickoff, so everyone starts at the same moment.</p>}
      </section>
    </>
  );
}
