/**
 * What app.klymb.ai knows about one person, for their klymb.ai dashboard:
 * their profile strength, their 60-day challenges, and the hackathon. The work
 * itself stays on app.klymb.ai; this only shows where they are and links there.
 *
 * The contract (app.klymb.ai implements it, this file is its one reader):
 *
 *   POST https://app.klymb.ai/api/internal/klymb-summary
 *   Authorization: Bearer <KLYMB_SUMMARY_SECRET>        same value on both apps
 *   Content-Type: application/json
 *   { "email": "<lowercased, Google-verified>" }
 *
 *   403  wrong or missing secret
 *   200  { "hasUser": false }                          no app.klymb.ai account
 *   200  {
 *          "hasUser": true,
 *          "profile": { "score": 0-100, "ready": boolean, "missing": string[] },
 *          "challenges": [{
 *            "domain": "AI" | "SE" | "DS" | "CLAUDE",
 *            "title": string,
 *            "daysCompleted": number, "currentDay": number, "totalDays": number,
 *            "currentStreak": number,
 *            "lifecycle": "active" | "completed" | "ended"
 *          }],
 *          "hackathon": { "registered": boolean, "submitted": boolean, "live": boolean, "registrationOpen": boolean }
 *        }
 *
 * The email goes in the body, never the URL, so it stays out of access logs.
 * Agentic AI course progress is not in it: app.klymb.ai keeps that in the
 * learner's browser only.
 *
 * Everything that comes back is checked here before use: it is another
 * service's answer, so a malformed field is dropped, never trusted.
 */

export type PlatformDomain = "AI" | "SE" | "DS" | "CLAUDE";

export interface PlatformChallenge {
  domain: PlatformDomain;
  title: string;
  daysCompleted: number;
  currentDay: number;
  totalDays: number;
  currentStreak: number;
  lifecycle: "active" | "completed" | "ended";
}

export type PlatformSummary =
  | { hasUser: false }
  | {
      hasUser: true;
      profile: { score: number; ready: boolean; missing: string[] };
      challenges: PlatformChallenge[];
      hackathon: { registered: boolean; submitted: boolean; live: boolean; registrationOpen: boolean };
    };

const DOMAINS: PlatformDomain[] = ["AI", "SE", "DS", "CLAUDE"];
const LIFECYCLES = ["active", "completed", "ended"] as const;

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const count = (v: unknown, max: number) => (typeof v === "number" && Number.isFinite(v) ? Math.min(max, Math.max(0, Math.round(v))) : 0);
const text = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

function challenge(v: unknown): PlatformChallenge | null {
  if (!isObj(v)) return null;
  const domain = DOMAINS.find((d) => d === v.domain);
  const lifecycle = LIFECYCLES.find((l) => l === v.lifecycle);
  const title = text(v.title, 80);
  if (!domain || !lifecycle || !title) return null;
  const totalDays = count(v.totalDays, 365) || 60;
  return {
    domain,
    title,
    lifecycle,
    totalDays,
    daysCompleted: count(v.daysCompleted, totalDays),
    currentDay: count(v.currentDay, totalDays),
    currentStreak: count(v.currentStreak, 365),
  };
}

/** Checks app.klymb.ai's answer field by field. Null when it isn't a summary at all. */
export function parsePlatformSummary(v: unknown): PlatformSummary | null {
  if (!isObj(v)) return null;
  if (v.hasUser === false) return { hasUser: false };
  if (v.hasUser !== true) return null;
  const profile = isObj(v.profile) ? v.profile : {};
  const hackathon = isObj(v.hackathon) ? v.hackathon : {};
  return {
    hasUser: true,
    profile: {
      score: count(profile.score, 100),
      ready: profile.ready === true,
      missing: (Array.isArray(profile.missing) ? profile.missing : []).map((m) => text(m, 60)).filter(Boolean).slice(0, 6),
    },
    challenges: (Array.isArray(v.challenges) ? v.challenges : []).map(challenge).filter((c): c is PlatformChallenge => c !== null).slice(0, 10),
    hackathon: {
      registered: hackathon.registered === true,
      submitted: hackathon.submitted === true,
      live: hackathon.live === true,
      registrationOpen: hackathon.registrationOpen === true,
    },
  };
}
