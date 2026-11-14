/**
 * What to tell a signed-in person once they have pressed Register: one plain answer per
 * thing that can really have happened. Pure and client-safe, so the words are
 * unit-tested and the form only has to draw them.
 *
 * It never decides anything about access. The server action has already
 * registered the person and, for a track whose course is built, looked for or
 * created their place on that track; this only describes the result. Nothing
 * here promises an email, a date or a payment: the app does not guarantee
 * those, so the copy does not either.
 */
import { enrolment } from "@/data/config";
import type { Track } from "@/types/program";

export interface RegistrationOutcome {
  /** A course place exists for this email on the chosen track after the request. */
  enrolled: boolean;
  /** The email had registered before. */
  duplicate: boolean;
  /** The track chosen in the form. */
  track?: Track;
  email: string;
}

/** What the primary button does. */
export type SuccessAction = "start-day-1" | "retry" | "none";

export interface SuccessModel {
  /** The seal: a tick for "done", a plain mark where the registration is saved but the place is not open. */
  tone: "done" | "saved";
  title: string;
  lead: string;
  /** Said first when the email had registered before. */
  repeatNote?: string;
  /** What happens next, in order. */
  steps: string[];
  action: SuccessAction;
}

export function successModel(o: RegistrationOutcome): SuccessModel {
  const name = o.track?.name ?? "your track";
  const repeatNote = o.duplicate ? "This email had already registered, so nothing was duplicated." : undefined;

  if (o.enrolled) {
    return {
      tone: "done",
      title: "You're in.",
      lead: `Your place on the ${name} track is reserved.`,
      repeatNote,
      steps: [
        "Open Day 1: it is open now, whenever you are ready.",
        `Each day is one problem, about ${enrolment.dailyTime.replace(" a day", "")} a day. A day opens once you have submitted the one before.`,
        "Your work lives in the course repository you gave us.",
      ],
      action: "start-day-1",
    };
  }

  // Registered, but the course place did not open (the track's course is built, so it should have).
  if (o.track?.contentLive) {
    return {
      tone: "saved",
      title: "Saved, but your course isn't open yet.",
      lead: `Your details are saved. We could not open your place on the ${name} track just now.`,
      repeatNote,
      steps: ["Press Register again in a minute: it is safe to repeat and nothing is duplicated.", "If it keeps failing, write to us."],
      action: "retry",
    };
  }

  if (o.track?.available) {
    return {
      tone: "done",
      title: "Place reserved.",
      lead: `Your place on the ${name} track is reserved.`,
      repeatNote,
      steps: [`Day 1 is not open yet. We will email ${o.email} when it is, and your 30 days start from that day.`],
      action: "none",
    };
  }

  return {
    tone: "saved",
    title: "Interest registered.",
    lead: `You chose the ${name} track, which is not open yet.`,
    repeatNote,
    steps: [`We will email ${o.email} when it opens.`],
    action: "none",
  };
}
