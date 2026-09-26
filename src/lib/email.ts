/**
 * Canonical email handling.
 *
 * Every identity lookup compares exact, lowercase values. The previous code
 * used Postgres ILIKE, where a stored value containing % or _ acts as a
 * wildcard: "a_min@klymb.ai" would match "admin@klymb.ai". Identity must be
 * equality, never pattern matching.
 */

const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
export const EMAIL_MAX_LENGTH = 254;

/** Lowercased and trimmed, or null when it is not a usable address. */
export function normaliseEmail(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const value = input.trim().toLowerCase();
  if (!value || value.length > EMAIL_MAX_LENGTH) return null;
  return EMAIL_SHAPE.test(value) ? value : null;
}

/** True when two addresses are the same identity. Case-insensitive, never fuzzy. */
export function sameEmail(a: unknown, b: unknown): boolean {
  const left = normaliseEmail(a);
  const right = normaliseEmail(b);
  return left !== null && left === right;
}
