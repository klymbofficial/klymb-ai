/**
 * Reminder copy, Duolingo-style: streak-aware, warmer in the morning, more
 * urgent toward the night, and varied so it never reads like a robot.
 * Pure, so it is unit-tested; the cron route only decides who gets one.
 */

export type Slot = "morning" | "midday" | "evening" | "night";

/** 09:00, 13:00, 17:00, 21:00 IST. Anything off-schedule maps to the nearest earlier slot. */
export function slotForIstHour(hour: number): Slot | null {
  if (hour < 8) return null;
  if (hour < 12) return "morning";
  if (hour < 16) return "midday";
  if (hour < 20) return "evening";
  return "night";
}

export interface ReminderInput {
  slot: Slot;
  name: string;
  day: number;
  title: string;
  minutes: number;
  kind: "build" | "assessment" | "interview";
  /** Consecutive days submitted, ending yesterday. */
  streak: number;
  doneToday: boolean;
  /** Yesterday's day is still unsubmitted. */
  behind: boolean;
  /** Picks the wording variant; the date keeps it stable within one send. */
  seed: number;
}

export interface Reminder { title: string; body: string; url: string; tag: string }

const pick = <T,>(list: T[], seed: number) => list[Math.abs(seed) % list.length];

export function buildReminder(r: ReminderInput): Reminder | null {
  // Done for today: only the morning "it's open" ever goes out, and that is before they could finish.
  if (r.doneToday && r.slot !== "morning") return null;

  const n = r.name;
  const mins = Math.max(15, Math.round(r.minutes / 15) * 15);
  const fire = r.streak >= 2 ? `🔥 ${r.streak}-day streak` : null;
  const kindLine = r.kind === "assessment" ? "It's a checkpoint day." : r.kind === "interview" ? "Mock interview day." : "One real problem.";
  const url = `/learn/day/${r.behind ? r.day - 1 : r.day}`;
  const tag = `day-${r.day}`; // later reminders replace earlier ones, never pile up

  if (r.slot === "morning") {
    if (r.behind) {
      return { url, tag, title: `Day ${r.day} is open, ${n}`, body: `Day ${r.day - 1} is still waiting too. Start there; ${mins} minutes gets you back on track.` };
    }
    return pick<Reminder>([
      { url, tag, title: `Day ${r.day} is open: ${r.title}`, body: `Morning ${n}. About ${mins} minutes. ${kindLine}${fire ? ` ${fire}, keep it going.` : ""}` },
      { url, tag, title: `☀️ Day ${r.day}: ${r.title}`, body: `Good morning ${n}. ${kindLine} About ${mins} minutes.${fire ? ` ${fire}.` : ""}` },
    ], r.seed);
  }

  if (r.slot === "midday") {
    return pick<Reminder>([
      { url, tag, title: fire ? `${fire}. Don't break it now` : `Day ${r.day} is waiting, ${n}`, body: `A lunch-break start on "${r.title}" makes tonight easy.` },
      { url, tag, title: `Quick one, ${n}?`, body: `Day ${r.day} takes about ${mins} minutes. Even 15 now counts.` },
      { url, tag, title: `Halfway through the day`, body: `Day ${r.day} is still open. Future you, in the interview, will thank you.` },
    ], r.seed);
  }

  if (r.slot === "evening") {
    return pick<Reminder>([
      { url, tag, title: fire ? `Your ${r.streak}-day streak is on the line 🔥` : `Still time for Day ${r.day}`, body: `${n}, about ${mins} minutes left between you and done.` },
      { url, tag, title: `Day ${r.day} misses you`, body: `"${r.title}" is ready when you are. Open it now, finish before dinner.` },
      { url, tag, title: `Evening check-in`, body: `Day ${r.day} isn't submitted yet, ${n}. Start it now; it's the best part of the day to do it.` },
    ], r.seed);
  }

  // night: last call
  return pick<Reminder>([
    { url, tag, title: fire ? `Last call: save your ${r.streak}-day streak 🔥` : `Last call for Day ${r.day}`, body: `${n}, it closes at midnight. Submit what you have; you can improve it tomorrow.` },
    { url, tag, title: `Before you sleep, ${n}`, body: `Day ${r.day} is still open. A rough submission beats none, and it keeps your refund on track.` },
  ], r.seed);
}

/** Consecutive submitted days ending at `day` (inclusive). */
export function streakEnding(submitted: Set<number>, day: number) {
  let s = 0;
  for (let d = day; d >= 1 && submitted.has(d); d--) s++;
  return s;
}
