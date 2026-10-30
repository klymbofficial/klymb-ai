import { NextResponse } from "next/server";
import { auth, verifiedEmailFrom } from "@/auth";
import { linkedInApp, sameOrigin } from "@/lib/linkedin/oauth";
import { deleteConnection, loadConnection } from "@/lib/linkedin/store";

const noStore = { "cache-control": "no-store" };

/**
 * Whether this learner can post in one tap. `enabled` is false when LinkedIn
 * isn't set up here or nobody is signed in, and the share buttons then do
 * what they always did. The token never leaves the server; the name is there
 * so the confirm step can say whose feed the post goes to.
 */
export async function GET() {
  const app = linkedInApp();
  const email = app ? verifiedEmailFrom(await auth()) : null;
  if (!app || !email) return NextResponse.json({ enabled: false, connected: false, name: null }, { headers: noStore });
  const connection = await loadConnection(email, app.secret);
  return NextResponse.json({ enabled: true, connected: !!connection, name: connection?.name ?? null }, { headers: noStore });
}

/**
 * Disconnect: our copy of the token is deleted. LinkedIn documents no way for
 * an app to revoke a member token, so the confirm step also points to
 * LinkedIn's own settings, where the learner can remove Klymb entirely.
 */
export async function DELETE(req: Request) {
  if (!sameOrigin(req.url, req.headers.get("origin"), req.headers.get("sec-fetch-site"))) {
    return NextResponse.json({ error: "Not from this site." }, { status: 403 });
  }
  const email = verifiedEmailFrom(await auth());
  if (!email) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  if (!(await deleteConnection(email))) return NextResponse.json({ error: "Couldn't disconnect right now." }, { status: 503 });
  return NextResponse.json({ ok: true });
}
