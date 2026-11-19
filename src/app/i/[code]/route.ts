import { NextResponse } from "next/server";
import { internCodeOf } from "@/lib/internship";

/**
 * An intern's share link, klymb.ai/i/ROHAN27: opens the System Design page
 * with their code, which the page checks and remembers in the buyer's browser.
 */
export async function GET(req: Request, { params }: RouteContext<"/i/[code]">) {
  const code = internCodeOf((await params).code);
  const to = new URL(code ? `/system-design?by=${code}` : "/system-design", req.url);
  return NextResponse.redirect(to, 307);
}
