import "server-only";
import { db } from "@/lib/db/client";
import { seal, unseal } from "@/lib/linkedin/oauth";

/**
 * course.linkedin_connections: one learner's permission to post, sealed.
 * See db/migrations/0008_linkedin.sql for what is kept and why.
 */

export interface Connection { accessToken: string; memberUrn: string; name: string | null; expiresAt: string }

/** What is sealed in the `secret` column. */
interface Sealed { t: string; u: string; n: string | null }

export async function saveConnection(email: string, c: Connection & { scope: string }, secret: string) {
  const sql = db();
  if (!sql) return false;
  const sealed = seal(JSON.stringify({ t: c.accessToken, u: c.memberUrn, n: c.name } satisfies Sealed), secret, email);
  const { error } = await sql.run`
    insert into course.linkedin_connections (email, secret, scope, expires_at)
    values (${email}, ${sealed}, ${c.scope}, ${c.expiresAt})
    on conflict (email) do update
      set secret = excluded.secret, scope = excluded.scope, expires_at = excluded.expires_at, updated_at = now()
  `;
  return !error;
}

/**
 * The learner's connection, or null when there is none that can still post.
 * An expired one, or one that no longer opens (AUTH_SECRET was rotated), is
 * deleted on the way: it can never be used again.
 */
export async function loadConnection(email: string, secret: string): Promise<Connection | null> {
  const sql = db();
  if (!sql) return null;
  const { data } = await sql.row<{ secret: string; expires_at: string }>`
    select secret, expires_at from course.linkedin_connections where email = ${email}
  `;
  if (!data) return null;
  const opened = Date.parse(data.expires_at) > Date.now() ? unseal(data.secret, secret, email) : null;
  let parsed: Sealed | null = null;
  try { parsed = opened ? (JSON.parse(opened) as Sealed) : null; } catch { parsed = null; }
  if (!parsed?.t || !parsed.u) {
    await deleteConnection(email);
    return null;
  }
  return { accessToken: parsed.t, memberUrn: parsed.u, name: parsed.n ?? null, expiresAt: data.expires_at };
}

export async function deleteConnection(email: string) {
  const sql = db();
  if (!sql) return false;
  const { error } = await sql.run`delete from course.linkedin_connections where email = ${email}`;
  return !error;
}
