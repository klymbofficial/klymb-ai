import { NextResponse } from "next/server";
import { currentEmail } from "@/auth";

export const dynamic = "force-dynamic";

/**
 * Where the header's account link goes, so public pages can show it without
 * rendering per user. Null for visitors. Never carries the email itself.
 */
export async function GET() {
  const email = await currentEmail();
  // One place for every course: the dashboard lists System Design beside a track.
  const link = email ? { label: "Dashboard", href: "/learn" } : null;
  return NextResponse.json({ link }, { headers: { "Cache-Control": "private, no-store" } });
}
