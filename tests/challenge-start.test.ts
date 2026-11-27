import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { allTracks, challenges, getTrack, isOneClickStart } from "../src/data/tracks";
import { accountsMissing, checkGithubUrl, checkLinkedinPostUrl } from "../src/lib/learner/evidence";

const read = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8").replace(/\r\n/g, "\n");

test("every open, built challenge starts in one click, and no career track does", () => {
  for (const c of challenges) assert.equal(isOneClickStart(c), true, `${c.slug} should start on sign-in`);
  for (const t of allTracks.filter((t) => t.kind !== "challenge")) {
    assert.equal(isOneClickStart(t), false, `${t.slug} still has its registration form`);
  }
  assert.equal(isOneClickStart(undefined), false);
  assert.equal(isOneClickStart(getTrack("not-a-track")), false);
});

test("a challenge that is not open or not built yet keeps the form", () => {
  const claude = getTrack("claude")!;
  assert.equal(isOneClickStart({ ...claude, available: false }), false, "not open for sign-up");
  assert.equal(isOneClickStart({ ...claude, contentLive: false }), false, "no Day 1 to land on");
});

/**
 * Order is what matters, and the action needs a session and a database, so
 * this reads the source: with nobody signed in it must return before it reads
 * or writes anything.
 */
test("startChallenge returns before any read or write when nobody is signed in", () => {
  const src = read("../src/app/(register)/register/start-challenge.ts");
  const fn = src.slice(src.indexOf("export async function startChallenge"));
  const guard = fn.indexOf("if (!email) {");
  assert.ok(guard > 0, "there is a sign-in guard");
  for (const effect of ["checkRateLimit(", "db()", "enrolLearner(", "sendWelcome(", "after("]) {
    const at = fn.indexOf(effect);
    assert.ok(at > guard, `${effect} comes after the guard`);
  }
  assert.match(fn, /const email = verifiedEmailFrom\(session\);/, "the address is the verified Google one");
});

test("startChallenge starts only open challenges, never trusts the browser for the address, and writes no registration", () => {
  const src = read("../src/app/(register)/register/start-challenge.ts");
  assert.match(src, /isOneClickStart\(found\)/, "the track is checked against the one-click rule");
  assert.doesNotMatch(src, /formData|input\.email|email:\s*track/, "nothing the browser sends names the address");
  assert.doesNotMatch(src, /course\.registrations|insert into/i, "no registrations row, no raw write");
  // Where Google returns to is built from the track's own slug, not from anything passed in.
  assert.match(src, /redirectTo: `\/challenges\/\$\{found\.slug\}`/);
});

test("only the call that made the place sends the welcome", () => {
  const src = read("../src/app/(register)/register/start-challenge.ts");
  assert.match(src, /if \(outcome === "created"\) after\(\(\) => sendWelcome\(/);
});

test("neither page enrols while it renders: that takes a press", () => {
  const page = read("../src/app/(register)/register/page.tsx");
  assert.doesNotMatch(page, /startChallenge|enrolLearner|ensureLearner|start-challenge/, "a GET (or a prefetch) must not enrol anyone");
  assert.match(page, /redirect\(`\/challenges\/\$\{defaultTrack\}`\)/, "old challenge links go to the challenge page");
  const button = read("../src/components/challenge/ChallengeEnroll.tsx");
  assert.match(button, /"use client"/);
  // After Google, only a press this tab remembers finishes the enrolment: nothing in the address can.
  assert.match(button, /const pressed = takePress\(slug\);/);
  assert.match(button, /if \(pressed\) return run\(false\);/);
});

test("the challenge button carries the privacy line, and the career-track form keeps its agreement box", () => {
  const button = read("../src/components/challenge/ChallengeEnroll.tsx");
  assert.match(button, /<ChallengeConsent/);
  const consent = read("../src/components/home/ChallengeConsent.tsx");
  assert.match(consent, /Privacy Policy/);
  const form = read("../src/components/home/RegistrationForm.tsx");
  assert.match(form, /id="consent"/);
  assert.match(form, /id="github"/);
});

test("with no accounts saved, the errors point at the Your accounts card", () => {
  const github = checkGithubUrl("https://github.com/asha/repo/blob/main/day-1/README.md", null);
  assert.match(github ?? "", /Your accounts/);
  const post = checkLinkedinPostUrl("https://www.linkedin.com/posts/asha-rao_day-1-activity-1", null);
  assert.match(post ?? "", /Your accounts/);
});

test("the day page asks for the accounts above the submit box", () => {
  const page = read("../src/app/(learn)/learn/tracks/[slug]/day/[day]/page.tsx");
  const card = page.indexOf("<DayAccountsCard");
  const submit = page.indexOf("<DaySubmission");
  assert.ok(card > 0 && submit > card, "the card comes before the submit form");
  const comp = read("../src/components/learner/DayAccountsCard.tsx");
  assert.match(comp, /useState\(\(\) => accountsMissing\(accounts, needsLinkedin\)\)/, "decided once, so it stays up after saving");
});

test("the day page asks for the accounts only when a submission would be refused without them", () => {
  const none = { githubUsername: null, linkedinSlug: null };
  const githubOnly = { githubUsername: "asha", linkedinSlug: null };
  const both = { githubUsername: "asha", linkedinSlug: "asha-rao" };
  // A challenge, or a day that asks for a LinkedIn post, needs both.
  assert.equal(accountsMissing(none, true), true);
  assert.equal(accountsMissing(githubOnly, true), true);
  assert.equal(accountsMissing(both, true), false);
  // Any other day needs only GitHub: someone who registered with a repository is not nagged for LinkedIn.
  assert.equal(accountsMissing(none, false), true);
  assert.equal(accountsMissing(githubOnly, false), false);
  assert.equal(accountsMissing(both, false), false);
});
