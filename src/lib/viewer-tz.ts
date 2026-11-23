import "server-only";
import { cookies } from "next/headers";
import { TZ_COOKIE, timeZoneOf } from "@/lib/timezone";

/** The visitor's IANA time zone, from the cookie their browser sets (components/TimeZoneCookie), or null before it has. */
export async function viewerTimeZone() {
  return timeZoneOf((await cookies()).get(TZ_COOKIE)?.value);
}
