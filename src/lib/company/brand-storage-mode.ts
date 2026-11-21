type Env = Record<string, string | undefined>;

/**
 * Where brand files live. R2 on Vercel (preview and production), or anywhere
 * BRAND_STORAGE=r2 is set; otherwise a folder on this machine. A developer's
 * .env.local may hold R2 write keys for other scripts, so having the keys is
 * not enough to write to the real bucket from a laptop. Production never
 * falls back to the disk, which Vercel doesn't keep.
 */
export function brandStorageMode(env: Env = process.env): "r2" | "local" {
  if (env.BRAND_STORAGE === "r2" || env.VERCEL_ENV || env.NODE_ENV === "production") return "r2";
  return "local";
}
