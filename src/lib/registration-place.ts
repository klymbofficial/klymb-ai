import type { Db } from "@/lib/db/client";
import { trackSlugs } from "@/data/tracks";
import type { TrackSlug } from "@/types/program";

/**
 * Which tracks does this email already hold a course place on? A person can
 * hold several, one place per track.
 *
 * A failed read is its own answer, `{ ok: false }`, and the caller must stop:
 * it is NOT "no place". Treating an error as "no place" would let a
 * registration go ahead without knowing what the learner already has.
 *
 * Three different answers, never blurred together:
 *   - `{ ok: true, tracks: [] }`: the read worked and there is NO learner row.
 *   - `{ ok: true, tracks }`: their places, each on a track this app knows.
 *   - `{ ok: false, reason }`: stop. Either the read failed ("error"), or a
 *     learner row exists on a track this app does not know, retired or
 *     corrupt ("unknown-track"). The second is also not "no place": there is
 *     a learner we cannot fully account for, so nothing is changed for them
 *     until the team has looked.
 */
export type PlaceLookup =
  | { ok: true; tracks: TrackSlug[] }
  | { ok: false; reason: "error" | "unknown-track" };

export async function lookupPlaces(sql: Pick<Db, "rows">, email: string): Promise<PlaceLookup> {
  const { data, error } = await sql.rows<{ track: string }>`
    select track from course.learners where email = ${email}
  `;
  if (error) {
    // The code only: never the address or the message, which can carry it.
    console.error("course place lookup failed:", error.code);
    return { ok: false, reason: "error" };
  }
  const tracks = (data ?? []).map((r) => r.track);
  const unknown = tracks.find((t) => !trackSlugs.includes(t as TrackSlug));
  if (unknown !== undefined) {
    // The slug only (it is a course label, not a person); never the address.
    console.error("course place has an unknown track:", JSON.stringify(unknown));
    return { ok: false, reason: "unknown-track" };
  }
  return { ok: true, tracks: tracks as TrackSlug[] };
}
