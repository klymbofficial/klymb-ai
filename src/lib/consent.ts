/** Cookie-consent state, shared by the banner, the analytics loader and the policy page. */
export const CONSENT_COOKIE = "klymb_consent";
export const CONSENT_VERSION = "2026-09-17";
export const CONSENT_MAX_AGE_DAYS = 180;

export type ConsentChoice = "all" | "necessary";

export interface ConsentState {
  choice: ConsentChoice;
  version: string;
}

export function readConsent(): ConsentState | null {
  if (typeof document === "undefined") return null;
  const raw = document.cookie.split("; ").find((c) => c.startsWith(`${CONSENT_COOKIE}=`))?.split("=")[1];
  if (!raw) return null;
  try {
    const parsed = JSON.parse(decodeURIComponent(raw)) as ConsentState;
    // A new policy version asks again rather than assuming the old answer still holds.
    return parsed.version === CONSENT_VERSION ? parsed : null;
  } catch {
    return null;
  }
}

export function writeConsent(choice: ConsentChoice) {
  const value = encodeURIComponent(JSON.stringify({ choice, version: CONSENT_VERSION }));
  const maxAge = CONSENT_MAX_AGE_DAYS * 24 * 60 * 60;
  document.cookie = `${CONSENT_COOKIE}=${value}; path=/; max-age=${maxAge}; SameSite=Lax`;
  window.dispatchEvent(new CustomEvent("klymb:consent", { detail: { choice } }));
}

export function clearConsent() {
  document.cookie = `${CONSENT_COOKIE}=; path=/; max-age=0; SameSite=Lax`;
  window.dispatchEvent(new CustomEvent("klymb:consent", { detail: { choice: null } }));
}
