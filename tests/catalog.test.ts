import { strict as assert } from "node:assert";
import { test } from "node:test";
import { allTracks } from "../src/data/tracks";
import { availablePrograms, industries, programs, roles, unavailablePrograms } from "../src/data/catalog";

/** A program you can start has a real start link; one you cannot has none, whatever else it says. */
test("only available programs carry a start link", () => {
  for (const p of programs) {
    if (p.status === "available") assert.ok(p.startHref, `${p.slug} is available but has no start link`);
    else assert.equal(p.startHref, undefined, `${p.slug} is not available but points somewhere to start`);
  }
});

test("every open career track is a built, listed track, and invite-only ones stay out", () => {
  const invite = allTracks.filter((t) => t.listed === false).map((t) => t.slug);
  for (const p of availablePrograms.filter((x) => x.track)) {
    const t = allTracks.find((x) => x.slug === p.track);
    assert.ok(t && t.available && t.contentLive && t.listed !== false, `${p.slug} is not an open, listed track`);
    assert.equal(p.startHref, `/register?track=${p.track}`);
  }
  for (const slug of invite) assert.ok(!programs.some((p) => p.slug === slug), `${slug} is invite-only but is in the catalog`);
});

test("the programs we have not built are listed as not available", () => {
  const names = unavailablePrograms.map((p) => p.name).sort();
  assert.deepEqual(names, ["AI in Banking", "AI in Healthcare", "AI in Insurance", "Cybersecurity", "Red Teaming"]);
});

test("slugs are unique and every role and industry named exists", () => {
  assert.equal(new Set(programs.map((p) => p.slug)).size, programs.length);
  const roleSlugs = new Set(roles.map((r) => r.slug));
  const industrySlugs = new Set(industries.map((i) => i.slug));
  for (const p of programs) {
    for (const r of p.roles) assert.ok(roleSlugs.has(r), `${p.slug}: unknown role ${r}`);
    for (const i of p.industries) assert.ok(industrySlugs.has(i), `${p.slug}: unknown industry ${i}`);
    assert.ok(p.industries.length > 0, `${p.slug} has no industry`);
  }
});
