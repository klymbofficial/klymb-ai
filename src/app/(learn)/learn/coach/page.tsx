import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Lock, Mic } from "lucide-react";
import { auth } from "@/auth";
import { VoiceCoach } from "@/components/coach/VoiceCoach";
import { PayButton } from "@/components/home/PayButton";
import { LearnerTopBar } from "@/components/learner/LearnerTopBar";
import { Appear } from "@/components/motion/Appear";
import { contact } from "@/data/config";
import { getTrack } from "@/data/tracks";
import { hasPaid } from "@/lib/access";
import { assessedTopics, recentSessions } from "@/lib/coach/history";
import { coachConfigured } from "@/lib/coach/realtime";
import { nextTopic, topicsFor } from "@/lib/coach/topics";
import { formatDate, formatINR } from "@/lib/format";
import { requireLearner } from "@/lib/learner/data";
import { LAUNCH_OFFER, offerOpen, priceNow } from "@/lib/offer";

export const metadata: Metadata = { title: "Voice coach", robots: { index: false, follow: false } };

/**
 * A five-minute spoken placement check on one topic.
 *
 * Everything the session needs is decided here, on the server: which topic,
 * which day they are on, whether they have a seat. The browser gets a topic
 * id and a microphone, and /api/coach/session checks the lot again when the
 * call is actually opened — this page is for the learner, not a gate.
 */
export default async function CoachPage() {
  const state = await requireLearner();
  if (state.state === "not-enrolled") notFound();

  const { learner, submissions } = state;
  const track = getTrack(learner.track);
  const topics = topicsFor(learner.track);
  const session = await auth();

  if (!track || !topics.length) {
    return (
      <>
        <LearnerTopBar name={learner.name} image={session?.user?.image} />
        <div className="mx-auto max-w-xl px-4 py-20 text-center">
          <h1 className="display text-3xl">The voice coach is not open on your track yet</h1>
          <p className="mt-3 text-muted">
            It is being written track by track. Write to {contact.email} if you would like yours next.
          </p>
          <BackLink />
        </div>
      </>
    );
  }

  // The same gate as the days: free tracks are open, a paid track needs the seat.
  if (track.price > 0 && !(await hasPaid(learner.email, track.slug))) {
    const offer = offerOpen();
    const price = priceNow(track.price);
    return (
      <>
        <LearnerTopBar name={learner.name} image={session?.user?.image} />
        <div className="mx-auto max-w-xl px-4 py-16 text-center sm:py-24">
          <span className="mx-auto grid size-14 place-items-center rounded-full bg-red-tint text-red-deep">
            <Lock aria-hidden="true" className="size-6" />
          </span>
          <p className="mt-6 text-xs font-extrabold uppercase tracking-[0.16em] text-red-deep">Voice coach · {track.name}</p>
          <h1 className="display mt-3 text-[clamp(1.8rem,4vw,2.6rem)] text-balance">Practise out loud before the interview does</h1>
          <p className="mt-4 text-muted">
            A spoken five-minute check on one topic at a time, with the evidence filed for your reviewer. It comes with the
            full course, along with Days 2 to 30, the four checkpoints and interview prep.
          </p>
          <div className="mt-8 rounded-card bg-surface p-6 text-left ring-1 ring-line/30">
            {offer && (
              <p className="mb-2 inline-flex rounded-full bg-red-strong px-3 py-1 text-xs font-bold text-white">
                Launch price: {formatINR(LAUNCH_OFFER.price)} until {LAUNCH_OFFER.endsLabel}
              </p>
            )}
            <p className="display text-4xl tabular-nums">{formatINR(price)}</p>
            <PayButton email={learner.email} price={price} tone="light" />
          </div>
          <BackLink />
        </div>
      </>
    );
  }

  const practised = await assessedTopics(learner.id);
  const topic = nextTopic(learner.track, practised) ?? topics[0];
  const history = await recentSessions(learner.id);
  const label = (id: string) => topics.find((t) => t.id === id)?.label ?? id;

  // Their day in the course is how far they have got, not what the calendar
  // says: days unlock in order as each one is submitted.
  const day = Math.min(30, submissions.reduce((max, s) => Math.max(max, s.day), 0) + 1);

  return (
    <>
      <LearnerTopBar name={learner.name} image={session?.user?.image} />

      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-8 sm:py-14">
        <Appear>
          <p className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.16em] text-red-deep">
            <Mic aria-hidden="true" className="size-4" />
            Voice coach
          </p>
          <h1 className="display mt-3 text-[clamp(1.9rem,4.5vw,2.8rem)] text-balance">
            Five minutes, out loud, on one thing
          </h1>
          <p className="mt-4 max-w-2xl text-muted">
            Interviews are spoken, and reading an answer is not practising it. The coach asks one question at a time, follows
            what you say, and files what it heard for your reviewer. Interrupt it whenever you want.
          </p>
        </Appear>

        <div className="mt-10">
          {coachConfigured() ? (
            <VoiceCoach topic={topic} alternatives={topics} trackName={track.name} day={day} />
          ) : (
            <div className="rounded-slab bg-surface px-6 py-14 text-center ring-1 ring-line/30">
              <h2 className="display text-2xl">The coach is not switched on here</h2>
              <p className="mx-auto mt-3 max-w-md text-muted">
                This deployment has no voice provider configured, so there is nothing to talk to yet. Everything else on your
                course works as usual.
              </p>
            </div>
          )}
        </div>

        {history.length > 0 && (
          <section className="mt-14">
            <h2 className="display text-xl">Your last sessions</h2>
            <ul className="mt-5 space-y-4">
              {history.map((record) => (
                <li key={record.id} className="rounded-card bg-card p-5 shadow-card">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                    <p className="font-bold">{label(record.topic)}</p>
                    <p className="text-xs text-muted nums">
                      {formatDate(record.created_at.slice(0, 10))}
                      {record.skills > 0 && ` · ${record.skills} ${record.skills === 1 ? "answer" : "answers"}`}
                      {record.first_reply_ms !== null && ` · replied in ${(record.first_reply_ms / 1000).toFixed(1)}s`}
                    </p>
                  </div>
                  {record.summary && <p className="mt-2 text-sm text-muted">{record.summary}</p>}
                </li>
              ))}
            </ul>
            <p className="mt-4 text-xs text-muted">
              Written by the coach at the end of each session, for the reviewer who reads it next to your deliverables. It is
              not a mark and it unlocks nothing.
            </p>
          </section>
        )}

        <BackLink />
      </div>
    </>
  );
}

function BackLink() {
  return (
    <Link
      href="/learn"
      className="mt-10 inline-flex items-center gap-2 text-sm font-semibold text-muted underline underline-offset-4 hover:text-ink"
    >
      <ArrowLeft aria-hidden="true" className="size-4" />
      Back to my cohort
    </Link>
  );
}
