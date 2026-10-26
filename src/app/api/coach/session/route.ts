import { NextResponse } from "next/server";
import { hasPaid } from "@/lib/access";
import { assessedTopics, coveredSkills } from "@/lib/coach/history";
import { coachInstructions, realtimeSession } from "@/lib/coach/prompt";
import { COACH_MODEL, COACH_VOICE, coachConfigured, exchangeOffer } from "@/lib/coach/realtime";
import { findTopic, nextTopic } from "@/lib/coach/topics";
import { db } from "@/lib/db/client";
import { identityFingerprint } from "@/lib/fingerprint";
import { getLearnerState } from "@/lib/learner/data";
import { checkRateLimit } from "@/lib/rate-limit";
import { getTrack } from "@/data/tracks";

/** Longer than any offer, short enough that a junk body is refused before anything is read. */
const MAX_SDP = 64 * 1024;

/**
 * Opens a voice session: the browser posts its WebRTC offer here and gets the
 * answer back, and the provider's API key never goes anywhere near it.
 *
 * The order matters. The session row is written before the offer is relayed,
 * so a call that drops still leaves the record that it happened — and so a
 * database outage cannot become unmetered spending on someone else's API: no
 * row, no session.
 */
export async function POST(req: Request) {
  const state = await getLearnerState();
  // An API answers; it does not redirect a fetch to a sign-in page.
  if (state.state !== "enrolled") {
    return NextResponse.json({ error: "Sign in on your cohort account to use the coach." }, { status: 401 });
  }
  // Checked after identity, so a passer-by cannot learn from the outside
  // which deployments have a voice provider configured.
  if (!coachConfigured()) {
    return NextResponse.json({ error: "The voice coach is not switched on here yet." }, { status: 503 });
  }
  const { learner, submissions } = state;

  const track = getTrack(learner.track);
  if (!track) return NextResponse.json({ error: "Your track has no coach yet." }, { status: 404 });

  // A spoken session costs real money per minute, so it sits behind the same
  // gate as the days: free tracks are open, paid ones need the seat.
  if (track.price > 0 && !(await hasPaid(learner.email, track.slug))) {
    return NextResponse.json({ error: "The voice coach comes with a paid seat on this track." }, { status: 402 });
  }

  // Per account rather than per address: a shared college network is one IP.
  const limit = await checkRateLimit("coach-session", { limit: 8, windowMinutes: 60, identity: learner.email });
  if (!limit.allowed) {
    return NextResponse.json({ error: "That is enough practice for one hour. Come back a little later." }, { status: 429 });
  }

  const sdp = await req.text();
  if (!sdp.startsWith("v=") || sdp.length > MAX_SDP) {
    return NextResponse.json({ error: "That was not a WebRTC offer." }, { status: 400 });
  }

  const sql = db();
  if (!sql) return NextResponse.json({ error: "Could not start a session right now." }, { status: 503 });

  // Which topic is the server's decision, from the learner's own track: the
  // browser may ask for one, and gets it only if it is on that track.
  const asked = new URL(req.url).searchParams.get("topic");
  const practised = await assessedTopics(learner.id);
  const topic = findTopic(learner.track, asked) ?? nextTopic(learner.track, practised);
  if (!topic) return NextResponse.json({ error: "Your track has no coach topics yet." }, { status: 404 });

  // Only when this topic has come up before: the coach is told what was
  // already answered so a second session goes deeper instead of starting again.
  const covered = practised.includes(topic.id) ? await coveredSkills(learner.id, topic.id) : [];

  // Their day in the course is how far they have got, not what the calendar
  // says: days unlock in order as each one is submitted.
  const furthest = submissions.reduce((max, s) => Math.max(max, s.day), 0);
  const day = Math.min(30, furthest + 1);

  const { data: session, error } = await sql.row<{ id: string }>`
    insert into course.coach_sessions (learner_id, track, topic, day, model)
    values (${learner.id}, ${track.slug}, ${topic.id}, ${day}, ${COACH_MODEL})
    returning id
  `;
  if (error || !session) {
    return NextResponse.json({ error: "Could not start a session right now." }, { status: 503 });
  }

  const instructions = coachInstructions({
    firstName: learner.name.trim().split(/\s+/)[0] || learner.name,
    trackName: track.name,
    day,
    topic,
    covered,
  });

  const { answer, error: upstream } = await exchangeOffer({
    sdp,
    session: realtimeSession({ model: COACH_MODEL, voice: COACH_VOICE, instructions }),
    // A salted hash, so the provider can throttle a learner without being
    // told who they are. Same construction as the rate limiter's.
    identity: identityFingerprint(learner.id, process.env.AUTH_SECRET),
  });

  if (!answer) {
    return NextResponse.json(
      {
        error:
          upstream === "timeout"
            ? "The coach took too long to answer. Try again."
            : "The coach could not be reached just now. Try again in a minute.",
      },
      { status: 502 },
    );
  }

  // The body is the answer SDP and nothing else; the session id rides along
  // in a header so the evidence calls that follow can be tied to this call.
  return new Response(answer, {
    headers: {
      "content-type": "application/sdp",
      "cache-control": "no-store",
      "x-coach-session": session.id,
      "x-coach-topic": topic.id,
    },
  });
}
