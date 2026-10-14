/**
 * Klymb.ai is closed to the public for now. While true, every public page
 * shows the "back soon" page (HTTP 503, so search engines keep the listing);
 * the learner app (/learn), admin and the APIs stay open. Set to false to
 * reopen the site.
 */
export const SITE_CLOSED = true;

/** Paths that stay open while the site is closed. */
const OPEN_PREFIXES = ["/learn", "/admin", "/api", "/closed", "/_next", "/_vercel"];

export function staysOpen(pathname: string) {
  if (OPEN_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))) return true;
  // Static files (icons, images, the service worker, robots, manifest): anything with an extension.
  return /\.[a-z0-9]+$/i.test(pathname);
}
