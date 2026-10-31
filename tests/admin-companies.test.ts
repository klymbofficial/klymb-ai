import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import {
  MAX_SEATS,
  RESERVED_SLUGS,
  brandColor,
  companyName,
  companySlug,
  firstHrBlocked,
  hrEmail,
  logoUrl,
  personName,
  seatCount,
  slugFromName,
  type Checked,
} from "../src/lib/admin/companies";

const value = <T>(r: Checked<T>) => {
  assert.ok(r.ok, r.ok ? "" : r.message);
  return r.value;
};
const refused = <T>(r: Checked<T>, pattern?: RegExp) => {
  assert.equal(r.ok, false, `accepted: ${JSON.stringify(r)}`);
  if (pattern && !r.ok) assert.match(r.message, pattern);
};

// ── Name and URL name ───────────────────────────────────────

test("company names are trimmed, single-spaced and required", () => {
  assert.equal(value(companyName("  Acme   India  ")), "Acme India");
  refused(companyName("   "));
  refused(companyName(undefined));
  refused(companyName("x".repeat(121)));
});

test("a URL name is suggested from the company name", () => {
  assert.equal(slugFromName("Acme India Pvt. Ltd."), "acme-india-pvt-ltd");
  assert.equal(slugFromName("  Café & Co  "), "cafe-co");
  assert.equal(slugFromName("---"), "");
  assert.ok(slugFromName("a ".repeat(80)).length <= 60);
  assert.doesNotMatch(slugFromName("a ".repeat(80)), /-$/);
});

test("URL names follow the database's shape", () => {
  assert.equal(value(companySlug(" Acme-India ")), "acme-india");
  for (const bad of ["", "acme india", "acme--india", "-acme", "acme-", "acme_india", "ácme", "a".repeat(61)]) refused(companySlug(bad));
});

test("URL names can't take a Klymb page's address", () => {
  for (const slug of RESERVED_SLUGS) refused(companySlug(slug), /taken by a Klymb page/);
  refused(companySlug("SIGN-IN"));
});

test("the reserved list matches the database rule", () => {
  const migration = readFileSync("db/migrations/0011_company_signin_codes.sql", "utf8");
  assert.deepEqual([...RESERVED_SLUGS], ["sign-in"]);
  assert.match(migration, /check \(slug <> 'sign-in'\)/);
});

// ── Color and logo ──────────────────────────────────────────

test("colors are 6-digit hex, stored lowercase with a #", () => {
  assert.equal(value(brandColor("#83050B")), "#83050b");
  assert.equal(value(brandColor("83050b")), "#83050b");
  assert.equal(value(brandColor("")), null);
  for (const bad of ["#fff", "#83050", "#83050bb", "red", "#gg0000", "rgb(1,2,3)"]) refused(brandColor(bad));
});

test("a logo is an https link, or nothing", () => {
  assert.equal(value(logoUrl(" https://acme.com/logo.png ")), "https://acme.com/logo.png");
  assert.equal(value(logoUrl("")), null);
});

test("logo links that aren't plain https are refused", () => {
  refused(logoUrl("http://acme.com/logo.png"), /https/);
  refused(logoUrl("javascript:alert(1)"));
  refused(logoUrl("data:image/png;base64,AAAA"));
  refused(logoUrl("//acme.com/logo.png"));
  refused(logoUrl("not a link"));
  refused(logoUrl("https://user:secret@acme.com/logo.png"), /username or password/);
  refused(logoUrl(`https://acme.com/${"a".repeat(2000)}`), /too long/);
});

// ── Seats ───────────────────────────────────────────────────

test("seats are whole numbers up to the maximum", () => {
  assert.equal(value(seatCount("25", 0)), 25);
  assert.equal(value(seatCount(" 0 ", 0)), 0);
  assert.equal(value(seatCount(MAX_SEATS, 0)), MAX_SEATS);
  for (const bad of ["", "-1", "2.5", "1e3", "ten", String(MAX_SEATS + 1)]) refused(seatCount(bad, 0));
});

test("seats can never go below the people already in the company", () => {
  assert.equal(value(seatCount("3", 3)), 3);
  refused(seatCount("2", 3), /already has 3 people, so it needs at least 3 seats/);
  refused(seatCount("0", 1), /already has 1 person/);
});

// ── First HR person ─────────────────────────────────────────

const open = { seatCount: 5, members: 0, hasHr: false, isLearner: false, memberOf: null };

test("the first HR person can be added when there is a free seat and no HR yet", () => {
  assert.equal(firstHrBlocked(open), null);
});

test("only the first: a company that has HR refuses another", () => {
  assert.match(firstHrBlocked({ ...open, hasHr: true, members: 1 }) ?? "", /already has an HR person/);
});

test("adding HR needs a free seat", () => {
  assert.match(firstHrBlocked({ ...open, seatCount: 0 }) ?? "", /no free seat/);
  assert.match(firstHrBlocked({ ...open, seatCount: 2, members: 2 }) ?? "", /no free seat/);
});

test("a Klymb learner's email is refused", () => {
  assert.match(firstHrBlocked({ ...open, isLearner: true }) ?? "", /Klymb learner/);
});

test("someone already in a company can't join another", () => {
  assert.match(firstHrBlocked({ ...open, memberOf: "globex" }) ?? "", /already belongs to a company \(globex\)/);
});

test("HR emails are canonicalised, names tidied and optional", () => {
  assert.equal(value(hrEmail(" HR@Acme.com ")), "hr@acme.com");
  refused(hrEmail("not-an-email"));
  assert.equal(personName("  Priya   Sharma "), "Priya Sharma");
  assert.equal(personName("   "), null);
  assert.equal(personName("x".repeat(100))?.length, 80);
});

// ── Wiring: access, database guards, policy ─────────────────

const actions = readFileSync("src/app/admin/company-actions.ts", "utf8");

test("every company action checks for an admin before anything else", () => {
  for (const name of ["createCompany", "updateCompanySettings", "addFirstHr"]) {
    const body = actions.slice(actions.indexOf(`export async function ${name}`));
    const firstLines = body.split("\n").slice(0, 6).join("\n");
    assert.match(firstLines, /const admin = await getAdmin\(\);\s*if \(!admin\) return NOT_ALLOWED;/, name);
  }
});

test("the page itself requires an admin", () => {
  const page = readFileSync("src/app/admin/(dashboard)/companies/page.tsx", "utf8");
  assert.match(page, /await requireAdmin\(\)/);
  const data = readFileSync("src/lib/admin/companies-data.ts", "utf8");
  assert.match(data, /if \(!\(await getAdmin\(\)\)\) return null;/);
});

test("the HR insert re-checks seats, existing HR and learners in the same statement", () => {
  const insert = actions.slice(actions.indexOf("insert into course.company_members"));
  const statement = insert.slice(0, insert.indexOf("`"));
  assert.match(statement, /< c\.seat_count/);
  assert.match(statement, /not exists \(select 1 from course\.company_members m where m\.company_id = c\.id and m\.role = 'hr'\)/);
  assert.match(statement, /not exists \(select 1 from course\.learners l where l\.email = /);
});

test("the seat update re-checks the member count in the same statement", () => {
  assert.match(actions, /set logo_url = .*seat_count = \$\{seats\.value\}\s+where id = \$\{id\}\s+and \$\{seats\.value\} >= \(select count\(\*\) from course\.company_members/);
});

test("every change is recorded, and every recorded action has a label", () => {
  const audit = readFileSync("src/lib/admin/audit.ts", "utf8");
  const labels = readFileSync("src/app/admin/(dashboard)/audit/page.tsx", "utf8");
  for (const action of ["company.create", "company.update", "company.hr_add"]) {
    assert.match(actions, new RegExp(`logAdmin\\(admin, "${action.replace(".", "\\.")}"`), action);
    assert.ok(audit.includes(`"${action}"`), `${action} missing from AuditAction`);
    assert.ok(labels.includes(`"${action}":`), `${action} has no label`);
  }
});

test("the page is in the admin menu for every admin", () => {
  const nav = readFileSync("src/components/admin/AdminNav.tsx", "utf8");
  const links = nav.slice(nav.indexOf("const links"), nav.indexOf("const ownerLinks"));
  assert.match(links, /href: "\/admin\/companies"/);
});

test("migration 0012 adds the logo and seats with the same rules", () => {
  const sql = readFileSync("db/migrations/0012_company_admin.sql", "utf8");
  assert.match(sql, /add column if not exists logo_url text/);
  assert.match(sql, /add column if not exists seat_count integer not null default 0/);
  assert.match(sql, /check \(logo_url ~ '\^https:\/\/' and char_length\(logo_url\) <= 2000\)/);
  assert.match(sql, /check \(seat_count between 0 and 100000\)/);
  assert.equal(MAX_SEATS, 100000);
});

test("logos from any https site can display, while scripts stay locked down", () => {
  const config = readFileSync("next.config.ts", "utf8");
  assert.match(config, /"img-src 'self' data: blob: https:"/);
  assert.doesNotMatch(config, /script-src[^"`]*\bhttps:(?!\/\/)/);
});
