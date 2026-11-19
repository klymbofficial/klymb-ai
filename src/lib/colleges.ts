/**
 * College search over app.klymb.ai's catalogue (public."College", ~54,000
 * AISHE/AICTE rows), ported from its `searchColleges`. klymb.ai can read it
 * through a column grant (migration 0046). The pure helpers here are tested;
 * `searchColleges` takes the database so it can be too.
 */
import type { Db } from "@/lib/db/client";

export type CollegeOption = { id: string; name: string; state: string | null; district: string | null };
type Row = CollegeOption & { city: string | null };

/** Postgres: no such table (app.klymb.ai's catalogue isn't there), or no privilege (0046 hasn't run). */
const MISSING = new Set(["42P01", "42501"]);

/** Up to six uppercase alphanumeric words. The catalogue's searchText is in the same form. */
export function tokenize(query: string): string[] {
  return query.toUpperCase().replace(/[^A-Z0-9]+/g, " ").split(" ").filter(Boolean).slice(0, 6);
}

const alnum = (s: string | null) => (s ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");

function placeTokens(row: Row) {
  return new Set([row.city, row.district, row.state].map(alnum).filter((t) => t.length >= 3));
}

function splitLocationSuffix(name: string): { stem: string; place: string } | null {
  const comma = name.lastIndexOf(",");
  if (comma < 8) return null;
  const stem = name.slice(0, comma).trim();
  const place = name.slice(comma + 1).trim();
  if (alnum(stem).length < 8) return null;
  if (!place || place.split(/\s+/).length > 4) return null;
  return { stem, place };
}

/**
 * The source lists often carry the same campus twice: "ABES Engineering
 * College" and "ABES Engineering College, Ghaziabad". Drop the twin. Identical
 * names in different states stay (there are dozens of "Government Polytechnic").
 */
export function collapseLocationDupes<T extends Row>(rows: T[]): T[] {
  const drop = new Set<string>();
  const byName = new Map<string, T[]>();
  for (const row of rows) {
    const key = alnum(row.name);
    byName.set(key, [...(byName.get(key) ?? []), row]);
  }
  for (const group of byName.values()) {
    const [keeper, ...extras] = group;
    for (const extra of extras) {
      const sameState = alnum(keeper.state).length > 0 && alnum(keeper.state) === alnum(extra.state);
      if (sameState || !keeper.state || !extra.state) drop.add(extra.id);
    }
  }
  for (const qualified of rows) {
    if (drop.has(qualified.id)) continue;
    const split = splitLocationSuffix(qualified.name);
    if (!split) continue;
    const stemKey = alnum(split.stem), placeKey = alnum(split.place);
    const stems = rows.filter((r) => !drop.has(r.id) && r.id !== qualified.id && alnum(r.name) === stemKey);
    if (!stems.length) continue;
    const match = stems.some((stem) => {
      const tokens = placeTokens(stem);
      return (placeKey.length >= 3 && tokens.has(placeKey)) || (stems.length === 1 && tokens.size === 0);
    });
    if (match) drop.add(qualified.id);
  }
  return rows.filter((r) => !drop.has(r.id));
}

/**
 * Up to 20 colleges matching every word typed, best known first. Empty for
 * fewer than two characters, and empty (not an error) where the catalogue
 * can't be read, so the field just takes what's typed.
 */
export async function searchColleges(sql: Db | null, query: string): Promise<CollegeOption[]> {
  const tokens = tokenize(query);
  const first = tokens[0];
  if (!sql || !first || first.length < 2) return [];
  const patterns = tokens.map((t) => `% ${t}%`);
  const { data, error } = await sql.rows<Row>`
    select id, name, state, district, city
      from public."College"
     where "isActive" and "searchText" like all (${patterns}::text[])
     order by tier,
              case when "searchText" like ${` ${first}%`} then 0 else 1 end,
              length(name), name
     limit 40
  `;
  if (error) {
    if (!MISSING.has(error.code ?? "")) console.error("college search failed:", error.code, error.message);
    return [];
  }
  return collapseLocationDupes(data ?? []).slice(0, 20).map(({ id, name, state, district }) => ({ id, name, state, district }));
}
