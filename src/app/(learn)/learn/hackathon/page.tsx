import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth, verifiedEmailFrom } from "@/auth";
import { Briefs } from "@/components/hackathon/Briefs";
import { EntryForm } from "@/components/hackathon/EntryForm";
import { NotifyButton } from "@/components/hackathon/NotifyButton";
import { RegisterForm } from "@/components/hackathon/RegisterForm";
import { TeamRoster } from "@/components/hackathon/TeamRoster";
import { LearnerTopBar } from "@/components/learner/LearnerTopBar";
import { HACKATHON, hackathonPhase, rosterOpen } from "@/data/hackathon";
import { hasInterest, myTeam, publishedResults } from "@/lib/hackathon";
import { readProfile } from "@/lib/profile";

export const metadata: Metadata = { title: "Your hackathon team", robots: { index: false, follow: false } };

/** A signed-in person's place in the hackathon: registering, their team and code, and their entry. */
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

  return (
    <>
      <LearnerTopBar name={name} image={session?.user?.image} />
      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-8 sm:py-14">
        <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-red-deep">Hackathon</p>
        <h1 className="display mt-3 text-[clamp(1.9rem,4vw,2.75rem)]">{h.name}</h1>
        <p className="mt-2 text-muted">{h.tagline} <Link href="/hackathons" className="font-semibold underline underline-offset-2">Event details</Link></p>

        {!team && (
          <div className="mt-8">
            {phase === "registration" ? (
              <>
                <h2 className="text-xl font-extrabold">Register</h2>
                <p className="mt-1 mb-5 text-sm text-muted">{h.registrationClosesLabel ? `${h.registrationClosesLabel}.` : "Solo or a team of up to three."} One entry per person.</p>
                <RegisterForm maxTeamSize={h.maxTeamSize} defaults={{ name, phone: profile.phone, college: profile.institution, graduationYear: profile.graduationYear ? String(profile.graduationYear) : "" }} />
              </>
            ) : phase === "coming-soon" ? (
              <div className="card p-6">
                <h2 className="text-xl font-extrabold">The next hackathon is coming</h2>
                <p className="mt-1 mb-5 text-sm text-muted">Dates are being set. Get an email the moment registration opens.</p>
                <NotifyButton already={interested} />
              </div>
            ) : (
              <div className="card p-6">
                <h2 className="text-xl font-extrabold">Registration has closed</h2>
                <p className="mt-1 text-sm text-muted">You can still follow along on the <Link href="/hackathons" className="font-semibold underline underline-offset-2">event page</Link>.</p>
              </div>
            )}
          </div>
        )}

        {team && (
          <>
            {placed && (
              <div className="mt-8 rounded-card bg-red-strong p-6 text-white">
                <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-white/70">#{placed.place}</p>
                <p className="display mt-1 text-2xl">{placed.title}. Congratulations!</p>
              </div>
            )}
            <section aria-labelledby="team-title" className="card mt-8 p-6 sm:p-7">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h2 id="team-title" className="text-xl font-extrabold">{team.name || (team.members.length > 1 ? "Your team" : "You're entered solo")}</h2>
                  <p className="mt-1 text-sm text-muted">{team.members.length} of {h.maxTeamSize} · {canEditRoster ? (h.rosterLockUtc ? "The roster can change until it locks." : "The roster can change until kickoff.") : "The roster is locked."}</p>
                </div>
                {team.members.length < h.maxTeamSize && phase === "registration" && (
                  <div className="rounded-lg bg-surface px-4 py-3 text-center">
                    <p className="text-xs font-bold uppercase tracking-wider text-muted">Team code</p>
                    <p className="display mt-1 text-2xl tracking-[0.2em]">{team.code}</p>
                    <p className="mt-1 text-xs text-muted">Teammates join with this</p>
                  </div>
                )}
              </div>
              <div className="mt-5">
                <TeamRoster canEdit={canEditRoster} iLead={team.me.isLeader} members={team.members.map((m) => ({ id: m.id, name: m.name, isLeader: m.isLeader, isMe: m.email === email }))} />
              </div>
            </section>

            <section aria-labelledby="entry-title" className="card mt-6 p-6 sm:p-7">
              <h2 id="entry-title" className="text-xl font-extrabold">Your entry</h2>
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
            </section>

            {(phase === "live" || phase === "judging" || phase === "results") && (
              <section aria-labelledby="problems-title" className="mt-10">
                <h2 id="problems-title" className="text-xl font-extrabold">The problems</h2>
                <div className="mt-4"><Briefs briefs={h.briefs} /></div>
              </section>
            )}
          </>
        )}
      </div>
    </>
  );
}
