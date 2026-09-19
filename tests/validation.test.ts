import { strict as assert } from "node:assert";
import { test } from "node:test";
import { clamp, LIMITS, safeUrl, validateRegistration, type RegistrationData } from "../src/lib/validation";

const valid: RegistrationData = {
  name: "Sarthak Gupta",
  email: "sarthak@klymb.ai",
  phone: "+919876543210",
  track: "project-manager",
  currentRole: "Coordinator / PM",
  experience: "3–5 years",
  linkedin: "",
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
