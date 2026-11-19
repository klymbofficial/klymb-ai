/**
 * Where company sign-in sends someone afterwards: back to the workspace page
 * they asked for. Pure, so the tests can import it, and free of Next so the
 * proxy can too.
 *
 * The path travels as ?next= on /org/sign-in and through the sign-in form,
 * so it is untrusted every time it is read. Only a path inside a workspace,
 * on this site, is ever followed; anything else falls back to /org, which
 * picks the person's own workspace.
 */

/** Set by src/proxy.ts on /org/ requests: the path and query that were asked for. */
export const ORG_PATH_HEADER = "x-klymb-org-path";

const MAX_LENGTH = 512;
const SIGN_IN = "/org/sign-in";

/** A workspace page on this site (/org/<slug>/…), or null. */
export function safeOrgNext(raw: unknown): string | null {
  if (typeof raw !== "string" || raw.length === 0 || raw.length > MAX_LENGTH) return null;
  // Path and optional query, nothing else: no scheme, host, fragment, backslash or control character.
  const match = /^(\/org\/[a-z0-9]+(?:-[a-z0-9]+)*(?:\/[A-Za-z0-9._~%@!$&'()*+,;=:-]+)*\/?)(\?[A-Za-z0-9._~%@!$&'()*+,;=:/?-]*)?$/.exec(raw);
  if (!match) return null;
  const path = match[1];
  if (path === SIGN_IN || path.startsWith(`${SIGN_IN}/`)) return null;
  // A segment that is or decodes to "." or ".." would let the browser climb out of /org.
  for (const segment of path.split("/")) {
    let decoded: string;
    try {
      decoded = decodeURIComponent(segment);
    } catch {
      return null;
    }
    if (decoded === "." || decoded === ".." || /[/\\]/.test(decoded)) return null;
  }
  // Belt and braces: resolved against any origin, it must stay on that origin and under /org/.
  const resolved = new URL(raw, "https://klymb.invalid");
  if (resolved.origin !== "https://klymb.invalid" || !resolved.pathname.startsWith("/org/")) return null;
  return raw;
}

/** The sign-in page, carrying where to return to when there is somewhere safe. */
export function signInHref(next: unknown): string {
  const safe = safeOrgNext(next);
  return safe ? `${SIGN_IN}?next=${encodeURIComponent(safe)}` : SIGN_IN;
}
