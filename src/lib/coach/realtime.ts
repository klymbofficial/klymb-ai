import "server-only";

/**
 * The provider side of the voice coach: OpenAI's Realtime API over WebRTC.
 *
 * Speech to speech, so there is no transcribe → think → speak chain in the
 * middle. That chain is where the seconds go, and a placement conversation
 * that pauses for two seconds after every sentence is not a conversation.
 *
 * OPENAI_API_KEY never leaves this module. The browser is not given a
 * short-lived client secret either (POST /v1/realtime/client_secrets, which
 * is the other documented route): the session's instructions carry the
 * learner's name, track and what an earlier session found, and binding those
 * to a credential held in a browser means handing over both. Instead the
 * browser posts its SDP offer to /api/coach/session and this relays it —
 * the same shape /api/video already uses for the course videos, where the
 * signing key stays here and the browser only ever gets what it produced.
 */

const CALLS_URL = "https://api.openai.com/v1/realtime/calls";

/** Overridable because the realtime model is replaced faster than we deploy. */
export const COACH_MODEL = process.env.OPENAI_REALTIME_MODEL?.trim() || "gpt-realtime-2.1";
/** `marin` and `cedar` are the voices OpenAI recommends for realtime. */
export const COACH_VOICE = process.env.OPENAI_REALTIME_VOICE?.trim() || "marin";

export function coachConfigured(): boolean {
  return !!process.env.OPENAI_API_KEY?.trim();
}

export type OfferResult =
  | { answer: string; error: null }
  | { answer: null; error: "not-configured" | "upstream" | "timeout" };

/**
 * Relays one WebRTC offer and returns the answer SDP.
 *
 * `session` is sent as a JSON part alongside the offer, and is *not* wrapped
 * in a `session` key here — unlike the client-secret endpoint, which is.
 * Content-Type is left to fetch: FormData owns the multipart boundary.
 *
 * `identity` is a hash of the learner, for OpenAI's abuse tooling. It is
 * deliberately not the email: the provider does not need to know who they
 * are to rate-limit them.
 */
export async function exchangeOffer({
  sdp,
  session,
  identity,
}: {
  sdp: string;
  session: unknown;
  identity: string;
}): Promise<OfferResult> {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) return { answer: null, error: "not-configured" };

  const form = new FormData();
  form.set("sdp", sdp);
  form.set("session", JSON.stringify(session));

  try {
    const response = await fetch(CALLS_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "OpenAI-Safety-Identifier": identity },
      body: form,
      // A learner is staring at a connecting spinner: fail and say so rather
      // than hold the request open until the platform's own timeout.
      signal: AbortSignal.timeout(20_000),
    });

    if (!response.ok) {
      // The body carries the reason a session config was rejected, which is
      // the only way to find a renamed field. It holds no learner data.
      console.error("coach session refused:", response.status, (await response.text()).slice(0, 500));
      return { answer: null, error: "upstream" };
    }

    const answer = await response.text();
    if (!answer.startsWith("v=")) {
      console.error("coach session: answer was not SDP");
      return { answer: null, error: "upstream" };
    }
    return { answer, error: null };
  } catch (e) {
    const timedOut = e instanceof Error && (e.name === "TimeoutError" || e.name === "AbortError");
    console.error("coach session failed:", e instanceof Error ? e.message : String(e));
    return { answer: null, error: timedOut ? "timeout" : "upstream" };
  }
}
