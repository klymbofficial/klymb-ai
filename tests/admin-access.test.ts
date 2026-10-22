import { strict as assert } from "node:assert";
import { test } from "node:test";
import { dailyCounts, daysUntilCohortEnds, isOwnerEmail, ownerEmails, removalBlocked, resolveAdmin, type AdminRow } from "../src/lib/admin/access";

const OWNERS = ["owner@klymb.ai"];
const table: AdminRow[] = [
  { email: "owner@klymb.ai", name: "Owner" },
  { email: "helper@klymb.ai", name: null },
];
const lookup = async (email: string) => table.find((r) => r.email === email) ?? null;

test("an email on the list is an admin, canonicalised", async () => {
  assert.deepEqual(await resolveAdmin("  Helper@Klymb.AI ", lookup, OWNERS), { email: "helper@klymb.ai", name: null, owner: false });
});

test("an owner on the list is an owner", async () => {
  assert.equal((await resolveAdmin("owner@klymb.ai", lookup, OWNERS))?.owner, true);
});

test("an email not on the list is not an admin", async () => {
  assert.equal(await resolveAdmin("someone@gmail.com", lookup, OWNERS), null);
});

test("being on the owner list alone grants nothing", async () => {
  assert.equal(await resolveAdmin("owner@klymb.ai", async () => null, OWNERS), null);
});

test("no session (unverified emails arrive as null) is not an admin, and the table isn't asked", async () => {
  let asked = false;
  const spy = async () => { asked = true; return table[0]; };
  assert.equal(await resolveAdmin(null, spy, OWNERS), null);
  assert.equal(await resolveAdmin("not-an-email", spy, OWNERS), null);
  assert.equal(asked, false);
});

test("a lookup returning a different row is refused", async () => {
  assert.equal(await resolveAdmin("a_min@klymb.ai", async () => ({ email: "admin@klymb.ai", name: null }), OWNERS), null);
});

test("owner list comes from the env, with the Klymb account as the fallback", () => {
  assert.deepEqual(ownerEmails("A@x.com, b@y.com ,bad"), ["a@x.com", "b@y.com"]);
  assert.deepEqual(ownerEmails(undefined), ["klymbofficial@gmail.com"]);
  assert.deepEqual(ownerEmails("  "), ["klymbofficial@gmail.com"]);
  assert.equal(isOwnerEmail("KlymbOfficial@gmail.com", ownerEmails(undefined)), true);
});

test("only owners remove admins, and never an owner", () => {
  const owner = { email: "owner@klymb.ai", name: null, owner: true };
  const helper = { email: "helper@klymb.ai", name: null, owner: false };
  assert.equal(removalBlocked("helper@klymb.ai", owner, OWNERS), null);
  assert.match(removalBlocked("helper@klymb.ai", helper, OWNERS) ?? "", /Only an owner/);
  assert.match(removalBlocked("Owner@klymb.ai", owner, OWNERS) ?? "", /Owners can't be removed/);
});

test("days until a cohort's 30 days end, in IST", () => {
  const start = "2026-10-01";
  assert.equal(daysUntilCohortEnds(start, new Date("2026-10-01T00:00:00+05:30")), 30);
  assert.equal(daysUntilCohortEnds(start, new Date("2026-10-30T12:00:00+05:30")), 1);
  assert.equal(daysUntilCohortEnds(start, new Date("2026-10-31T00:00:00+05:30")), 0);
  assert.equal(daysUntilCohortEnds("garbage"), 0);
});

test("daily counts bucket by IST day and fill empty days", () => {
  const now = new Date("2026-10-22T10:00:00+05:30");
  // 23:30 UTC on the 20th is already the 21st in India.
  const rows = dailyCounts(["2026-10-20T23:30:00Z", "2026-10-22T01:00:00+05:30", "2026-10-22T09:00:00+05:30", "2026-09-01T00:00:00Z"], 3, now);
  assert.deepEqual(rows, [
    { date: "2026-10-20", count: 0 },
    { date: "2026-10-21", count: 1 },
    { date: "2026-10-22", count: 2 },
  ]);
});
