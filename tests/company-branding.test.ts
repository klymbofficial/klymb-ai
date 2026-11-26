import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { brandProps } from "../src/components/company/brand-style";
import { brandStorageMode } from "../src/lib/company/brand-storage-mode";
import {
  brandInitials,
  checkDraft,
  EMPTY_BRAND,
  logoKey,
  logoPath,
  parseLogoKey,
  readBrand,
  resolveBrand,
  sameBrand,
  sniffLogo,
  type BrandCompany,
} from "../src/lib/company/branding";

// T02: company branding, from the draft to every place it shows.

const read = (p: string) => readFileSync(p, "utf8");
const ACME_ID = "11111111-1111-4111-8111-111111111111";
const GLOBEX_ID = "22222222-2222-4222-8222-222222222222";
const acme: BrandCompany = { id: ACME_ID, slug: "acme", name: "Acme", brand_color: "#123456", logo_url: "https://acme.example/logo.png" };
const KEY = `company-brand/${ACME_ID}/0123456789abcdef.png`;

// ── The draft ───────────────────────────────────────────────

test("a draft is tidied: spaces collapsed, control characters out, empty fields unset", () => {
  const r = checkDraft({ displayName: "  Acme \u0007 Learning  ", accent: "1D4ED8", welcome: " Hello\n  there ", supportEmail: " Help@Acme.COM ", supportText: "" }, EMPTY_BRAND);
  assert.ok(r.ok);
  assert.deepEqual(r.value, { displayName: "Acme Learning", accent: "#1d4ed8", welcome: "Hello there", supportEmail: "help@acme.com", supportText: null, logo: null });
});

test("an accent that can't carry white text at AA is refused, with its ratio", () => {
  const r = checkDraft({ accent: "#ffcc00" }, EMPTY_BRAND);
  assert.equal(r.ok, false);
  assert.match(!r.ok ? r.errors.accent ?? "" : "", /needs at least 4\.5:1/);
  assert.equal(checkDraft({ accent: "#0f5e57" }, EMPTY_BRAND).ok, true);
  assert.match((checkDraft({ accent: "blue" }, EMPTY_BRAND) as { errors: Record<string, string> }).errors.accent, /6-digit hex/);
});

test("every problem is named by field, and nothing is half-saved", () => {
  const r = checkDraft({ displayName: "x".repeat(81), welcome: "y".repeat(401), supportEmail: "not-an-email", supportText: "z".repeat(121), logoAlt: "a".repeat(121) }, EMPTY_BRAND);
  assert.equal(r.ok, false);
  assert.deepEqual(Object.keys(!r.ok ? r.errors : {}).sort(), ["displayName", "logoAlt", "supportEmail", "supportText", "welcome"]);
});

test("the logo is kept or removed by the draft, never set from the form", () => {
  const current = { ...EMPTY_BRAND, logo: { key: KEY, alt: null } };
  const kept = checkDraft({ logoAlt: " Acme mark ", logo: { key: "company-brand/evil" } } as never, current);
  assert.ok(kept.ok);
  assert.deepEqual(kept.value.logo, { key: KEY, alt: "Acme mark" });
  const removed = checkDraft({ removeLogo: true }, current);
  assert.ok(removed.ok);
  assert.equal(removed.value.logo, null);
  const none = checkDraft({ logoAlt: "x" }, EMPTY_BRAND);
  assert.ok(none.ok);
  assert.equal(none.value.logo, null);
});

// ── What is stored, read back ───────────────────────────────

test("stored branding is read leniently: anything malformed reads as unset", () => {
  assert.deepEqual(readBrand(null, ACME_ID), EMPTY_BRAND);
  assert.deepEqual(readBrand([], ACME_ID), EMPTY_BRAND);
  assert.deepEqual(readBrand("x", ACME_ID), EMPTY_BRAND);
  const bad = readBrand({ displayName: 7, accent: "#ffff00", supportEmail: "nope", welcome: { x: 1 }, logo: { key: "../../etc/passwd" } }, ACME_ID);
  assert.deepEqual(bad, EMPTY_BRAND);
});

test("a stored logo must be this company's own file", () => {
  assert.deepEqual(readBrand({ logo: { key: KEY, alt: "Acme" } }, ACME_ID).logo, { key: KEY, alt: "Acme" });
  assert.equal(readBrand({ logo: { key: KEY } }, GLOBEX_ID).logo, null);
});

test("the same settings compare equal, and any change doesn't", () => {
  const a = readBrand({ displayName: "Acme", accent: "#0f5e57" }, ACME_ID);
  assert.equal(sameBrand(a, readBrand({ displayName: "Acme", accent: "#0f5e57" }, ACME_ID)), true);
  assert.equal(sameBrand(a, readBrand({ displayName: "Acme!", accent: "#0f5e57" }, ACME_ID)), false);
});

// ── Resolving what is shown ─────────────────────────────────

test("nothing published: the company's name, and Klymb admin's old logo link and colour if readable", () => {
  const b = resolveBrand(acme, null);
  assert.equal(b.name, "Acme");
  assert.equal(b.accent, "#123456");
  assert.equal(b.logoUrl, "https://acme.example/logo.png");
  assert.equal(resolveBrand({ ...acme, brand_color: "#ffff00", logo_url: "http://plain.example/x.png" }, null).accent, null);
  assert.equal(resolveBrand({ ...acme, logo_url: "http://plain.example/x.png" }, null).logoUrl, null);
});

test("published: its own fields win, and the old fallbacks no longer apply", () => {
  const b = resolveBrand(acme, readBrand({ displayName: "Acme Learning", welcome: "Hi", logo: { key: KEY } }, ACME_ID));
  assert.equal(b.name, "Acme Learning");
  assert.equal(b.accent, null, "a published brand without an accent is Klymb's colours, not the old fallback");
  assert.equal(b.logoUrl, `/api/company-brand/${ACME_ID}/0123456789abcdef.png`);
  assert.equal(b.logoAlt, "Acme Learning logo");
  assert.equal(b.welcome, "Hi");
  assert.equal(resolveBrand(acme, readBrand({}, ACME_ID)).logoUrl, null);
});

test("two companies resolve to different identities from the same code", () => {
  const one = resolveBrand(acme, readBrand({ displayName: "Acme", accent: "#1d4ed8" }, ACME_ID));
  const two = resolveBrand({ ...acme, id: GLOBEX_ID, slug: "globex", name: "Globex" }, readBrand({ displayName: "Globex Hub", accent: "#0f5e57" }, GLOBEX_ID));
  assert.notEqual(one.name, two.name);
  assert.notEqual(one.accent, two.accent);
  assert.deepEqual([one.slug, two.slug], ["acme", "globex"]);
});

test("the fallback mark is readable initials", () => {
  assert.equal(brandInitials("Acme India Pvt Ltd"), "AI");
  assert.equal(brandInitials("Globex"), "GL");
  assert.equal(brandInitials("  "), "?");
  assert.equal(brandInitials("élan & co"), "EC");
});

test("the accent re-points Klymb's red for everything inside, and nothing changes without one", () => {
  const props = brandProps("#0f5e57");
  const style = props.style as Record<string, string>;
  assert.equal(props["data-brand"], "");
  assert.equal(style["--brand-accent"], "#0f5e57");
  assert.equal(style["--color-red"], "#0f5e57", "the focus ring follows the accent");
  assert.match(style["--brand-press"], /^#[0-9a-f]{6}$/);
  assert.deepEqual(brandProps(null), {});
  assert.deepEqual(brandProps("red; background: url(x)"), {});
  const css = read("src/app/globals.css");
  for (const cls of ["bg-red-strong", "border-red-strong", "text-red-deep"]) assert.match(css, new RegExp(`\\[data-brand\\] \\.${cls}`), cls);
});

// ── Logo files ──────────────────────────────────────────────

test("logo keys are this company's, named by a 16-hex hash and an accepted extension", () => {
  assert.equal(logoKey(ACME_ID, "0123456789abcdef.png"), KEY);
  for (const file of ["../x.png", "0123456789abcdef.svg", "0123456789ABCDEF.png", "short.png", "0123456789abcdef.png/x"]) {
    assert.equal(logoKey(ACME_ID, file), null, file);
  }
  assert.equal(logoKey("not-a-uuid", "0123456789abcdef.png"), null);
  assert.deepEqual(parseLogoKey(KEY), { companyId: ACME_ID, file: "0123456789abcdef.png", ext: "png" });
  assert.equal(parseLogoKey(`system-design/lesson.mp4`), null, "a key can never reach the lesson videos");
  assert.equal(logoPath(KEY), `/api/company-brand/${ACME_ID}/0123456789abcdef.png`);
  assert.equal(logoPath("company-brand/x"), null);
});

test("a logo's type comes from its first bytes: PNG, JPEG, WebP; never SVG or anything else", () => {
  const bytes = (...b: number[]) => new Uint8Array([...b, ...new Array(16).fill(0)]);
  assert.equal(sniffLogo(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)), "png");
  assert.equal(sniffLogo(bytes(0xff, 0xd8, 0xff, 0xe0)), "jpg");
  assert.equal(sniffLogo(bytes(0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50)), "webp");
  assert.equal(sniffLogo(new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>')), null);
  assert.equal(sniffLogo(bytes(0x47, 0x49, 0x46, 0x38)), null, "GIF isn't accepted");
  assert.equal(sniffLogo(new Uint8Array()), null);
});

test("brand files go to R2 on Vercel or when asked, and to a local folder otherwise", () => {
  assert.equal(brandStorageMode({ NODE_ENV: "development" }), "local");
  assert.equal(brandStorageMode({ NODE_ENV: "development", R2_WRITE_ACCESS_KEY_ID: "x" }), "local", "write keys alone don't send a laptop's uploads to the real bucket");
  assert.equal(brandStorageMode({ NODE_ENV: "development", BRAND_STORAGE: "r2" }), "r2");
  assert.equal(brandStorageMode({ VERCEL_ENV: "preview", NODE_ENV: "production" }), "r2");
  assert.equal(brandStorageMode({ NODE_ENV: "production" }), "r2", "production never writes to a disk it doesn't keep");
});

test("the logo route serves published logos to anyone, drafts only to that company's admins, and only as an image", () => {
  const src = read("src/app/api/company-brand/[company]/[file]/route.ts");
  assert.match(src, /const key = logoKey\(company, file\)/);
  assert.match(src, /visibility === "draft"[\s\S]*m\.companyId === company && isAdmin\(m\)/);
  assert.match(src, /"X-Content-Type-Options": "nosniff"/);
  assert.match(src, /"Content-Security-Policy": "default-src 'none'; sandbox"/);
  assert.match(src, /visibility === "published" \? "public, max-age=31536000, immutable" : "private, no-store"/);
});

test("uploads are checked by size and first bytes, limited per admin, and stored under their hash", () => {
  const src = read("src/app/org/[slug]/(workspace)/branding/actions.ts");
  const fn = src.slice(src.indexOf("export async function uploadBrandLogo"), src.indexOf("export async function publishBrand"));
  const at = (s: string) => { const i = fn.indexOf(s); assert.ok(i >= 0, s); return i; };
  assert.ok(at("adminFor(slug)") < at("arrayBuffer()"));
  assert.ok(at("MAX_LOGO_BYTES") < at("putBrandFile("));
  assert.ok(at("sniffLogo(bytes)") < at("putBrandFile("));
  assert.ok(at('checkRateLimit("company_brand_logo"') < at("putBrandFile("));
  assert.match(fn, /createHash\("sha256"\)\.update\(bytes\)/);
});

test("every branding action checks for an admin of this company first", () => {
  const src = read("src/app/org/[slug]/(workspace)/branding/actions.ts");
  for (const fn of src.split(/\nexport async function /).slice(1)) {
    const first = fn.slice(fn.indexOf("> {")).match(/\b(adminFor|db|loadBranding)\(/)?.[1];
    assert.equal(first, "adminFor", fn.slice(0, 30));
  }
  assert.doesNotMatch(src, /companyId:\s*form|formData\.get\("company/);
});

test("publishing takes the saved draft as it is in the database", () => {
  const data = read("src/lib/company/branding-data.ts");
  assert.match(data, /set published = draft, published_at = now\(\), published_by = \$\{by\}/);
});

// ── Where the brand shows ───────────────────────────────────

test("the branded sign-in page reads only published branding, and follows only its own workspace's pages", () => {
  const src = read("src/app/org/[slug]/sign-in/page.tsx");
  assert.match(src, /publishedBrandBySlug\(sql, slug\)/);
  assert.doesNotMatch(src, /draft/);
  assert.match(src, /asked\.startsWith\(`\$\{home\}\/`\)/);
  assert.match(src, /<CompanySignInForm next=\{next\} \/>/);
});

test("the workspace frame and home use the published brand", () => {
  const layout = read("src/app/org/[slug]/(workspace)/layout.tsx");
  assert.match(layout, /getPublishedBrand\(member\)/);
  assert.match(layout, /\{\.\.\.brandProps\(brand\.accent\)\}/);
  assert.match(layout, /<OrgSidebar[\s\S]*brand=\{\{ name: brand\.name, logoUrl: brand\.logoUrl, logoAlt: brand\.logoAlt \}\}/);
  assert.match(layout, /supportHref=\{`mailto:\$\{brand\.supportEmail \?\? contact\.email\}`\}/);
});

test("an assigned course names the company only when a company assignment opens it", () => {
  const page = read("src/app/(course)/learn/system-design/page.tsx");
  assert.match(page, /assigningCompanyBrand\(sql, email, SD_COURSE\)/);
  const data = read("src/lib/company/branding-data.ts");
  const fn = data.slice(data.indexOf("export async function assigningCompanyBrand"));
  assert.match(fn, /a\.revoked_at is null and m\.removed_at is null/);
});

test("migration 0073 keeps a draft and a published version, both JSON objects, safe to re-run", () => {
  const sql = read("db/migrations/0073_company_branding.sql");
  assert.match(sql, /create table if not exists course\.company_branding/);
  assert.match(sql, /company_id uuid primary key references course\.companies \(id\) on delete cascade/);
  assert.match(sql, /check \(jsonb_typeof\(draft\) = 'object'\)/);
  assert.match(sql, /check \(\(published is null\) = \(published_at is null\)\)/);
});

// ── The invite email ────────────────────────────────────────

test("an invite links to the company's own sign-in page, with its logo on Klymb's address and its support contact", () => {
  // mail.ts is server-only, so its template is checked as written.
  const mail = read("src/lib/mail.ts");
  const fn = mail.slice(mail.indexOf("export function companyInviteEmail"), mail.indexOf("/** The line under every reminder"));
  assert.match(fn, /p\.company\.slug \? `\$\{p\.siteUrl\}\/org\/\$\{p\.company\.slug\}\/sign-in` : `\$\{p\.siteUrl\}\/org\/sign-in`/);
  assert.match(fn, /p\.company\.logoUrl\?\.startsWith\("\/"\) \? `\$\{p\.siteUrl\}\$\{p\.company\.logoUrl\}`/);
  assert.match(fn, /Questions about your workspace\? Write to/);
  assert.match(fn, /esc\(p\.company\.supportEmail\)/);
  const invite = read("src/lib/company/invite.ts");
  assert.match(invite, /slug: brand\.slug,\s*supportEmail: brand\.supportEmail, supportText: brand\.supportText/);
});
