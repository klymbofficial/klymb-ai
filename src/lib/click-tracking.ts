/**
 * What a tap on a link or button means, for click analytics. Pure, so it's
 * unit-tested. Nothing personal leaves: no query strings, no form values, and
 * mailto/tel links are reported by type only, never by address or number.
 */

export type LinkType = "internal" | "outbound" | "whatsapp" | "email" | "phone" | "button";

export interface ClickInfo { label: string; type: LinkType; url: string }

const clean = (s: string, max: number) => s.replace(/\s+/g, " ").trim().slice(0, max);

/** The link or button's kind and where it goes, from its href and the address of the page it's on. */
export function linkOf(href: string | null, page: string): { type: LinkType; url: string } {
  let host: string;
  try {
    host = new URL(page).host;
  } catch {
    return { type: "internal", url: "" };
  }
  if (!href) return { type: "button", url: "" };
  const lower = href.trim().toLowerCase();
  if (lower.startsWith("mailto:")) return { type: "email", url: "mailto" };
  if (lower.startsWith("tel:")) return { type: "phone", url: "tel" };
  if (lower.startsWith("javascript:")) return { type: "button", url: "" };
  let u: URL;
  try {
    u = new URL(href, page);
  } catch {
    return { type: "internal", url: "" };
  }
  const where = `${u.host}${u.pathname}`.replace(/\/$/, "");
  if (/(^|\.)(wa\.me|whatsapp\.com)$/.test(u.hostname)) return { type: "whatsapp", url: u.hostname === "chat.whatsapp.com" ? "chat.whatsapp.com" : u.hostname };
  if (u.host !== host && !u.hostname.endsWith("klymb.ai")) return { type: "outbound", url: clean(where, 100) };
  return { type: "internal", url: clean(`${u.pathname}${u.hash}`, 100) || "/" };
}

/** The words to report: a data-track name first, then the accessible name, then the visible text. */
export function labelOf(el: { dataset?: { track?: string }; getAttribute(n: string): string | null; textContent: string | null }) {
  const named = el.dataset?.track || el.getAttribute("aria-label") || el.getAttribute("title") || el.textContent || "";
  return clean(named, 60);
}
