import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import type { CSSProperties } from "react";
import { currentEmail } from "@/auth";
import { Briefs } from "@/components/hackathon/Briefs";
import { NotifyButton } from "@/components/hackathon/NotifyButton";
import { FaqAccordion } from "@/components/hackathon/landing/FaqAccordion";
import { Hero } from "@/components/hackathon/landing/Hero";
import "@/components/hackathon/landing/hackathon.css";
import { HACKATHON, hackathonPhase } from "@/data/hackathon";
import { hasInterest, myTeam, publishedResults } from "@/lib/hackathon";

export const metadata: Metadata = { title: "Hackathons", description: HACKATHON.tagline };

/** Each timeline card's line drawing, sized as a share of the card's width. */
const TIMELINE_ART = [
  { src: "/hackathon/documents.png", w: 162, h: 141, artW: "36%" },
  { src: "/hackathon/chat.png", w: 112, h: 98, artW: "31.9%" },
  { src: "/hackathon/calendar.png", w: 124, h: 101, artW: "35.1%" },
  { src: "/hackathon/trophy.png", w: 137, h: 133, artW: "39.1%" },
];
/** Where each of the four rail tabs sits under its card. */
const RAIL = ["14.77%", "38.26%", "61.74%", "85.23%"];

/**
 * The hackathon's public page. The hero follows the event's phase: coming
 * soon, registration, the live build, judging, then the winners. The
 * problem statements appear at kickoff.
 */
export default async function HackathonsPage() {
  const results = await publishedResults();
  const phase = hackathonPhase(results.length > 0);
  const email = await currentEmail();
  const [team, interested] = email ? await Promise.all([myTeam(email), hasInterest(email)]) : [null, false];
  const h = HACKATHON;
  const showBriefs = phase === "live" || phase === "judging" || phase === "results";

  const headline = {
    "coming-soon": "is coming soon",
    registration: "registrations are live",
    closed: "registrations have closed",
    live: "is live",
    judging: "is being judged",
    results: "winners are out",
  }[phase];

  const countdown =
    (phase === "registration" || phase === "closed") && h.kickoffUtc ? { targetIso: h.kickoffUtc, label: "Time until kickoff" }
    : phase === "live" && h.deadlineUtc ? { targetIso: h.deadlineUtc, label: "Time until submissions close" }
    : null;

  const cta =
    phase === "registration" ? { href: "/learn/hackathon", label: team ? "Go to your team" : "Register" }
    : team && (phase === "closed" || phase === "live" || phase === "judging") ? { href: "/learn/hackathon", label: phase === "live" ? "Submit your entry" : "Go to your team" }
    : phase === "results" ? { href: "#winners", label: "See the winners" }
    : null;

  const message = team ? (
    <p><strong>You&rsquo;re registered</strong><br />Your team, its code and your entry are on <Link href="/learn/hackathon">your hackathon page</Link>.</p>
  ) : phase === "registration" ? (
    <p><strong>Register to take part</strong><br />Solo or a team of up to three. {h.registrationClosesLabel}.</p>
  ) : phase === "coming-soon" ? (
    <p><strong>Dates coming soon</strong><br />Get an email the moment registration opens.</p>
  ) : (
    <p><strong>Registration has closed</strong><br />{phase === "live" ? `Submissions close ${h.deadlineLabel}.` : "Follow along on this page."}</p>
  );

  return (
    <div className="hk">
      <Hero
        name={h.name}
        headline={headline}
        sub="A 48-hour online hackathon to build real solutions with AI, solo or in a team of up to three."
        prizePool={h.prizePool}
        countdown={countdown}
        cta={cta}
        registered={Boolean(team)}
        message={message}
      />

      {phase === "coming-soon" && (
        <div className="hk-section" style={{ marginTop: 0, textAlign: "center" }}>
          {email ? <NotifyButton already={interested} /> : <Link className="hk-btn hk-btn--primary" href="/learn/login">Log in to get notified</Link>}
        </div>
      )}

      {phase === "results" && (
        <section id="winners" aria-labelledby="winners-title" className="hk-section">
          <h2 id="winners-title" className="hk-h2">Winners</h2>
          <ol className="hk-cards md:grid-cols-3">
            {results.map((r) => (
              <li key={r.place} className="hk-card">
                <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-red-deep">#{r.place} · {r.title}</p>
                <p className="mt-2 text-xl font-extrabold text-ink">{r.team}</p>
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

      <section className="hk-how" id="hk-how" aria-labelledby="hk-how-title">
        <h2 className="hk-h2" id="hk-how-title">Discover how it works</h2>
        <ol className="hk-how__grid">
          {h.steps.map((step, i) => (
            <li key={step.title} className="hiw">
              <span className="hiw__tab" aria-hidden="true">{i + 1}</span>
              <div className="hiw__body">
                <h3 className="hiw__title">{step.title}</h3>
                <p className="hiw__text">{step.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="hk-section hk-timeline" aria-labelledby="hk-timeline-title">
        <div className="tl">
          <h2 className="hk-h2 tl__title" id="hk-timeline-title">Timeline</h2>
          <ol className="tl__cards">
            {h.timeline.map((t, i) => {
              const art = TIMELINE_ART[i];
              return (
                <li key={t.title} className="tl-card">
                  <h3 className="tl-card__title">{t.title}</h3>
                  <p className="tl-card__when">{t.when}</p>
                  <p className="tl-card__text">{t.body}</p>
                  {art && <Image className="tl-card__art" style={{ "--art-w": art.artW } as CSSProperties} src={art.src} alt="" width={art.w} height={art.h} unoptimized />}
                </li>
              );
            })}
          </ol>
          <div className="tl__rail" aria-hidden="true">
            <span className="tl__line" />
            {RAIL.map((x, i) => <span key={x} className="tl-tab" style={{ "--x": x } as CSSProperties}>{i + 1}</span>)}
          </div>
        </div>
      </section>

      {showBriefs && (
        <section className="hk-section" aria-labelledby="briefs-title">
          <h2 id="briefs-title" className="hk-h2">The problems</h2>
          <p className="hk-lede">Pick one of three.</p>
          <div className="mt-6"><Briefs briefs={h.briefs} /></div>
        </section>
      )}

      <section className="hk-section hk-faq" aria-labelledby="hk-faq-title">
        <div className="hk-faq__intro">
          <h2 className="hk-h2 hk-faq__title" id="hk-faq-title">Frequently asked<br /><em>questions</em></h2>
          <p className="hk-faq__sub">{showBriefs ? "Everything about the event." : "Common questions before you register."}</p>
        </div>
        <FaqAccordion items={h.faqs} />
      </section>

      <section className="hk-section hk-rules" aria-labelledby="hk-rules-title">
        <h2 className="sr-only" id="hk-rules-title">Rules</h2>
        <div className="rules">
          <span className="rules__word" aria-hidden="true">RULES</span>
          {h.rules.map((r, i) => (
            <article key={r.title} className={`rule rule--${i + 1}`} tabIndex={0}>
              <Image className="rule__pin" src="/hackathon/pin.png" alt="" width={267} height={288} unoptimized />
              <div className="rule__note">
                <h3 className="rule__title"><b>{String(i + 1).padStart(2, "0")}.</b> {r.title}</h3>
                <p className="rule__text">{r.body}</p>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
