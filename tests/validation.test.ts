import { strict as assert } from "node:assert";
import { test } from "node:test";
import { clamp, LIMITS, parseRepoUrl, safeUrl, validateRegistration, type RegistrationData } from "../src/lib/validation";

const valid: RegistrationData = {
  name: "Sarthak Gupta",
  email: "sarthak@klymb.ai",
  phone: "+919876543210",
  track: "project-manager",
  currentRole: "Coordinator / PM",
  experience: "3–5 years",
  linkedin: "",
  github: "https://github.com/sarthak/pm-delivery-portfolio",
  repoConfirm: true,
  consent: true,
};

test("accepts a well-formed registration", () => {
  assert.deepEqual(validateRegistration(valid), {});
});

test("rejects choices that are not on the server-side allowlists", () => {
  assert.ok(validateRegistration({ ...valid, track: "ceo" as RegistrationData["track"] }).track);
  assert.ok(validateRegistration({ ...valid, currentRole: "Supreme Leader" }).currentRole);
  assert.ok(validateRegistration({ ...valid, experience: "900 years" }).experience);
});

test("caps free text", () => {
  assert.ok(validateRegistration({ ...valid, name: "x".repeat(LIMITS.name + 1) }).name);
  assert.equal(clamp("  hello  ", 4), "hell");
});

test("only accepts LinkedIn URLs in the LinkedIn field", () => {
  assert.equal(validateRegistration({ ...valid, linkedin: "https://linkedin.com/in/x" }).linkedin, undefined);
  assert.ok(validateRegistration({ ...valid, linkedin: "https://evil.example/in/x" }).linkedin);
});

test("safeUrl allows only http(s) and enforces a ceiling", () => {
  assert.equal(safeUrl("https://github.com/x/y"), "https://github.com/x/y");
  assert.equal(safeUrl("javascript:alert(1)"), null);
  assert.equal(safeUrl("data:text/html,<script>"), null);
  assert.equal(safeUrl(`https://example.com/${"a".repeat(600)}`, 100), null);
});

test("requires consent", () => {
  assert.ok(validateRegistration({ ...valid, consent: false }).consent);
});

test("requires a GitHub repository URL, not a profile or another host", () => {
  assert.ok(validateRegistration({ ...valid, github: "" }).github);
  assert.ok(validateRegistration({ ...valid, github: "https://github.com/sarthak" }).github);
  assert.ok(validateRegistration({ ...valid, github: "https://gitlab.com/sarthak/repo" }).github);
  assert.ok(validateRegistration({ ...valid, github: "https://github.com/sarthak/repo/tree/main" }).github);
  assert.ok(validateRegistration({ ...valid, github: `https://github.com/${"a".repeat(LIMITS.github)}` }).github);
});

test("requires the repository confirmation", () => {
  assert.ok(validateRegistration({ ...valid, repoConfirm: false }).repoConfirm);
});

test("parses repository links to a canonical URL", () => {
  assert.deepEqual(parseRepoUrl("github.com/Sarthak/qa-evidence-portfolio.git/"), {
    owner: "Sarthak", repo: "qa-evidence-portfolio", url: "https://github.com/Sarthak/qa-evidence-portfolio",
  });
  assert.equal(parseRepoUrl("https://www.github.com/a/b")?.url, "https://github.com/a/b");
  assert.equal(parseRepoUrl("https://github.com/a/.."), null);
  assert.equal(parseRepoUrl("https://github.com/-bad/repo"), null);
});
