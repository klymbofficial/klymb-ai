/**
 * A candidate's attempt (H06), free of the database and of Next so it can be
 * tested. The server owns the clock: the deadline is fixed when they press
 * Start, and nothing on the page can move it.
 */

export interface AttemptTimes {
  startedAt: string | Date;
  deadlineAt: string | Date;
  submittedAt: string | Date | null;
}

export type AttemptState = "in_progress" | "time_up" | "submitted";

/** Saves that arrive this long after the deadline still count: the last one may have been in flight (H07). */
export const SAVE_GRACE_SECONDS = 30;
/** The longest answer, in characters (the database checks it too). */
export const MAX_ANSWER_CHARS = 60000;
/** How long after the last keystroke the answer saves on its own. */
export const AUTOSAVE_MS = 10000;

/** True while a save can still land: before the deadline plus the grace, and not submitted. */
export function canSave(a: Pick<AttemptTimes, "deadlineAt" | "submittedAt">, now: Date): boolean {
  return !a.submittedAt && now.getTime() <= new Date(a.deadlineAt).getTime() + SAVE_GRACE_SECONDS * 1000;
}

/** What the candidate reads about their answer's save state. */
export type SaveState = "idle" | "dirty" | "saving" | "saved" | "retrying" | "conflict" | "closed";

/** Where an attempt stands at `now`. */
export function attemptState(a: AttemptTimes, now: Date): AttemptState {
  if (a.submittedAt) return "submitted";
  return now.getTime() < new Date(a.deadlineAt).getTime() ? "in_progress" : "time_up";
}

/** Milliseconds left, never below zero. */
export function remainingMs(a: Pick<AttemptTimes, "deadlineAt">, now: Date): number {
  return Math.max(0, new Date(a.deadlineAt).getTime() - now.getTime());
}

/** "1:05:09" or "04:59", for the countdown. */
export function clockText(ms: number): string {
  const total = Math.ceil(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const two = (n: number) => String(n).padStart(2, "0");
  return h ? `${h}:${two(m)}:${two(s)}` : `${two(m)}:${two(s)}`;
}

/** The moments a screen reader is told how long is left, in minutes. */
export const ANNOUNCE_AT_MINUTES = [30, 10, 5, 1] as const;

/** What the recruiter's table says about an attempt. */
export const ATTEMPT_LABEL: Record<AttemptState | "none", string> = {
  none: "Not started",
  in_progress: "In progress",
  time_up: "Time up",
  submitted: "Submitted",
};
