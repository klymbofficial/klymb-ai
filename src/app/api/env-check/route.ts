import { NextResponse } from "next/server";

/**
 * TEMPORARY diagnostic: reports whether each server variable is visible at
 * runtime. Never returns values — only presence and length. Delete once the
 * production auth configuration is confirmed.
 */
export const dynamic = "force-dynamic";

export function GET() {
  const seen = (name: string) => {
    const v = process.env[name];
    return v ? { set: true, length: v.length } : { set: false };
  };

  return NextResponse.json({
    AUTH_SECRET: seen("AUTH_SECRET"),
    AUTH_URL: seen("AUTH_URL"),
    AUTH_GOOGLE_ID: seen("AUTH_GOOGLE_ID"),
    AUTH_GOOGLE_SECRET: seen("AUTH_GOOGLE_SECRET"),
    SUPABASE_SERVICE_ROLE_KEY: seen("SUPABASE_SERVICE_ROLE_KEY"),
    NEXT_PUBLIC_SUPABASE_URL: seen("NEXT_PUBLIC_SUPABASE_URL"),
    VERCEL_ENV: process.env.VERCEL_ENV ?? null,
  });
}
