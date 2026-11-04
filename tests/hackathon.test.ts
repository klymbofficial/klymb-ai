import { strict as assert } from "node:assert";
import { test } from "node:test";
import { HACKATHON, hackathonPhase, rosterOpen } from "../src/data/hackathon";
import { makeTeamCode, normaliseTeamCode, parseEntry, parseMark, parseMemberDetails } from "../src/lib/hackathon-validate";

const form = (o: Record<string, string>) => { const f = new FormData(); for (const [k, v] of Object.entries(o)) f.set(k, v); return f; };
const dates = { registrationClosesUtc: "2026-12-04T12:30:00Z", kickoffUtc: "2026-12-04T14:30:00Z", deadlineUtc: "2026-12-06T15:15:00Z" };

test("no dates means coming soon, whatever the clock says", () => {
  assert.equal(hackathonPhase(false), "coming-soon");
});

test("the phase follows the dates, and published results come last", () => {
  const at = (iso: string) => hackathonPhase(false, Date.parse(iso), dates);
  assert.equal(at("2026-12-01T00:00:00Z"), "registration");
  assert.equal(at("2026-12-04T13:00:00Z"), "closed");
  assert.equal(at("2026-12-05T00:00:00Z"), "live");
  assert.equal(at("2026-12-07T00:00:00Z"), "judging");
  assert.equal(hackathonPhase(true, Date.parse("2026-12-05T00:00:00Z"), dates), "results");
});

test("the roster stays open until its lock, or always without one", () => {
  assert.equal(rosterOpen(Date.parse("2026-12-01T00:00:00Z"), "2026-12-02T00:00:00Z"), true);
  assert.equal(rosterOpen(Date.parse("2026-12-03T00:00:00Z"), "2026-12-02T00:00:00Z"), false);
  assert.equal(rosterOpen(Date.now(), null), true);
});

test("team codes are six characters, without look-alikes, and typed codes are forgiven", () => {
  const code = makeTeamCode();
  assert.match(code, /^[A-HJKMNP-Z2-9]{6}$/);
  assert.equal(normaliseTeamCode(" abc 234 "), "ABC234");
  assert.equal(normaliseTeamCode("abc"), null);
});

test("a registrant's details are checked", () => {
  assert.deepEqual(Object.keys(parseMemberDetails(form({ name: "D", phone: "12", college: "", graduationYear: "27" })).errors).sort(), ["college", "graduationYear", "name", "phone"]);
  assert.deepEqual(parseMemberDetails(form({ name: "Divya Rao", phone: "+91 98765 43210", college: "COEP", graduationYear: "2027" })).errors, {});
});

test("an entry needs a known problem, a GitHub repo and https links", () => {
  const ids = HACKATHON.briefs.map((b) => b.id);
  const bad = parseEntry(form({ briefId: "nope", repoUrl: "https://gitlab.com/a/b", liveUrl: "http://x.com", aiLogUrl: "" }), ids);
  assert.deepEqual(Object.keys(bad.errors).sort(), ["aiLogUrl", "briefId", "liveUrl", "repoUrl"]);
  const good = parseEntry(form({ briefId: ids[0], repoUrl: "https://github.com/a/b", liveUrl: "https://b.vercel.app", aiLogUrl: "https://github.com/a/b/blob/main/PROMPTS.md" }), ids);
  assert.deepEqual(good.errors, {});
});

test("marks are whole numbers from 0 to 10", () => {
  assert.equal(parseMark("7"), 7);
  assert.equal(parseMark("11"), null);
  assert.equal(parseMark("6.5"), null);
});

test("the briefs carry no other brand", () => {
  assert.equal(HACKATHON.briefs.length, 3);
  assert.ok(!/abtalks|app\.klymb/i.test(JSON.stringify(HACKATHON.briefs)));
});
