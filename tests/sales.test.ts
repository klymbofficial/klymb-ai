import { strict as assert } from "node:assert";
import { test } from "node:test";
import { formatPhone, normalisePhone, pace, parseCsv, parseLeadsCsv, period } from "../src/lib/sales";

test("phones become digits with a country code, Indian by default", () => {
  assert.equal(normalisePhone("98765 43210"), "919876543210");
  assert.equal(normalisePhone("+91-98765-43210"), "919876543210");
  assert.equal(normalisePhone("09876543210"), "919876543210");
  assert.equal(normalisePhone("0044 20 7946 0958"), "442079460958");
  assert.equal(normalisePhone("12345"), null);
  assert.equal(normalisePhone(""), null);
  assert.equal(formatPhone("919876543210"), "+91 98765 43210");
});

test("CSV parsing handles quotes, commas and newlines inside fields", () => {
  const rows = parseCsv('name,notes\r\n"Gupta, A","said ""later""\nafter exams"\n\n');
  assert.deepEqual(rows, [["name", "notes"], ["Gupta, A", 'said "later"\nafter exams']]);
});

test("lead import maps common headers, cleans values and skips bad rows", () => {
  const csv = [
    "Full Name,Mobile Number,Email,College,Source,Status",
    "Asha,98765 43210,ASHA@x.com,IIT,Webinar,warm",
    "Ravi,98765-43210,,,,", // same phone as Asha
    ",9999999999,,,,",
    "Meena,12,bad-email,,,",
    "Kabir,,kabir@y.in,,unknown,nonsense",
  ].join("\n");
  const r = parseLeadsCsv(csv, "bought");
  assert.deepEqual(r.missingHeaders, []);
  assert.equal(r.rows.length, 2);
  assert.deepEqual(r.rows[0], { name: "Asha", phone: "919876543210", email: "asha@x.com", source: "webinar", source_detail: null, org: "IIT", stage: "warm", notes: null });
  assert.equal(r.rows[1].source, "bought");
  assert.equal(r.rows[1].stage, "new");
  assert.deepEqual(r.skipped.map((s) => s.line), [3, 4, 5]);
});

test("lead import refuses a file without name and contact columns", () => {
  assert.deepEqual(parseLeadsCsv("foo,bar\n1,2", "other").missingHeaders, ["name", "phone or email"]);
});

test("MTD starts at IST midnight on the 1st and compares the same days last month", () => {
  // 13 Nov 2026, 10:00 IST
  const now = new Date("2026-11-13T04:30:00Z");
  const p = period("mtd", now);
  assert.equal(p.start.toISOString(), "2026-10-31T18:30:00.000Z");
  assert.equal(p.prevStart.toISOString(), "2026-09-30T18:30:00.000Z");
  assert.equal(p.prevEnd.getTime() - p.prevStart.getTime(), now.getTime() - p.start.getTime());
  assert.equal(p.month, "2026-11-01");
  assert.equal(p.dayOfMonth, 13);
  assert.equal(p.daysInMonth, 30);
});

test("MTD just after midnight IST on the 1st belongs to the new month", () => {
  const p = period("mtd", new Date("2026-11-30T18:45:00Z")); // 1 Dec, 00:15 IST
  assert.equal(p.month, "2026-12-01");
});

test("YTD is the Indian financial year", () => {
  assert.equal(period("ytd", new Date("2026-11-13T04:30:00Z")).start.toISOString(), "2026-03-31T18:30:00.000Z");
  assert.equal(period("ytd", new Date("2027-02-01T04:30:00Z")).label, "FY 2026–27");
});

test("pace is linear through the month", () => {
  assert.deepEqual(pace(5, 15, 13, 30), { expected: 7, onPace: false, needPerDay: 1 });
  assert.equal(pace(10, 15, 13, 30).onPace, true);
});
