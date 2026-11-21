import { contrastWithWhite, readableBrandColor } from "@/lib/company/brand";
import { normaliseEmail } from "@/lib/email";

/**
 * A company's branding (course.company_branding, migration 0048): the rules
 * for a draft, reading what is stored, and turning a company plus its
 * published branding into what a page or an email shows. Pure, so it can be
 * tested and used on the client for the live preview.
 *
 * One shape everywhere: the workspace, the branded sign-in page, invite
 * emails and the bar on an assigned course all take a ResolvedBrand, so a
 * published change reaches all of them at once.
 */

export interface BrandLogo {
  /** The storage key: company-brand/<company id>/<16 hex>.<png|jpg|webp>. Never a URL. */
  key: string;
  /** What a screen reader says. Null means the display name. */
  alt: string | null;
}

export interface BrandSettings {
  displayName: string | null;
  /** #rrggbb that carries white text at WCAG AA (4.5:1). Null means Klymb's own. */
  accent: string | null;
  welcome: string | null;
  supportEmail: string | null;
  supportText: string | null;
  logo: BrandLogo | null;
}

export const EMPTY_BRAND: BrandSettings = { displayName: null, accent: null, welcome: null, supportEmail: null, supportText: null, logo: null };

export const BRAND_LIMITS = { displayName: 80, welcome: 400, supportText: 120, logoAlt: 120 } as const;

/** Accepted logo types, by what the file's first bytes say (never by its name). */
export const LOGO_TYPES = { png: "image/png", jpg: "image/jpeg", webp: "image/webp" } as const;
export type LogoExt = keyof typeof LOGO_TYPES;
export const MAX_LOGO_BYTES = 512 * 1024;

const UUID = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
const LOGO_FILE = /^[0-9a-f]{16}\.(png|jpg|webp)$/;
const LOGO_KEY = new RegExp(`^company-brand/(${UUID})/([0-9a-f]{16}\\.(?:png|jpg|webp))$`);

/** One line of text: control characters out, spaces collapsed, trimmed, cut to `max`. Empty is null. */
function line(input: unknown, max: number): string | null {
  if (typeof input !== "string") return null;
  const value = input.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, max).trim();
  return value || null;
}

/** #rrggbb, lowercased, or null. */
function hex(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const raw = input.trim().toLowerCase();
  const value = raw.startsWith("#") ? raw : `#${raw}`;
  return /^#[0-9a-f]{6}$/.test(value) ? value : null;
}

/** The storage key for a company's logo file. */
export function logoKey(companyId: string, file: string): string | null {
  return new RegExp(`^${UUID}$`).test(companyId) && LOGO_FILE.test(file) ? `company-brand/${companyId}/${file}` : null;
}

/** The company and file a logo key names, or null when it isn't one. */
export function parseLogoKey(key: unknown): { companyId: string; file: string; ext: LogoExt } | null {
  if (typeof key !== "string") return null;
  const m = LOGO_KEY.exec(key);
  if (!m) return null;
  return { companyId: m[1], file: m[2], ext: m[2].split(".")[1] as LogoExt };
}

/** Where a logo is served from: Klymb's own route, never the storage host. */
export function logoPath(key: string): string | null {
  const parsed = parseLogoKey(key);
  return parsed ? `/api/company-brand/${parsed.companyId}/${parsed.file}` : null;
}

/** What a file's first bytes say it is, or null when it isn't an accepted image. SVG never is: it can carry script. */
export function sniffLogo(bytes: Uint8Array): LogoExt | null {
  const at = (i: number, ...b: number[]) => b.every((v, j) => bytes[i + j] === v);
  if (bytes.length >= 8 && at(0, 0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)) return "png";
  if (bytes.length >= 3 && at(0, 0xff, 0xd8, 0xff)) return "jpg";
  if (bytes.length >= 12 && at(0, 0x52, 0x49, 0x46, 0x46) && at(8, 0x57, 0x45, 0x42, 0x50)) return "webp";
  return null;
}

/**
 * What is stored, read leniently: anything malformed reads as unset, so a bad
 * row can never put an unchecked value on a page. `companyId` pins the logo
 * to that company's own files.
 */
export function readBrand(raw: unknown, companyId: string): BrandSettings {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return { ...EMPTY_BRAND };
  const r = raw as Record<string, unknown>;
  const accent = hex(r.accent);
  const logoRaw = r.logo && typeof r.logo === "object" ? (r.logo as Record<string, unknown>) : null;
  const parsed = logoRaw ? parseLogoKey(logoRaw.key) : null;
  return {
    displayName: line(r.displayName, BRAND_LIMITS.displayName),
    accent: accent && contrastWithWhite(accent) >= 4.5 ? accent : null,
    welcome: line(r.welcome, BRAND_LIMITS.welcome),
    supportEmail: normaliseEmail(r.supportEmail),
    supportText: line(r.supportText, BRAND_LIMITS.supportText),
    logo: parsed && parsed.companyId === companyId ? { key: logoRaw!.key as string, alt: line(logoRaw!.alt, BRAND_LIMITS.logoAlt) } : null,
  };
}

export type BrandField = "displayName" | "accent" | "welcome" | "supportEmail" | "supportText" | "logoAlt";

/**
 * A draft from the form, checked strictly: every problem is named by field,
 * so the form can say what to fix. The logo itself is set by the upload, not
 * the form; `logo` here only carries the alt text and whether to keep it.
 */
export function checkDraft(
  input: { displayName?: unknown; accent?: unknown; welcome?: unknown; supportEmail?: unknown; supportText?: unknown; logoAlt?: unknown; removeLogo?: unknown },
  current: BrandSettings,
): { ok: true; value: BrandSettings } | { ok: false; errors: Partial<Record<BrandField, string>> } {
  const errors: Partial<Record<BrandField, string>> = {};
  const long = (v: unknown, max: number) => typeof v === "string" && v.trim().length > max;

  if (long(input.displayName, BRAND_LIMITS.displayName)) errors.displayName = `Keep the name under ${BRAND_LIMITS.displayName} characters.`;
  if (long(input.welcome, BRAND_LIMITS.welcome)) errors.welcome = `Keep the welcome under ${BRAND_LIMITS.welcome} characters.`;
  if (long(input.supportText, BRAND_LIMITS.supportText)) errors.supportText = `Keep this under ${BRAND_LIMITS.supportText} characters.`;
  if (long(input.logoAlt, BRAND_LIMITS.logoAlt)) errors.logoAlt = `Keep this under ${BRAND_LIMITS.logoAlt} characters.`;

  let accent: string | null = null;
  if (typeof input.accent === "string" && input.accent.trim()) {
    accent = hex(input.accent);
    if (!accent) errors.accent = "Use a 6-digit hex colour, like #1d4ed8.";
    else {
      const ratio = contrastWithWhite(accent);
      if (ratio < 4.5) errors.accent = `White text on this colour is ${ratio.toFixed(1)}:1; it needs at least 4.5:1. Choose a darker shade.`;
    }
  }

  let supportEmail: string | null = null;
  if (typeof input.supportEmail === "string" && input.supportEmail.trim()) {
    supportEmail = normaliseEmail(input.supportEmail);
    if (!supportEmail) errors.supportEmail = "Enter a valid email address, or leave it empty.";
  }

  if (Object.keys(errors).length) return { ok: false, errors };
  return {
    ok: true,
    value: {
      displayName: line(input.displayName, BRAND_LIMITS.displayName),
      accent,
      welcome: line(input.welcome, BRAND_LIMITS.welcome),
      supportEmail,
      supportText: line(input.supportText, BRAND_LIMITS.supportText),
      logo: input.removeLogo === true || !current.logo ? null : { key: current.logo.key, alt: line(input.logoAlt, BRAND_LIMITS.logoAlt) },
    },
  };
}

/** Whether two settings would look the same. */
export function sameBrand(a: BrandSettings, b: BrandSettings): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

/** The company row a brand is resolved against (0010 and 0012). */
export interface BrandCompany {
  id: string;
  slug: string;
  name: string;
  brand_color: string | null;
  logo_url: string | null;
}

/** What a page or an email shows for a company. */
export interface ResolvedBrand {
  companyId: string;
  slug: string;
  name: string;
  /** Carries white text at AA. Null: Klymb's own colours. */
  accent: string | null;
  /** A path on this site (/api/company-brand/…), an https link set by Klymb admin before 0048, or null. */
  logoUrl: string | null;
  logoAlt: string;
  welcome: string | null;
  supportEmail: string | null;
  supportText: string | null;
}

/**
 * A company's look from its published branding, or from what Klymb admin set
 * before branding existed when it has published nothing. A draft is passed
 * here only for the admin's own preview.
 */
export function resolveBrand(company: BrandCompany, settings: BrandSettings | null): ResolvedBrand {
  const s = settings ?? EMPTY_BRAND;
  const name = s.displayName ?? company.name;
  const logoUrl = s.logo ? logoPath(s.logo.key) : !settings && company.logo_url?.startsWith("https://") ? company.logo_url : null;
  return {
    companyId: company.id,
    slug: company.slug,
    name,
    accent: s.accent ?? (settings ? null : readableBrandColor(company.brand_color)),
    logoUrl,
    logoAlt: s.logo?.alt ?? `${name} logo`,
    welcome: s.welcome,
    supportEmail: s.supportEmail,
    supportText: s.supportText,
  };
}

/** Initials for the logo fallback: "Acme India" → "AI". Letters and digits only. */
export function brandInitials(name: string): string {
  const words = name.normalize("NFKD").replace(/[^\p{L}\p{N}\s]/gu, "").split(/\s+/).filter(Boolean);
  const letters = (words.length > 1 ? [words[0][0], words[1][0]] : [...(words[0] ?? "")].slice(0, 2)).join("");
  return letters.toUpperCase() || "?";
}
