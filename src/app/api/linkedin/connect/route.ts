import { NextResponse } from "next/server";
import { auth, verifiedEmailFrom } from "@/auth";
import { authorizeUrl } from "@/lib/linkedin/api";
import { STATE_COOKIE, STATE_COOKIE_PATH, STATE_TTL_SECONDS, linkedInApp, redirectUri, safeReturnTo, startOAuth } from "@/lib/linkedin/oauth";
import { checkRateLimit } from "@/lib/rate-limit";

/**
 * Starts connecting LinkedIn: sends the learner to LinkedIn's consent screen
 * with a fresh state, remembered in a short-lived cookie the callback checks.
 *
 * Only for a signed-in learner, because the connection belongs to their
 * account. Anything that stops it sends them straight back to where they
 * were, where the share button still works the usual way.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const returnTo = safeReturnTo(url.searchParams.get("returnTo"));
  const back = NextResponse.redirect(new URL(returnTo, url));

  const app = linkedInApp();
  if (!app) return back;
  const email = verifiedEmailFrom(await auth());
  if (!email) return back;

  // Each start is a trip to LinkedIn; a loop of them is not a learner.
  const limit = await checkRateLimit("linkedin-connect", { limit: 10, windowMinutes: 60, identity: email });
  if (!limit.allowed) return back;

  const { state, cookie } = startOAuth(email, returnTo, app.secret);
  const res = NextResponse.redirect(authorizeUrl({ clientId: app.clientId, redirectUri: redirectUri(req.url), state }));
  res.cookies.set(STATE_COOKIE, cookie, {
    httpOnly: true,
    // Lax, not Strict: the callback arrives as a top-level navigation from linkedin.com.
    sameSite: "lax",
    secure: url.protocol === "https:",
    path: STATE_COOKIE_PATH,
    maxAge: STATE_TTL_SECONDS,
  });
  return res;
}
