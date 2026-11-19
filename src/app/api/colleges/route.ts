import { NextResponse } from "next/server";
import { currentEmail } from "@/auth";
import { searchColleges } from "@/lib/colleges";
import { db } from "@/lib/db/client";

export const dynamic = "force-dynamic";

const headers = { "Cache-Control": "private, no-store" };

/**
 * College typeahead for forms: `?q=abes` returns up to 20 matches. Signed-in
 * people only, as on app.klymb.ai, so the catalogue isn't an open API. A GET
 * route rather than a server action, because it runs on every pause in typing.
 */
export async function GET(req: Request) {
  if (!(await currentEmail())) return NextResponse.json({ colleges: [] }, { status: 401, headers });
  const q = (new URL(req.url).searchParams.get("q") ?? "").trim().slice(0, 100);
  return NextResponse.json({ colleges: await searchColleges(db(), q) }, { headers });
}
