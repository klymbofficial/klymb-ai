import { DEFAULT_TIME_ZONE, toZonedInput } from "@/lib/company/batch-rules";

/** Every zone the server knows, India and UTC first; Node still calls India "Asia/Calcutta". */
export function timeZoneList(): string[] {
  const all = Intl.supportedValuesOf("timeZone").filter((z) => z !== "Asia/Calcutta" && z !== "UTC");
  return [DEFAULT_TIME_ZONE, "UTC", ...all];
}

/** Tomorrow at 10:00 and a week later at 18:00, in India time: a starting point to change. */
export function inviteDefaults(now: Date) {
  const day = (n: number) => toZonedInput(new Date(now.getTime() + n * 86400000), DEFAULT_TIME_ZONE).slice(0, 10);
  return { timeZone: DEFAULT_TIME_ZONE, opens: `${day(1)}T10:00`, closes: `${day(8)}T18:00` };
}
