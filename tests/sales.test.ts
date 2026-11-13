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

test("rows pasted from Google Sheets are tab-separated and may have no header", () => {
  const pasted = "Asha Verma\t98765 43210\tAsked about EMI\nRavi\t+91 98765 00002\t";
  const r = parseLeadsCsv(pasted, "other");
  assert.deepEqual(r.missingHeaders, []);
  assert.deepEqual(r.rows.map((x) => [x.name, x.phone, x.notes]), [["Asha Verma", "919876543210", "Asked about EMI"], ["Ravi", "919876500002", null]]);
  const withHeader = parseLeadsCsv("Name\tMobile\tStatus\nMeena\t9876500003\tWarm", "other");
  assert.equal(withHeader.rows[0].stage, "warm");
});

test("the morning digest lists due leads, flags overdue ones and escapes names", async () => {
  const { salesDigestEmail } = await import("../src/lib/sales-digest");
  const mail = salesDigestEmail({
    name: "Sarthak", today: "2026-11-14", siteUrl: "https://www.klymb.ai",
    leads: [
      { id: "a", name: "Asha <b>", phone: "919876500001", stage: "positive", next_follow_up: "2026-11-12", notes: "EMI?" },
      { id: "b", name: "Ravi", phone: null, stage: "warm", next_follow_up: "2026-11-14", notes: null },
    ],
  });
  assert.equal(mail.subject, "2 follow-ups today (1 overdue)");
  assert.ok(mail.html.includes("Asha &lt;b&gt;"));
  assert.ok(mail.text.includes("Asha <b> (+91 98765 00001), Positive, overdue since 2026-11-12: EMI?"));
  assert.ok(mail.html.includes("https://www.klymb.ai/admin/sales/leads/a"));
});

test("addDays steps calendar days across a month end", async () => {
  const { addDays } = await import("../src/lib/sales");
  assert.equal(addDays("2026-11-30", 1), "2026-12-01");
});
