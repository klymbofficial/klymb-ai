/**
 * Calendar days and clock hours in a learner's own time zone. Pure and safe in
 * the browser, so the server and the app read a day the same way. India time
 * is the default: everyone enrolled before time zones were kept is on it,
 * and so is anyone whose zone we don't know.
 */
export const IST = "Asia/Kolkata";

/** The browser cookie that carries the visitor's IANA time zone. */
export const TZ_COOKIE = "tz";

const formatters = new Map<string, Intl.DateTimeFormat>();
function formatter(timeZone: string) {
  let f = formatters.get(timeZone);
  if (!f) {
    f = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
    formatters.set(timeZone, f);
  }
  return f;
}

/** An IANA time zone this runtime knows, or null. */
export function timeZoneOf(value: unknown): string | null {
  if (typeof value !== "string" || !value || value.length > 64 || !/^[A-Za-z0-9_+\-/]+$/.test(value)) return null;
  try {
    formatter(value);
    return value;
  } catch {
    return null;
  }
}

function parts(at: number | string | Date, timeZone: string) {
  const out: Record<string, string> = {};
  for (const p of formatter(timeZoneOf(timeZone) ?? IST).formatToParts(new Date(at))) out[p.type] = p.value;
  return out;
}

/** The calendar day at `at` in `timeZone`, as YYYY-MM-DD. */
export function dayIn(at: number | string | Date, timeZone: string = IST) {
  const p = parts(at, timeZone);
  return `${p.year}-${p.month}-${p.day}`;
}

/** The hour of the day (0–23) at `at` in `timeZone`. */
export const hourIn = (at: number | string | Date, timeZone: string = IST) => Number(parts(at, timeZone).hour) % 24;

/** Minutes past midnight at `at` in `timeZone`. */
export function minutesIn(at: number | string | Date, timeZone: string = IST) {
  const p = parts(at, timeZone);
  return (Number(p.hour) % 24) * 60 + Number(p.minute);
}
