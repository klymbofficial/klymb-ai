import { NextResponse, type NextRequest } from "next/server";
import { SITE_CLOSED, staysOpen } from "@/lib/site-status";

/** While the site is closed, every page except admin shows /closed with a 503. */
export function proxy(request: NextRequest) {
  if (!SITE_CLOSED || staysOpen(request.nextUrl.pathname)) return NextResponse.next();
  const res = NextResponse.rewrite(new URL("/closed", request.url), { status: 503 });
  res.headers.set("Retry-After", "86400");
  return res;
}
