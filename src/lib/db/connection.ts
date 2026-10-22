/**
 * How to connect, from a connection string.
 *
 * Shared by the app (src/lib/db/client.ts) and the migration runner
 * (scripts/migrate.ts), so both treat TLS the same way. No "server-only"
 * here: the runner is a plain Node script.
 */

export interface ConnectionOptions {
  connectionString: string;
  ssl?: { rejectUnauthorized: boolean };
}

const LOCAL = /@(localhost|127\.0\.0\.1|\[::1\])[:/]/;

export function connectionOptions(url: string): ConnectionOptions {
  // A local Postgres for development usually speaks no TLS at all.
  if (LOCAL.test(url)) return { connectionString: url };

  // Neon hands out `?sslmode=require`, which node-postgres reads as full
  // verification while libpq reads it as "encrypt but don't verify". It warns
  // about the ambiguity on every connection. We always want verification —
  // Neon serves a publicly trusted certificate — so state it in the `ssl`
  // option and drop the parameter, which settles the question and lets a URL
  // be pasted from the Neon dashboard unedited.
  let connectionString = url;
  try {
    const parsed = new URL(url);
    if (parsed.searchParams.has("sslmode")) {
      parsed.searchParams.delete("sslmode");
      connectionString = parsed.toString();
    }
  } catch {
    // Not parseable as a URL: hand it over untouched and let pg complain.
  }
  return { connectionString, ssl: { rejectUnauthorized: true } };
}
