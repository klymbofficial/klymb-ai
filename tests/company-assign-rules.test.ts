import { strict as assert } from "node:assert";
import { test } from "node:test";
import { dueState, planAssignment, readAssignForm, sameRecipients, todayIst, type AssignPerson } from "../src/lib/company/assign-rules";

const TODAY = "2026-11-23";
const TEAM_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const TEAM_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const teams = [{ id: TEAM_A, name: "Engineering" }, { id: TEAM_B, name: "Sales" }];
const person = (email: string, teamId: string | null, over: Partial<AssignPerson> = {}): AssignPerson => ({ email, name: null, teamId, assigned: false, ownAccess: false, ...over });
const people = [
  person("ana@x.test", TEAM_A),
  person("bo@x.test", TEAM_A, { assigned: true }),
  person("cy@x.test", TEAM_A, { ownAccess: true }),
  person("di@x.test", TEAM_B),
  person("ed@x.test", null),
];
const emails = (list: AssignPerson[]) => list.map((p) => p.email);
const form = (over: Record<string, unknown>) => readAssignForm({ requirement: "required", dueOn: "", targetKind: "everyone", emails: [], teamId: null, ...over }, TODAY);

test("a required assignment may carry a due date from today to a year ahead; a recommendation never does", () => {
  assert.deepEqual(form({ dueOn: "2026-12-15" }), { ok: true, value: { requirement: "required", dueOn: "2026-12-15", target: { kind: "everyone" } } });
  assert.equal(form({ dueOn: TODAY }).ok, true);
  assert.equal(form({ dueOn: "2026-11-22" }).ok, false, "in the past");
  assert.equal(form({ dueOn: "2027-12-01" }).ok, false, "more than a year ahead");
  assert.equal(form({ dueOn: "2026-02-30" }).ok, false, "not a real day");
  assert.deepEqual(form({ requirement: "recommended", dueOn: "2026-12-15" }), { ok: true, value: { requirement: "recommended", dueOn: null, target: { kind: "everyone" } } });
  assert.equal(form({ requirement: "mandatory" }).ok, false);
});

test("people are read as valid, distinct, lowercase emails; a team needs an id", () => {
  assert.deepEqual(form({ targetKind: "people", emails: ["Ana@X.test", "ana@x.test"] }), { ok: true, value: { requirement: "required", dueOn: null, target: { kind: "people", emails: ["ana@x.test"] } } });
  assert.equal(form({ targetKind: "people", emails: [] }).ok, false);
  assert.equal(form({ targetKind: "people", emails: ["not an email"] }).ok, false);
  assert.equal(form({ targetKind: "team", teamId: "x" }).ok, false);
  assert.equal(form({ targetKind: "nobody" }).ok, false);
});

test("everyone reaches only people without the course, and says who already has it", () => {
  const plan = planAssignment(people, teams, { kind: "everyone" }, { kind: "company" });
  assert.ok(plan.ok);
  assert.deepEqual(emails(plan.value.recipients), ["ana@x.test", "di@x.test", "ed@x.test"]);
  assert.deepEqual(emails(plan.value.alreadyAssigned), ["bo@x.test"]);
  assert.deepEqual(emails(plan.value.ownAccess), ["cy@x.test"]);
  assert.equal(plan.value.label, "Everyone");
});

test("a team reaches its members now, and keeps the team's name", () => {
  const plan = planAssignment(people, teams, { kind: "team", teamId: TEAM_A }, { kind: "company" });
  assert.ok(plan.ok);
  assert.deepEqual(emails(plan.value.recipients), ["ana@x.test"]);
  assert.equal(plan.value.label, "Team: Engineering");
  assert.equal(plan.value.teamId, TEAM_A);
  assert.equal(planAssignment(people, teams, { kind: "team", teamId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc" }, { kind: "company" }).ok, false);
});

test("a lead assigns only within their own team", () => {
  const lead = { kind: "team", teamId: TEAM_A } as const;
  assert.ok(planAssignment(people, teams, { kind: "team", teamId: TEAM_A }, lead).ok);
  assert.ok(planAssignment(people, teams, { kind: "people", emails: ["ana@x.test"] }, lead).ok);
  assert.equal(planAssignment(people, teams, { kind: "team", teamId: TEAM_B }, lead).ok, false);
  assert.equal(planAssignment(people, teams, { kind: "people", emails: ["di@x.test"] }, lead).ok, false);
  assert.equal(planAssignment(people, teams, { kind: "everyone" }, lead).ok, false);
});

test("chosen people must be in the company; one person is labelled by email", () => {
  assert.equal(planAssignment(people, teams, { kind: "people", emails: ["zed@x.test"] }, { kind: "company" }).ok, false);
  const one = planAssignment(people, teams, { kind: "people", emails: ["ed@x.test"] }, { kind: "company" });
  assert.ok(one.ok && one.value.label === "ed@x.test");
  const two = planAssignment(people, teams, { kind: "people", emails: ["ed@x.test", "di@x.test"] }, { kind: "company" });
  assert.ok(two.ok && two.value.label === "2 people");
});

test("recipient lists compare as sets", () => {
  assert.equal(sameRecipients(["b", "a"], ["a", "b"]), true);
  assert.equal(sameRecipients(["a"], ["a", "b"]), false);
  assert.equal(sameRecipients(["a", "c"], ["a", "b"]), false);
});

test("a due date reads as overdue, due within a week, or later, until the person finishes", () => {
  assert.equal(dueState("2026-11-22", false, TODAY), "overdue");
  assert.equal(dueState("2026-11-30", false, TODAY), "soon");
  assert.equal(dueState("2026-12-01", false, TODAY), "later");
  assert.equal(dueState("2026-11-22", true, TODAY), null);
  assert.equal(dueState(null, false, TODAY), null);
});

test("today is the date in India", () => {
  assert.equal(todayIst(new Date("2026-11-23T19:00:00Z")), "2026-11-24");
  assert.equal(todayIst(new Date("2026-11-23T18:00:00Z")), "2026-11-23");
});
