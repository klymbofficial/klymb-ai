import { NextResponse, type NextRequest } from "next/server";
import { ORG_PATH_HEADER } from "@/lib/company/return-path";
import { SITE_CLOSED, staysOpen } from "@/lib/site-status";

/**
 * While the site is closed, every page except admin shows /closed with a 503.
 *
 * On workspace pages it also tells the server which page was asked for, so
 * the /org/[slug] layout can send a signed-out visitor to sign-in and bring
 * them back to that page (a layout isn't given the path itself). The header
 * is always overwritten here, and the layout checks it again with
 * safeOrgNext, so a value sent by the browser is never trusted.
 */
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  if (SITE_CLOSED && !staysOpen(pathname)) {
    const res = NextResponse.rewrite(new URL("/closed", request.url), { status: 503 });
    res.headers.set("Retry-After", "86400");
    return res;
  }
  if (pathname.startsWith("/org/")) {
    const headers = new Headers(request.headers);
    headers.set(ORG_PATH_HEADER, `${pathname}${search}`);
    return NextResponse.next({ request: { headers } });
  }
  return NextResponse.next();
}
