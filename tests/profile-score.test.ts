import { strict as assert } from "node:assert";
import { test } from "node:test";
import { EMPTY_PROFILE, scoreProfile } from "../src/lib/profile-score";

const full = {
  ...EMPTY_PROFILE,
  name: "Divya Rao", headline: "Final-year CS student building AI tools", phone: "+91 98765 43210", city: "Pune", status: "student" as const,
  institution: "COEP", degree: "B.Tech Computer Science", graduationYear: 2027, noExperience: true,
  skills: ["Python", "SQL", "React"], githubUsername: "divya", linkedinSlug: "divya-rao", portfolioUrl: "https://divya.dev",
};

test("an empty profile scores 0, a full one 100", () => {
  assert.equal(scoreProfile(EMPTY_PROFILE, { hasPhoto: false }).score, 0);
  const s = scoreProfile(full, { hasPhoto: true });
  assert.equal(s.score, 100);
  assert.equal(s.ready, true);
  assert.deepEqual(s.missing, []);
  assert.equal(s.sections.reduce((n, x) => n + x.weight, 0), 100);
});

test("\"no work experience yet\" completes the experience section", () => {
  const a = scoreProfile({ ...full, noExperience: false }, { hasPhoto: true });
  const b = scoreProfile(full, { hasPhoto: true });
  assert.equal(b.score - a.score, 15);
});

test("skills earn five each up to three, and say how many are left", () => {
  const one = scoreProfile({ ...full, skills: ["Python"] }, { hasPhoto: true });
  assert.equal(one.score, 90);
  assert.ok(one.missing.includes("2 more skills"));
  assert.ok(scoreProfile({ ...full, skills: ["Python", "python"] }, { hasPhoto: true }).missing.includes("2 more skills"), "a repeated skill counts once");
});

test("the still-to-add list puts the most valuable first", () => {
  const s = scoreProfile({ ...full, phone: "", portfolioUrl: "" }, { hasPhoto: true });
  assert.deepEqual(s.missing, ["Phone number", "Portfolio or résumé link"]);
});

test("70 is not ready without the essentials", () => {
  const s = scoreProfile({ ...full, phone: "" }, { hasPhoto: true });
  assert.ok(s.score >= 70);
  assert.equal(s.ready, false);
});
