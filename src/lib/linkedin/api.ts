/**
 * LinkedIn's API, the parts a one-tap post needs: the OAuth code exchange,
 * who the member is, uploading the image and publishing the post.
 *
 * Products on the LinkedIn developer app: "Sign In with LinkedIn using OpenID
 * Connect" (openid, profile: the member's id and name) and "Share on
 * LinkedIn" (w_member_social: posting as them). Nothing else is asked for, so
 * the consent screen asks for nothing else.
 *
 * No server-only import and `fetch` passed in, so the tests can drive every
 * call; the routes under src/app/api/linkedin hold the session and the database.
 */

type Fetch = typeof fetch;

export const LINKEDIN_SCOPES = "openid profile w_member_social";

/**
 * LinkedIn-Version, YYYYMM. Each version is served for about a year, so this
 * has to move forward at least that often: LINKEDIN_API_VERSION overrides it
 * without a deploy of new code.
 */
export const DEFAULT_API_VERSION = "202610";

/** LinkedIn's limit on a post's text. */
export const MAX_POST_TEXT = 3000;
/** Far above a 1080×1350 share image (the largest is ~150 KB), well below Vercel's 4.5 MB request cap. */
export const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
const MAX_ALT_TEXT = 300;

/** Every token LinkedIn issues lasts 60 days; used only if it ever leaves expires_in out. */
const DEFAULT_TOKEN_SECONDS = 60 * 24 * 60 * 60;

/**
 * A call LinkedIn refused. `reconnect` means the token can't post any more
 * (expired, revoked in LinkedIn's settings, or the permission withdrawn):
 * the learner has to connect again before the next one-tap post.
 */
export class LinkedInError extends Error {
  constructor(message: string, readonly status: number, readonly reconnect = false) {
    super(message);
    this.name = "LinkedInError";
  }
}

/** Where the learner is sent to approve posting. */
export function authorizeUrl({ clientId, redirectUri, state }: { clientId: string; redirectUri: string; state: string }) {
  const params = new URLSearchParams({ response_type: "code", client_id: clientId, redirect_uri: redirectUri, state, scope: LINKEDIN_SCOPES });
  return `https://www.linkedin.com/oauth/v2/authorization?${params}`;
}

/** LinkedIn has reported scopes both space- and comma-separated. */
export const grantedScopes = (scope: string) => scope.split(/[\s,]+/).filter(Boolean);

export interface Token { accessToken: string; expiresAt: Date; scope: string }

/** Trades the code from the callback for the member's access token. */
export async function exchangeCode(
  { code, clientId, clientSecret, redirectUri }: { code: string; clientId: string; clientSecret: string; redirectUri: string },
  { fetch: f = fetch, now = Date.now() }: { fetch?: Fetch; now?: number } = {},
): Promise<Token> {
  const res = await f("https://www.linkedin.com/oauth/v2/accessToken", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "authorization_code", code, client_id: clientId, client_secret: clientSecret, redirect_uri: redirectUri }),
    cache: "no-store",
  });
  const body = (await res.json().catch(() => null)) as Record<string, unknown> | null;
  if (!res.ok || typeof body?.access_token !== "string" || !body.access_token) {
    throw new LinkedInError(`token exchange failed: ${res.status} ${String(body?.error ?? "")}`.trim(), res.status);
  }
  const scope = typeof body.scope === "string" ? body.scope : "";
  // A learner can't untick a scope on LinkedIn's screen, but an app whose
  // products were changed can hand back less than it asked for.
  if (!grantedScopes(scope).includes("w_member_social")) throw new LinkedInError("posting permission was not granted", 403, true);
  const seconds = Number(body.expires_in) > 0 ? Number(body.expires_in) : DEFAULT_TOKEN_SECONDS;
  return { accessToken: body.access_token, expiresAt: new Date(now + seconds * 1000), scope };
}

export interface Member { urn: string; name: string | null }

/** Who the token belongs to: their person URN, the author of every post. */
export async function fetchMember(accessToken: string, { fetch: f = fetch }: { fetch?: Fetch } = {}): Promise<Member> {
  const res = await f("https://api.linkedin.com/v2/userinfo", { headers: { authorization: `Bearer ${accessToken}` }, cache: "no-store" });
  const body = (await res.json().catch(() => null)) as Record<string, unknown> | null;
  if (!res.ok || typeof body?.sub !== "string" || !/^[A-Za-z0-9_-]{1,100}$/.test(body.sub)) {
    throw new LinkedInError(`userinfo failed: ${res.status}`, res.status, res.status === 401);
  }
  const name = typeof body.name === "string" && body.name.trim() ? body.name.trim().slice(0, 120) : null;
  return { urn: `urn:li:person:${body.sub}`, name };
}

/** The characters LinkedIn's "little" text format reserves; unescaped, they can cut a post short. */
const RESERVED = /[\\|{}@[\]()<>#*_~]/g;
const escapeLittle = (s: string) => s.replace(RESERVED, "\\$&");

/**
 * A post's text as the Posts API wants it. Hashtags become LinkedIn's hashtag
 * template, so they stay tappable; every other reserved character is escaped
 * and shows up as typed. A # inside a word (C#) is plain text.
 */
export function toLittleText(text: string) {
  return text.replace(/(?<![\p{L}\p{N}_])#(\p{L}[\p{L}\p{N}_]*)|[\\|{}@[\]()<>#*_~]/gu, (match, tag?: string) =>
    tag ? `{hashtag|\\#|${escapeLittle(tag)}}` : `\\${match}`,
  );
}

/** Trimmed, with Windows line ends folded; null if empty or too long to post. */
export function cleanPostText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const text = value.replace(/\r\n?/g, "\n").trim();
  return text && text.length <= MAX_POST_TEXT ? text : null;
}

/** The share images are PNGs; anything else is refused before it reaches LinkedIn. */
export function isPng(bytes: Uint8Array) {
  const signature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  return bytes.length > signature.length && signature.every((b, i) => bytes[i] === b);
}

/**
 * The upload URL comes back from LinkedIn and the member's token goes with
 * the upload, so it must be LinkedIn's own host and nothing else.
 */
function isLinkedInUpload(raw: unknown): raw is string {
  if (typeof raw !== "string") return false;
  try {
    const { protocol, hostname } = new URL(raw);
    return protocol === "https:" && (hostname === "linkedin.com" || hostname.endsWith(".linkedin.com") || hostname.endsWith(".licdn.com"));
  } catch {
    return false;
  }
}

/** A failed REST call, as an error that says whether reconnecting would fix it. */
async function refused(step: string, res: Response): Promise<LinkedInError> {
  const body = (await res.json().catch(() => null)) as { message?: unknown } | null;
  const detail = typeof body?.message === "string" ? `: ${body.message.slice(0, 200)}` : "";
  // 401 is a dead token; 403 is a token without w_member_social any more.
  return new LinkedInError(`${step} failed: ${res.status}${detail}`, res.status, res.status === 401 || res.status === 403);
}

export interface Published { urn: string; url: string }

/**
 * Publishes the image and text to the member's feed, publicly: three calls,
 * the Images API to register and upload the PNG, then the Posts API. Nothing
 * is posted unless the upload went through.
 */
export async function publishImagePost(
  { accessToken, author, text, image, altText, version = DEFAULT_API_VERSION }:
  { accessToken: string; author: string; text: string; image: Blob; altText: string; version?: string },
  { fetch: f = fetch }: { fetch?: Fetch } = {},
): Promise<Published> {
  const rest = {
    authorization: `Bearer ${accessToken}`,
    "linkedin-version": version,
    "x-restli-protocol-version": "2.0.0",
    "content-type": "application/json",
  };

  const init = await f("https://api.linkedin.com/rest/images?action=initializeUpload", {
    method: "POST",
    headers: rest,
    body: JSON.stringify({ initializeUploadRequest: { owner: author } }),
    cache: "no-store",
  });
  if (!init.ok) throw await refused("image upload setup", init);
  const { value } = ((await init.json().catch(() => null)) ?? {}) as { value?: { uploadUrl?: unknown; image?: unknown } };
  if (!isLinkedInUpload(value?.uploadUrl) || typeof value?.image !== "string" || !value.image.startsWith("urn:li:image:")) {
    throw new LinkedInError("image upload setup returned no upload URL", 502);
  }

  const upload = await f(value.uploadUrl, {
    method: "PUT",
    headers: { authorization: `Bearer ${accessToken}`, "content-type": image.type || "image/png" },
    body: image,
    cache: "no-store",
  });
  if (!upload.ok) throw await refused("image upload", upload);

  const post = await f("https://api.linkedin.com/rest/posts", {
    method: "POST",
    headers: rest,
    body: JSON.stringify({
      author,
      commentary: toLittleText(text),
      visibility: "PUBLIC",
      distribution: { feedDistribution: "MAIN_FEED", targetEntities: [], thirdPartyDistributionChannels: [] },
      content: { media: { id: value.image, altText: altText.slice(0, MAX_ALT_TEXT) } },
      lifecycleState: "PUBLISHED",
      isReshareDisabledByAuthor: false,
    }),
    cache: "no-store",
  });
  if (!post.ok) throw await refused("post", post);
  // 201, with the new post's URN in a header rather than the body.
  const urn = post.headers.get("x-restli-id") ?? "";
  if (!/^urn:li:(share|ugcPost):\d+$/.test(urn)) return { urn: "", url: "https://www.linkedin.com/feed/" };
  return { urn, url: `https://www.linkedin.com/feed/update/${urn}/` };
}
