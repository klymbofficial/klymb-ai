/**
 * Klymb.ai is closed for now. While true, every page, including the learner
 * app (/learn), shows the "back soon" page (HTTP 503, so search engines keep
 * the listing). Only admin and the APIs stay open. Set to false to reopen.
 */
export const SITE_CLOSED = false;

/** Paths that stay open while the site is closed. */
const OPEN_PREFIXES = ["/admin", "/api", "/closed", "/_next", "/_vercel"];

export function staysOpen(pathname: string) {
  if (OPEN_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))) return true;
  // Static files (icons, images, the service worker, robots, manifest): anything with an extension.
  return /\.[a-z0-9]+$/i.test(pathname);
}

/**
 * Temporarily, no money anywhere on the platform: no pricing section or link,
 * no "free"/"payment"/"refund"/"fee" wording, no pay or refund pages, no
 * Payments tab in admin. Set to false to bring it all back.
 */
export const HIDE_MONEY = true;
