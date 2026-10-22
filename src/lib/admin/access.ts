import { normaliseEmail } from "@/lib/email";

/**
 * The admin rule, kept free of the database and of Next so it can be tested.
 *
 * An admin is a verified email with a row in admin_users. An owner is an
 * admin whose email is also on the owner list: only owners may add or remove
 * admins, and an owner can never be removed through the admin UI, so the site
 * can't be locked out of its own admin by a misclick.
 */

export interface AdminRow {
  email: string;
  name: string | null;
}

export interface AdminIdentity extends AdminRow {
  owner: boolean;
}

const DEFAULT_OWNERS = "klymbofficial@gmail.com";

/** ADMIN_OWNER_EMAILS, comma separated. Falls back to the Klymb account. */
export function ownerEmails(raw: string | undefined = process.env.ADMIN_OWNER_EMAILS): string[] {
  const list = (raw?.trim() ? raw : DEFAULT_OWNERS)
    .split(",")
    .map(normaliseEmail)
    .filter((e): e is string => e !== null);
  return list.length ? list : [DEFAULT_OWNERS];
}

export function isOwnerEmail(email: unknown, owners: string[] = ownerEmails()): boolean {
  const value = normaliseEmail(email);
  return value !== null && owners.includes(value);
}

/**
 * Resolves a signed-in (already verified) email to an admin, or null.
 * `lookup` must be an exact, lowercase match against admin_users.
 */
export async function resolveAdmin(
  email: unknown,
  lookup: (email: string) => Promise<AdminRow | null>,
  owners: string[] = ownerEmails(),
): Promise<AdminIdentity | null> {
  const value = normaliseEmail(email);
  if (!value) return null;
  const row = await lookup(value);
  // A row whose stored email differs from the asked one is never trusted.
  if (!row || normaliseEmail(row.email) !== value) return null;
  return { email: value, name: row.name, owner: owners.includes(value) };
}

/** Why an admin may not be removed, or null when they may. */
export function removalBlocked(target: unknown, by: AdminIdentity, owners: string[] = ownerEmails()): string | null {
  if (!by.owner) return "Only an owner can remove admins.";
  const value = normaliseEmail(target);
  if (!value) return "That is not a valid email.";
  if (owners.includes(value)) return "Owners can't be removed here. Change ADMIN_OWNER_EMAILS instead.";
  return null;
}

/** Days until a cohort's 30 days are over, counted from its start date (0 once it has ended). */
export function daysUntilCohortEnds(cohortStart: string, now: Date = new Date(), length = 30): number {
  const start = Date.parse(`${cohortStart}T00:00:00+05:30`);
  if (Number.isNaN(start)) return 0;
  const end = start + length * 864e5;
  return Math.max(0, Math.ceil((end - now.getTime()) / 864e5));
}

/** One count per IST calendar day for the last `days` days, oldest first. Days with nothing show 0. */
export function dailyCounts(timestamps: string[], days: number, now: Date = new Date()): { date: string; count: number }[] {
  const ist = (t: number) => new Date(t + 5.5 * 36e5).toISOString().slice(0, 10);
  const out = Array.from({ length: days }, (_, i) => ({ date: ist(now.getTime() - (days - 1 - i) * 864e5), count: 0 }));
  const index = new Map(out.map((d, i) => [d.date, i]));
  for (const t of timestamps) {
    const ms = Date.parse(t);
    if (Number.isNaN(ms)) continue;
    const i = index.get(ist(ms));
    if (i !== undefined) out[i].count++;
  }
  return out;
}
