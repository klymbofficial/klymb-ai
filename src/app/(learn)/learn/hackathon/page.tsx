import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth, verifiedEmailFrom } from "@/auth";
import { EntryForm } from "@/components/hackathon/EntryForm";
import { NotifyButton } from "@/components/hackathon/NotifyButton";
import { RegisterForm } from "@/components/hackathon/RegisterForm";
import { TeamRoster } from "@/components/hackathon/TeamRoster";
import { HackathonLanding } from "@/components/hackathon/landing/HackathonLanding";
import { LearnerTopBar } from "@/components/learner/LearnerTopBar";
import { HACKATHON, hackathonPhase, rosterOpen } from "@/data/hackathon";
import { hasInterest, myTeam, publishedResults } from "@/lib/hackathon";
import { readProfile } from "@/lib/profile";

export const metadata: Metadata = { title: "Hackathon", robots: { index: false, follow: false } };

/**
 * The hackathon inside the learner app: the designed event page, with the
 * person's own part under the hero. Registering, or once in, their team, its
 * code and their entry.
 */
export default async function MyHackathonPage() {
  const session = await auth();
  const email = verifiedEmailFrom(session);
  if (!email) redirect("/learn/login");
  const results = await publishedResults();
  const phase = hackathonPhase(results.length > 0);
  const [team, { profile }, interested] = await Promise.all([myTeam(email), readProfile(email, session?.user?.name), hasInterest(email)]);
  const name = profile.name || session?.user?.name || email.split("@")[0];
  const h = HACKATHON;
  const canEditRoster = rosterOpen() && (phase === "registration" || phase === "closed");
  const placed = team ? results.find((r) => r.teamId === team.id) : undefined;

  const middle = !team ? (
    <section id="register" aria-labelledby="register-title" className="hk-section hk-mine">
      {phase === "registration" ? (
        <>
          <h2 id="register-title" className="hk-h2">Register</h2>
          <p className="hk-lede">{h.registrationClosesLabel}. Solo or a team of up to three, one entry per person.</p>
          <div className="mt-6"><RegisterForm maxTeamSize={h.maxTeamSize} defaults={{ name, phone: profile.phone, college: profile.institution, graduationYear: profile.graduationYear ? String(profile.graduationYear) : "" }} /></div>
        </>
      ) : phase === "coming-soon" ? (
        <div className="hk-card">
          <h2 id="register-title" className="text-xl font-extrabold text-ink">The next hackathon is coming</h2>
          <p className="mt-1 mb-5 text-sm text-muted">Dates are being set. Get an email the moment registration opens.</p>
          <NotifyButton already={interested} />
        </div>
      ) : (
        <div className="hk-card">
          <h2 id="register-title" className="text-xl font-extrabold text-ink">Registration has closed</h2>
          <p className="mt-1 text-sm text-muted">You can still follow along on this page.</p>
        </div>
      )}
    </section>
  ) : (
    <section id="your-team" aria-labelledby="team-title" className="hk-section hk-mine">
      {placed && (
        <div className="mb-6 rounded-card bg-red-strong p-6 text-white">
          <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-white/70">#{placed.place}</p>
          <p className="display mt-1 text-2xl">{placed.title}. Congratulations!</p>
        </div>
      )}
      <h2 id="team-title" className="hk-h2">Your team</h2>
      <div className="hk-cards lg:grid-cols-2">
        <div className="hk-card">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h3 className="text-xl font-extrabold text-ink">{team.name || (team.members.length > 1 ? "Your team" : "You're entered solo")}</h3>
              <p className="mt-1 text-sm text-muted">{team.members.length} of {h.maxTeamSize} · {canEditRoster ? (h.rosterLockUtc ? "The roster can change until it locks." : "The roster can change until kickoff.") : "The roster is locked."}</p>
            </div>
            {team.members.length < h.maxTeamSize && phase === "registration" && (
              <div className="rounded-lg bg-surface px-4 py-3 text-center">
                <p className="text-xs font-bold uppercase tracking-wider text-muted">Team code</p>
                <p className="display mt-1 text-2xl tracking-[0.2em] text-ink">{team.code}</p>
                <p className="mt-1 text-xs text-muted">Teammates join with this</p>
              </div>
            )}
          </div>
          <div className="mt-5">
            <TeamRoster canEdit={canEditRoster} iLead={team.me.isLeader} members={team.members.map((m) => ({ id: m.id, name: m.name, isLeader: m.isLeader, isMe: m.email === email }))} />
          </div>
        </div>

        <div id="your-entry" className="hk-card">
          <h3 className="text-xl font-extrabold text-ink">Your entry</h3>
          {phase === "live" ? (
            <div className="mt-5"><EntryForm briefs={h.briefs.map((b) => ({ id: b.id, title: b.title }))} entry={team.entry} deadlineLabel={h.deadlineLabel} /></div>
          ) : team.entry ? (
            <dl className="mt-4 space-y-2 text-sm">
              <div><dt className="inline font-bold">Problem: </dt><dd className="inline">{h.briefs.find((b) => b.id === team.entry!.briefId)?.title}</dd></div>
              {([["Repository", team.entry.repoUrl], ["Live", team.entry.liveUrl], ["AI-usage log", team.entry.aiLogUrl]] as const).map(([l, u]) => (
                <div key={l}><dt className="inline font-bold">{l}: </dt><dd className="inline"><a href={u} target="_blank" rel="noopener noreferrer" className="break-all underline underline-offset-2">{u}</a></dd></div>
              ))}
            </dl>
          ) : (
            <p className="mt-2 text-sm text-muted">{phase === "registration" || phase === "closed" || phase === "coming-soon" ? `Submissions open at kickoff${h.kickoffLabel ? `: ${h.kickoffLabel}` : ""}.` : "No entry was submitted."}</p>
          )}
        </div>
      </div>
    </section>
  );

  return (
    <>
      <LearnerTopBar name={name} image={session?.user?.image} />
      <HackathonLanding phase={phase} results={results} team={team} email={email} interested={interested} inApp middle={middle} />
    </>
  );
}
