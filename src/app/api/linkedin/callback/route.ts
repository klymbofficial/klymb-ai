import { NextResponse, type NextRequest } from "next/server";
import { auth, verifiedEmailFrom } from "@/auth";
import { exchangeCode, fetchMember } from "@/lib/linkedin/api";
import { STATE_COOKIE, STATE_COOKIE_PATH, checkOAuthState, linkedInApp, redirectUri } from "@/lib/linkedin/oauth";
import { saveConnection } from "@/lib/linkedin/store";

/**
 * Where LinkedIn sends the learner back. The state is checked before anything
 * else happens (src/lib/linkedin/oauth.ts says what that protects against),
 * then the code is exchanged, the member looked up and the token sealed away.
 *
 * Every outcome but a failed state check goes back to the page the learner
 * started from. That page notices whether LinkedIn is now connected and
 * carries on with the post, or says it didn't connect.
 */
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const app = linkedInApp();
  const email = verifiedEmailFrom(await auth());
  const check = app
    ? checkOAuthState(req.cookies.get(STATE_COOKIE)?.value, url.searchParams.get("state"), email, app.secret)
    : ({ ok: false, reason: "missing", returnTo: "/" } as const);

  const finish = (res: NextResponse) => {
    // One use only, whatever happened.
    res.cookies.set(STATE_COOKIE, "", { path: STATE_COOKIE_PATH, maxAge: 0 });
    return res;
  };
  const back = () => finish(NextResponse.redirect(new URL(check.returnTo, url)));

  // The learner said no on LinkedIn's screen: nothing to exchange.
  if (url.searchParams.has("error")) return back();

  if (!check.ok) {
    console.warn("linkedin callback refused:", check.reason);
    // A state that isn't this browser's is what a forged callback looks like: refuse it, as LinkedIn's guide asks.
    if (check.reason === "forged" || check.reason === "mismatch" || check.reason === "missing") {
      return finish(new NextResponse(
        "LinkedIn wasn't connected: this sign-in didn't start here, or took longer than ten minutes. Go back to Klymb and tap Connect LinkedIn again.",
        { status: 401, headers: { "content-type": "text/plain; charset=utf-8" } },
      ));
    }
    return back();
  }

  const code = url.searchParams.get("code");
  if (!app || !email || !code) return back();
  try {
    const token = await exchangeCode({ code, clientId: app.clientId, clientSecret: app.clientSecret, redirectUri: redirectUri(req.url) });
    const member = await fetchMember(token.accessToken);
    const saved = await saveConnection(email, {
      accessToken: token.accessToken, memberUrn: member.urn, name: member.name, expiresAt: token.expiresAt.toISOString(), scope: token.scope,
    }, app.secret);
    if (!saved) console.error("linkedin connect: the connection could not be saved");
  } catch (e) {
    console.error("linkedin connect failed:", e instanceof Error ? e.message : String(e));
  }
  return back();
}
