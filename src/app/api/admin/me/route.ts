import { NextResponse } from "next/server";
import { getAdmin } from "@/lib/admin/auth";

export const dynamic = "force-dynamic";

/**
 * Whether the visitor is an admin, so public pages can show the Admin link
 * without rendering per user. Only ever a yes or no: no email, no list.
 * Showing the link is a convenience; every admin page checks again itself.
 */
export async function GET() {
  const admin = await getAdmin();
  return NextResponse.json({ admin: admin !== null }, { headers: { "Cache-Control": "private, no-store" } });
}
