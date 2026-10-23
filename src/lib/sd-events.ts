/**
 * The System Design course's activity events: the names the browser may send
 * and how one is cleaned before it is stored. Shared by the API route and tests.
 */
export const SD_EVENTS = [
  "screen", "lesson_open", "ping", "step_done", "day_complete",
  "video_play", "video_progress", "subs", "lang", "tour", "welcome", "share",
] as const;
export type SdEvent = (typeof SD_EVENTS)[number];

export interface CleanEvent {
  event: SdEvent;
  lesson: string | null;
  step: string | null;
  path: string | null;
  props: Record<string, string | number | boolean>;
}

const short = (v: unknown, max: number) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null);

/** One event from the browser, cut down to known names and short, flat values; null if it isn't one of ours. */
export function cleanEvent(raw: unknown): CleanEvent | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (!SD_EVENTS.includes(r.e as SdEvent)) return null;
  const props: CleanEvent["props"] = {};
  const src = r.props && typeof r.props === "object" ? (r.props as Record<string, unknown>) : {};
  for (const [k, v] of Object.entries(src).slice(0, 12)) {
    if (!/^[a-z][a-zA-Z0-9_]{0,23}$/.test(k)) continue;
    if (typeof v === "string") props[k] = v.slice(0, 300);
    else if (typeof v === "number" && Number.isFinite(v)) props[k] = v;
    else if (typeof v === "boolean") props[k] = v;
  }
  return { event: r.e as SdEvent, lesson: short(r.lesson, 12), step: short(r.step, 16), path: short(r.path, 200), props };
}

/** An anonymous id the browser made: a uuid-ish token, nothing else. */
export const validAnon = (v: unknown): v is string => typeof v === "string" && /^[a-zA-Z0-9-]{8,64}$/.test(v);
