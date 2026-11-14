/**
 * A company's look in the emails Klymb sends for it (invites). Pure, so the
 * tests can import it.
 */

export interface CompanyBrand {
  name: string;
  logoUrl: string | null;
  brandColor: string | null;
}

/** WCAG relative luminance of a #rrggbb color. */
function luminance(hex: string): number {
  const channel = (i: number) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(1) + 0.7152 * channel(3) + 0.0722 * channel(5);
}

/** The contrast of white text on this color, from 1 to 21. */
export function contrastWithWhite(hex: string): number {
  return 1.05 / (luminance(hex) + 0.05);
}

/**
 * The company's color when white text on it is readable (WCAG AA, 4.5:1),
 * otherwise null so the email keeps Klymb's maroon.
 */
export function readableBrandColor(color: string | null | undefined): string | null {
  if (!color || !/^#[0-9a-f]{6}$/i.test(color)) return null;
  return contrastWithWhite(color) >= 4.5 ? color.toLowerCase() : null;
}

/**
 * "Acme via Klymb.ai". Quotes, angle brackets and control characters are
 * dropped so the name can't break the From header or pose as another address.
 */
export function inviteSenderName(companyName: string): string {
  const clean = companyName
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/["<>\\@]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 60)
    .trim();
  return clean ? `${clean} via Klymb.ai` : "Klymb.ai";
}

/** Resend limits: per person, so nobody is flooded, and per HR person, so one account can't spam. */
export const RESEND_LIMITS = {
  perPerson: { limit: 1, windowMinutes: 10 },
  perHr: { limit: 50, windowMinutes: 60 },
} as const;
