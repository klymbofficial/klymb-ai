import { strict as assert } from "node:assert";
import { test } from "node:test";
import { validateOrgEnquiry } from "../src/lib/org-enquiry";

test("a full enquiry is cleaned: email lowercased, phone with country code, spaces squeezed", () => {
  const r = validateOrgEnquiry({ name: "  Priya   Shah ", email: "Priya@Acme.COM", org: " Acme  Corp ", phone: "98765 43210" });
  assert.deepEqual(r, { ok: true, data: { name: "Priya Shah", email: "priya@acme.com", org: "Acme Corp", phone: "919876543210" } });
});

test("every missing field gets its own message", () => {
  const r = validateOrgEnquiry({});
  assert.equal(r.ok, false);
  if (!r.ok) assert.deepEqual(Object.keys(r.errors).sort(), ["email", "name", "org", "phone"]);
});

test("a bad email or a too-short phone is refused; non-strings are ignored", () => {
  const r = validateOrgEnquiry({ name: "Priya", email: "priya@acme", org: "Acme", phone: "12345" });
  assert.equal(r.ok, false);
  if (!r.ok) assert.deepEqual(Object.keys(r.errors).sort(), ["email", "phone"]);
  assert.equal(validateOrgEnquiry({ name: 42, email: "a@b.co", org: "Acme", phone: "9876543210" }).ok, false);
});
