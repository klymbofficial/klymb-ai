import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * A candidate's private link: /assessment/<id>.<generation>.<signature>.
 *
 * Nothing secret is stored. The signature is an HMAC of the candidate row's
 * id and link_generation, keyed by the app's AUTH_SECRET (with its own
 * prefix, so it can't stand in for anything Auth.js signs). The same row and
 * generation always give the same link, so a retried delivery sends the link
 * already out there; reissuing bumps the generation, which turns the old
 * link off. Changing AUTH_SECRET turns every link off.
 */

const PREFIX = "klymb.candidate-link.v1";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

function signature(secret: string, id: string, generation: number): string {
  return createHmac("sha256", secret).update(`${PREFIX}:${id}:${generation}`).digest("base64url").slice(0, 32);
}

export function signCandidateToken(secret: string, id: string, generation: number): string {
  return `${id}.${generation}.${signature(secret, id, generation)}`;
}

/** The row and generation a token names, when its signature holds. Null otherwise. */
export function readCandidateToken(secret: string, token: unknown): { id: string; generation: number } | null {
  if (typeof token !== "string" || token.length > 120) return null;
  const [id, gen, sig, ...rest] = token.split(".");
  if (rest.length || !id || !gen || !sig || !UUID.test(id) || !/^[1-9]\d{0,5}$/.test(gen)) return null;
  const generation = Number(gen);
  const want = Buffer.from(signature(secret, id, generation));
  const given = Buffer.from(sig);
  return given.length === want.length && timingSafeEqual(given, want) ? { id, generation } : null;
}

const secret = () => process.env.AUTH_SECRET || null;

/** The full link for one candidate, or null when the server has no AUTH_SECRET to sign it with. */
export function candidateLink(siteUrl: string, id: string, generation: number): string | null {
  const key = secret();
  return key ? `${siteUrl}/assessment/${signCandidateToken(key, id, generation)}` : null;
}

export function readCandidateLink(token: unknown): { id: string; generation: number } | null {
  const key = secret();
  return key ? readCandidateToken(key, token) : null;
}
