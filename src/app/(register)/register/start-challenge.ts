"use server";

import { after } from "next/server";
import { auth, signIn, verifiedEmailFrom } from "@/auth";
import { getTrack, isOneClickStart } from "@/data/tracks";
import { isListed } from "@/data/course-cards";
import { db } from "@/lib/db/client";
import { todayIn } from "@/lib/learn";
import { viewerTimeZone } from "@/lib/viewer-tz";
import { saveLearnerTimeZone } from "@/lib/learner/zone";
import { enrolLearner } from "@/lib/learner/enrolment";
import { enrolmentClient } from "@/lib/learner/enrolment-db";
import { getLearnerState } from "@/lib/learner/data";
import { checkRateLimit } from "@/lib/rate-limit";
import { startDateFor } from "@/lib/release";
import { clamp, LIMITS } from "@/lib/validation";
import { sendWelcome } from "@/lib/welcome";

export type StartResult =
  | {
      ok: true;
      /** This call made the place; false when they were already on the challenge. */
      created: boolean;
    }
  | {
      ok: false;
      /** Why it failed, so the page can say what to do next. */
      kind: "signin" | "limited" | "unavailable" | "unknown";
      message: string;
    };

/**
 * Starting a 60-day challenge: a course place for the signed-in Google
 * account, and nothing else asked.
 *
 * The place is made for that session's email and no other, so nobody can start
 * a challenge as an address they have not signed in as. Name and email come
 * from Google; the GitHub and LinkedIn that each day's work is checked against
 * are added on the day page, where they are needed. No registrations row is
 * written: that table is the admin's list of what the registration form
 * collected (phone, role, consent), and this path never collects it.
 *
 * Idempotent: starting a challenge you are already on changes nothing and
 * sends no second welcome, so a double press or a retry is harmless.
 */
export async function startChallenge(track: string): Promise<StartResult> {
  // Only a challenge that is open and built starts this way. The browser names which one and nothing else.
  const found = typeof track === "string" ? getTrack(track) : undefined;
  if (!found || !isOneClickStart(found) || !isListed(found.slug)) {
    return { ok: false, kind: "unknown", message: "That challenge isn't open for sign-up." };
  }

  // Returns before it reads or writes anything when nobody is signed in.
  const session = await auth();
  const email = verifiedEmailFrom(session);
  if (!email) {
    return { ok: false, kind: "signin", message: "Sign in with Google to start. Your sign-in may have ended." };
  }

  // Per account rather than per network address: a college lab behind one address must not throttle its students.
  const limit = await checkRateLimit("challenge_start", { limit: 10, windowMinutes: 60, identity: email });
  if (!limit.allowed) {
    return { ok: false, kind: "limited", message: "Too many starts in the last hour." };
  }

  const sql = db();
  if (!sql) return { ok: false, kind: "unavailable", message: "Starting is not available right now." };

  const name = clamp(session?.user?.name, LIMITS.name) || clamp(email.split("@")[0], LIMITS.name);
  // Their own calendar: Day 1 is today where they are, and their days end at their midnight.
  const zone = await viewerTimeZone();
  const outcome = await enrolLearner(enrolmentClient(sql), {
    email,
    name,
    track: found.slug,
    // Rolling enrolment: Day 1 is the day they start, or the release day if that is later.
    cohortStart: startDateFor(found.slug, todayIn(zone)),
  });
  if (outcome === "created") await saveLearnerTimeZone(sql, email, found.slug, zone);
  if (outcome === "failed") {
    return { ok: false, kind: "unavailable", message: "Something went wrong starting your challenge." };
  }

  // Welcomed once, after the response so the page never waits on email: only the call that made the place sends it.
  if (outcome === "created") after(() => sendWelcome({ email, name, track: found.slug }));

  return { ok: true, created: outcome === "created" };
}

/** The challenge this name stands for, when it takes enrolments here. */
const openChallenge = (track: string) => {
  const found = typeof track === "string" ? getTrack(track) : undefined;
  return found && isOneClickStart(found) && isListed(found.slug) ? found : null;
};

/** Whether the signed-in visitor is already on this challenge, for its page to say so. Reads only their own place. */
export async function challengeStatus(track: string): Promise<"enrolled" | "other-device" | "none"> {
  const found = openChallenge(track);
  if (!found) return "none";
  const { state } = await getLearnerState(found.slug);
  return state === "enrolled" || state === "other-device" ? state : "none";
}

/** Google, and straight back to the challenge's own page: the path is built from the track's slug alone. */
export async function signInToEnroll(track: string) {
  const found = openChallenge(track);
  if (found) await signIn("google", { redirectTo: `/challenges/${found.slug}` });
}
