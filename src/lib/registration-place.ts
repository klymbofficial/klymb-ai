import type { Db } from "@/lib/db/client";
import { trackSlugs } from "@/data/tracks";
import type { TrackSlug } from "@/types/program";

/**
 * Does this email already hold a course place, and on which track?
 *
 * A failed read is its own answer, `{ ok: false }`, and the caller must stop:
 * it is NOT "no place". Treating an error as "no place" would let a
 * registration for another track be recorded over a learner who is already on
 * one (the record would then name the wrong track).
 *
 * Three different answers, never blurred together:
 *   - `{ ok: true, track: null }`: the read worked and there is NO learner row.
 *   - `{ ok: true, track }`: there is a place, on a track this app knows.
 *   - `{ ok: false, reason }`: stop. Either the read failed ("error"), or a
 *     learner row exists but its track is one this app does not know, retired
 *     or corrupt ("unknown-track"). The second is also not "no place": there
 *     is a learner, and we cannot say which track they are on, so changing
 *     their registration could put the wrong one on record.
 */
export type PlaceLookup =
  | { ok: true; track: TrackSlug | null }
  | { ok: false; reason: "error" | "unknown-track" };

export async function lookupPlaceTrack(sql: Pick<Db, "row">, email: string): Promise<PlaceLookup> {
  const { data, error } = await sql.row<{ track: string }>`
    select track from course.learners where email = ${email}
  `;
  if (error) {
    // The code only: never the address or the message, which can carry it.
    console.error("course place lookup failed:", error.code);
    return { ok: false, reason: "error" };
  }
  if (!data) return { ok: true, track: null };
  if (!trackSlugs.includes(data.track as TrackSlug)) {
    // The slug only (it is a course label, not a person); never the address.
    console.error("course place has an unknown track:", JSON.stringify(data.track));
    return { ok: false, reason: "unknown-track" };
  }
  return { ok: true, track: data.track as TrackSlug };
}
