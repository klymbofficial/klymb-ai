import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import {
  LINKEDIN_SCOPES, LinkedInError, MAX_POST_TEXT, authorizeUrl, cleanPostText, exchangeCode, fetchMember, isPng, publishImagePost, toLittleText,
} from "../src/lib/linkedin/api";
import {
  STATE_TTL_SECONDS, checkOAuthState, linkedInApp, redirectUri, safeReturnTo, sameOrigin, seal, startOAuth, unseal,
} from "../src/lib/linkedin/oauth";

const SECRET = "test-auth-secret-with-enough-entropy-0123456789";
const EMAIL = "learner@example.com";
const NOW = Date.parse("2026-10-29T10:00:00Z");

/** A fetch that answers from a script, one response per call, and remembers what it was asked. */
function scripted(...responses: (() => Response)[]) {
  const calls: { url: string; init: RequestInit }[] = [];
  const f = (async (input: RequestInfo | URL, init: RequestInit = {}) => {
    calls.push({ url: String(input), init });
    const next = responses.shift();
    if (!next) throw new Error(`unexpected call to ${String(input)}`);
    return next();
  }) as typeof fetch;
  return { f, calls };
}
const json = (body: unknown, status = 200, headers: Record<string, string> = {}) => () =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", ...headers } });
const header = (init: RequestInit, name: string) => new Headers(init.headers).get(name);

// ── OAuth state ──────────────────────────────────────────────

test("the state LinkedIn sends back passes only with this browser's cookie, for the learner who started", () => {
  const { state, cookie } = startOAuth(EMAIL, "/learn/system-design?lesson=d1", SECRET, NOW);
  assert.deepEqual(checkOAuthState(cookie, state, EMAIL, SECRET, NOW + 60_000), { ok: true, returnTo: "/learn/system-design?lesson=d1" });
});

test("a callback whose state isn't the one in the cookie is refused", () => {
  const { cookie } = startOAuth(EMAIL, "/", SECRET, NOW);
  const other = startOAuth(EMAIL, "/", SECRET, NOW);
  assert.equal(checkOAuthState(cookie, other.state, EMAIL, SECRET, NOW).ok, false);
  assert.deepEqual(checkOAuthState(cookie, other.state, EMAIL, SECRET, NOW), { ok: false, reason: "mismatch", returnTo: "/" });
});

test("no cookie, or no state, is refused", () => {
  const { state, cookie } = startOAuth(EMAIL, "/", SECRET, NOW);
  assert.equal(checkOAuthState(undefined, state, EMAIL, SECRET, NOW).ok, false);
  assert.equal(checkOAuthState(cookie, null, EMAIL, SECRET, NOW).ok, false);
  assert.equal(checkOAuthState(undefined, null, EMAIL, SECRET, NOW).ok, false);
});

test("a cookie that was edited, or signed with another secret, is forged", () => {
  const { state, cookie } = startOAuth(EMAIL, "/day", SECRET, NOW);
  const [body, sig] = cookie.split(".");
  // Point the return somewhere else and keep the old signature.
  const edited = Buffer.from(JSON.stringify({ ...JSON.parse(Buffer.from(body, "base64url").toString()), r: "/evil" })).toString("base64url");
  for (const bad of [`${edited}.${sig}`, `${body}.${sig.slice(1)}x`, `${body}`, `${body}.${sig}.more`, "garbage"]) {
    const check = checkOAuthState(bad, state, EMAIL, SECRET, NOW);
    assert.equal(check.ok, false, bad);
    assert.equal(!check.ok && check.reason, "forged");
    assert.equal(check.returnTo, "/", "a forged cookie's return path is never used");
  }
  assert.equal(checkOAuthState(cookie, state, EMAIL, "another-secret", NOW).ok, false);
});

test("a state stops being accepted after ten minutes", () => {
  const { state, cookie } = startOAuth(EMAIL, "/day", SECRET, NOW);
  assert.equal(checkOAuthState(cookie, state, EMAIL, SECRET, NOW + STATE_TTL_SECONDS * 1000).ok, true);
  assert.deepEqual(checkOAuthState(cookie, state, EMAIL, SECRET, NOW + STATE_TTL_SECONDS * 1000 + 1), { ok: false, reason: "expired", returnTo: "/day" });
});

test("a callback finishing in another learner's session, or signed out, is refused", () => {
  const { state, cookie } = startOAuth(EMAIL, "/day", SECRET, NOW);
  assert.deepEqual(checkOAuthState(cookie, state, "someone@example.com", SECRET, NOW), { ok: false, reason: "other-account", returnTo: "/day" });
  assert.equal(checkOAuthState(cookie, state, null, SECRET, NOW).ok, false);
});

test("the cookie never carries the learner's address", () => {
  const { cookie } = startOAuth(EMAIL, "/", SECRET, NOW);
  assert.ok(!Buffer.from(cookie.split(".")[0], "base64url").toString().includes(EMAIL));
});

test("the return path stays on this site, whatever arrives", () => {
  assert.equal(safeReturnTo("/learn/system-design?lesson=d2#share"), "/learn/system-design?lesson=d2#share");
  for (const raw of ["https://evil.com", "//evil.com", "/\\evil.com", "/\t/evil.com", "evil", "", null, 42, `/${"a".repeat(600)}`]) {
    assert.equal(safeReturnTo(raw), "/", String(raw));
  }
  const { state, cookie } = startOAuth(EMAIL, "//evil.com/steal", SECRET, NOW);
  assert.deepEqual(checkOAuthState(cookie, state, EMAIL, SECRET, NOW), { ok: true, returnTo: "/" });
});

test("LinkedIn's authorize link asks for posting and the member's name, nothing more", () => {
  const url = new URL(authorizeUrl({ clientId: "cid", redirectUri: "https://klymb.ai/api/linkedin/callback", state: "st" }));
  assert.equal(url.origin + url.pathname, "https://www.linkedin.com/oauth/v2/authorization");
  assert.equal(url.searchParams.get("response_type"), "code");
  assert.equal(url.searchParams.get("client_id"), "cid");
  assert.equal(url.searchParams.get("redirect_uri"), "https://klymb.ai/api/linkedin/callback");
  assert.equal(url.searchParams.get("state"), "st");
  assert.equal(url.searchParams.get("scope"), LINKEDIN_SCOPES);
  assert.deepEqual(LINKEDIN_SCOPES.split(" ").sort(), ["openid", "profile", "w_member_social"]);
});

test("the callback URL follows AUTH_URL, and the app is off until both credentials and AUTH_SECRET are set", () => {
  assert.equal(redirectUri("http://internal:3000/api/linkedin/connect", { AUTH_URL: "https://klymb.ai/api/auth" }), "https://klymb.ai/api/linkedin/callback");
  assert.equal(redirectUri("http://localhost:3000/api/linkedin/connect", {}), "http://localhost:3000/api/linkedin/callback");
  assert.equal(linkedInApp({ LINKEDIN_CLIENT_ID: "a", LINKEDIN_CLIENT_SECRET: "b" }), null);
  assert.equal(linkedInApp({ LINKEDIN_CLIENT_ID: "a", AUTH_SECRET: "s" }), null);
  assert.deepEqual(linkedInApp({ LINKEDIN_CLIENT_ID: " a ", LINKEDIN_CLIENT_SECRET: "b", AUTH_SECRET: "s" }), { clientId: "a", clientSecret: "b", secret: "s", version: undefined });
});

test("writes are accepted from this site only", () => {
  const url = "https://klymb.ai/api/linkedin/post";
  assert.ok(sameOrigin(url, "https://klymb.ai", "same-origin"));
  assert.ok(sameOrigin(url, "https://klymb.ai", null), "older browsers send only Origin");
  assert.ok(!sameOrigin(url, "https://evil.com", "cross-site"));
  assert.ok(!sameOrigin(url, "https://klymb.ai", "cross-site"), "the browser's own word wins");
  assert.ok(!sameOrigin(url, "https://evil.com", null));
  assert.ok(!sameOrigin(url, null, null));
});

// ── The stored token ─────────────────────────────────────────

test("a sealed token opens only for the same learner and the same secret", () => {
  const sealed = seal("AQV-token", SECRET, EMAIL);
  assert.ok(!sealed.includes("AQV-token"));
  assert.notEqual(seal("AQV-token", SECRET, EMAIL), sealed, "a fresh IV every time");
  assert.equal(unseal(sealed, SECRET, EMAIL), "AQV-token");
  assert.equal(unseal(sealed, SECRET, "someone@example.com"), null, "moved onto another learner's row");
  assert.equal(unseal(sealed, "rotated-secret", EMAIL), null);
  const [v, iv, data, tag] = sealed.split(".");
  const flipped = Buffer.from(data, "base64url");
  flipped[0] ^= 1;
  assert.equal(unseal([v, iv, flipped.toString("base64url"), tag].join("."), SECRET, EMAIL), null);
  assert.equal(unseal("not sealed", SECRET, EMAIL), null);
});

// ── Token exchange and member ───────────────────────────────

test("the code is exchanged with the app's credentials, form-encoded", async () => {
  const { f, calls } = scripted(json({ access_token: "AQV-token", expires_in: 5184000, scope: "openid,profile,w_member_social" }));
  const token = await exchangeCode({ code: "the-code", clientId: "cid", clientSecret: "shh", redirectUri: "https://klymb.ai/api/linkedin/callback" }, { fetch: f, now: NOW });
  assert.equal(calls[0].url, "https://www.linkedin.com/oauth/v2/accessToken");
  assert.equal(calls[0].init.method, "POST");
  assert.equal(header(calls[0].init, "content-type"), "application/x-www-form-urlencoded");
  const form = new URLSearchParams(String(calls[0].init.body));
  assert.deepEqual(Object.fromEntries(form), {
    grant_type: "authorization_code", code: "the-code", client_id: "cid", client_secret: "shh", redirect_uri: "https://klymb.ai/api/linkedin/callback",
  });
  assert.equal(token.accessToken, "AQV-token");
  assert.equal(token.expiresAt.toISOString(), new Date(NOW + 5184000 * 1000).toISOString());
});

test("a token without posting permission, or a refused exchange, is an error", async () => {
  await assert.rejects(
    exchangeCode({ code: "c", clientId: "a", clientSecret: "b", redirectUri: "r" }, { fetch: scripted(json({ access_token: "t", expires_in: 10, scope: "openid profile" })).f }),
    (e: unknown) => e instanceof LinkedInError && e.reconnect,
  );
  await assert.rejects(
    exchangeCode({ code: "c", clientId: "a", clientSecret: "b", redirectUri: "r" }, { fetch: scripted(json({ error: "invalid_request" }, 400)).f }),
    LinkedInError,
  );
});

test("the member's person URN is the post's author", async () => {
  const { f, calls } = scripted(json({ sub: "782bbtaQ", name: "Priya Sharma", email: "p@x.com" }));
  assert.deepEqual(await fetchMember("tok", { fetch: f }), { urn: "urn:li:person:782bbtaQ", name: "Priya Sharma" });
  assert.equal(calls[0].url, "https://api.linkedin.com/v2/userinfo");
  assert.equal(header(calls[0].init, "authorization"), "Bearer tok");
  await assert.rejects(fetchMember("tok", { fetch: scripted(json({ sub: "../../x" })).f }), LinkedInError);
  await assert.rejects(fetchMember("tok", { fetch: scripted(json({}, 401)).f }), (e: unknown) => e instanceof LinkedInError && e.reconnect);
});

// ── Publishing ───────────────────────────────────────────────

const png = new Blob([new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3])], { type: "image/png" });
const UPLOAD = "https://www.linkedin.com/dms-uploads/C4E10AQF/uploaded-image/0?ca=vector_ads&cn=uploads";
const initialized = json({ value: { uploadUrlExpiresAt: 1650567510704, uploadUrl: UPLOAD, image: "urn:li:image:C4E10AQF" } });
const uploaded = () => new Response(null, { status: 201 });
const created = () => new Response(null, { status: 201, headers: { "x-restli-id": "urn:li:share:6844785523593134080" } });
const draft = { accessToken: "AQV-token", author: "urn:li:person:782bbtaQ", text: "Day 1 done (Cache → DNS) #SystemDesign", image: png, altText: "How a URL loads" };

test("a post is the image registered, uploaded, then published with it", async () => {
  const { f, calls } = scripted(initialized, uploaded, created);
  const post = await publishImagePost({ ...draft, version: "202610" }, { fetch: f });
  assert.deepEqual(post, { urn: "urn:li:share:6844785523593134080", url: "https://www.linkedin.com/feed/update/urn:li:share:6844785523593134080/" });
  assert.deepEqual(calls.map((c) => `${c.init.method} ${c.url}`), [
    "POST https://api.linkedin.com/rest/images?action=initializeUpload",
    `PUT ${UPLOAD}`,
    "POST https://api.linkedin.com/rest/posts",
  ]);

  const [init, upload, publish] = calls;
  for (const c of [init, publish]) {
    assert.equal(header(c.init, "authorization"), "Bearer AQV-token");
    assert.equal(header(c.init, "linkedin-version"), "202610");
    assert.equal(header(c.init, "x-restli-protocol-version"), "2.0.0");
    assert.equal(header(c.init, "content-type"), "application/json");
  }
  assert.deepEqual(JSON.parse(String(init.init.body)), { initializeUploadRequest: { owner: "urn:li:person:782bbtaQ" } });
  assert.equal(upload.init.body, png, "the image itself is what's uploaded");
  assert.equal(header(upload.init, "authorization"), "Bearer AQV-token");

  assert.deepEqual(JSON.parse(String(publish.init.body)), {
    author: "urn:li:person:782bbtaQ",
    commentary: "Day 1 done \\(Cache → DNS\\) {hashtag|\\#|SystemDesign}",
    visibility: "PUBLIC",
    distribution: { feedDistribution: "MAIN_FEED", targetEntities: [], thirdPartyDistributionChannels: [] },
    content: { media: { id: "urn:li:image:C4E10AQF", altText: "How a URL loads" } },
    lifecycleState: "PUBLISHED",
    isReshareDisabledByAuthor: false,
  });
});

test("nothing is posted if the image didn't upload", async () => {
  const { f, calls } = scripted(initialized, () => new Response("nope", { status: 500 }));
  await assert.rejects(publishImagePost(draft, { fetch: f }), (e: unknown) => e instanceof LinkedInError && !e.reconnect);
  assert.equal(calls.length, 2, "no call to /rest/posts");
});

test("a token LinkedIn no longer accepts means connecting again", async () => {
  for (const status of [401, 403]) {
    await assert.rejects(
      publishImagePost(draft, { fetch: scripted(json({ message: "Invalid access token", status }, status)).f }),
      (e: unknown) => e instanceof LinkedInError && e.reconnect && e.status === status,
    );
  }
  const late = scripted(initialized, uploaded, json({ message: "expired" }, 401));
  await assert.rejects(publishImagePost(draft, { fetch: late.f }), (e: unknown) => e instanceof LinkedInError && e.reconnect);
  await assert.rejects(publishImagePost(draft, { fetch: scripted(json({ message: "slow down" }, 429)).f }), (e: unknown) => e instanceof LinkedInError && !e.reconnect && e.status === 429);
});

test("the token is never sent to an upload URL that isn't LinkedIn's", async () => {
  for (const uploadUrl of ["https://evil.example/upload", "http://www.linkedin.com/dms-uploads/x", "https://linkedin.com.evil.example/x", "not a url"]) {
    const { f, calls } = scripted(json({ value: { uploadUrl, image: "urn:li:image:C4E10AQF" } }));
    await assert.rejects(publishImagePost(draft, { fetch: f }), LinkedInError);
    assert.equal(calls.length, 1, uploadUrl);
  }
});

test("post text: hashtags stay hashtags, reserved characters show as typed", () => {
  assert.equal(toLittleText("Learn #SystemDesign with @Klymb (free) *now*"), "Learn {hashtag|\\#|SystemDesign} with \\@Klymb \\(free\\) \\*now\\*");
  assert.equal(toLittleText("C# and #1 and #KlymbAI."), "C\\# and \\#1 and {hashtag|\\#|KlymbAI}.");
  assert.equal(toLittleText("#Learning_In_Public"), "{hashtag|\\#|Learning\\_In\\_Public}");
  assert.equal(toLittleText("plain 🚀 → https://klymb.ai/learn/system-design\n\nnext"), "plain 🚀 → https://klymb.ai/learn/system-design\n\nnext");
  assert.equal(toLittleText("a\\b [x] <y> {z} | ~"), "a\\\\b \\[x\\] \\<y\\> \\{z\\} \\| \\~");
});

test("what the post endpoint accepts", () => {
  assert.equal(cleanPostText("  hi\r\nthere  "), "hi\nthere");
  assert.equal(cleanPostText("   "), null);
  assert.equal(cleanPostText(42), null);
  assert.equal(cleanPostText("x".repeat(MAX_POST_TEXT)), "x".repeat(MAX_POST_TEXT));
  assert.equal(cleanPostText("x".repeat(MAX_POST_TEXT + 1)), null);
  assert.ok(isPng(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0])));
  assert.ok(!isPng(new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0])), "a JPEG");
  assert.ok(!isPng(new Uint8Array([0x89, 0x50, 0x4e, 0x47])));
});

// ── The table ────────────────────────────────────────────────

test("connections are stored sealed, one per learner, and expire away", () => {
  const sql = readFileSync("db/migrations/0008_linkedin.sql", "utf8");
  assert.match(sql, /create table if not exists course\.linkedin_connections \(\s*email text primary key/);
  assert.match(sql, /secret text not null/);
  assert.match(sql, /expires_at timestamptz not null/);
  // No column for the raw token, the refresh token or anything else LinkedIn returns.
  assert.doesNotMatch(sql.replace(/--.*$/gm, ""), /access_token|refresh_token|picture/);
  // maintenance() keeps what it did and adds the expiry.
  const fn = sql.slice(sql.indexOf("create or replace function course.maintenance("));
  for (const task of ["rate_limit_events deleted", "sd partitions created", "sd partitions dropped", "linkedin connections expired"]) {
    assert.ok(fn.includes(`'${task}'`), task);
  }
  assert.match(fn, /delete from course\.linkedin_connections where expires_at < now\(\)/);
});
