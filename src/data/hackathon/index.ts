/**
 * The klymb.ai hackathon: one event at a time, set here.
 *
 * To run one, give it an `eventId` (never reused: every registration and entry
 * is filed under it) and its four dates. Until `kickoffUtc` is set the page
 * says the next one is coming and takes "tell me when it opens" sign-ups.
 * Times are UTC instants; the labels are what the page shows, in IST.
 */
import briefs from "./briefs.json";

export interface HackathonBrief {
  id: string;
  title: string;
  /** Markdown. Its first line is the one-line tagline on the closed card. */
  statement: string;
}

export const HACKATHON = {
  eventId: "klymb-hackathon-1",
  name: "Klymb Vibe Code Hackathon",
  tagline: "48 hours. No boilerplate. Just you, your ideas, and AI.",
  maxTeamSize: 3,

  // ── Dates: all null while the event is "coming soon" ──────────────
  /** Registration closes at this instant. */
  registrationClosesUtc: null as string | null,
  /** Leaders may remove a teammate until this instant. */
  rosterLockUtc: null as string | null,
  /** The build starts and the briefs appear. */
  kickoffUtc: null as string | null,
  /** Submissions close. */
  deadlineUtc: null as string | null,
  kickoffLabel: "",
  deadlineLabel: "",
  registrationClosesLabel: "",
  resultsLabel: "",

  /** Empty shows "Prizes announced soon". */
  prizes: [] as { place: string; reward: string }[],

  steps: [
    { title: "Register", body: "Sign up solo or create a team of up to 3. It takes under two minutes." },
    { title: "Build for 48 hours", body: "From Friday kickoff to Sunday deadline: describe what you want, let AI write the code, ship something real." },
    { title: "Submit before the deadline", body: "Public GitHub repo, live deployed URL, and your AI-usage log. Late submissions don't count." },
    { title: "Results", body: "Winners announced on this page, judged on product judgment, prompting skill and polish." },
  ],
  deliverables: [
    { title: "Public GitHub repo", body: "Your full project source, public and cloneable. Private repos won't be judged." },
    { title: "Live deployed URL", body: "Something we can open: Vercel, Netlify or any reachable host. A README-only demo doesn't count." },
    { title: "AI-usage log", body: "A PROMPTS.md in the repo, or exported chat transcripts. This is how we see the build was genuinely vibe-coded." },
  ],
  rules: [
    { title: "Solo or teams of up to 3", body: "Enter alone or create a team. One shareable 6-character code joins teammates, three people at most." },
    { title: "Open to Indian college students", body: "First year through recent graduates. One entry per person, by email." },
    { title: "Build starts at kickoff", body: "No head starts. Anything pre-built must be disclosed in your submission notes." },
    { title: "Fair play", body: "Use any AI coding tool. Don't submit someone else's work as yours." },
  ],
  criteria: [
    { key: "product", title: "Product judgment", body: "Did you pick a sharp problem and ship a coherent answer?" },
    { key: "prompting", title: "Prompting skill", body: "Does the AI-usage log show deliberate steering, not blind copy-paste?" },
    { key: "polish", title: "Polish and deploy", body: "Does it run live, look intentional, and explain itself clearly?" },
  ] as const,

  briefs: briefs as HackathonBrief[],
};

export type CriterionKey = (typeof HACKATHON.criteria)[number]["key"];

/** Where the event stands right now, from its dates. */
export type HackathonPhase = "coming-soon" | "registration" | "closed" | "live" | "judging" | "results";

/** `published` is whether an admin has published the winners (kept in the database, not here). */
export function hackathonPhase(published: boolean, now = Date.now(), h: Pick<typeof HACKATHON, "kickoffUtc" | "deadlineUtc" | "registrationClosesUtc"> = HACKATHON): HackathonPhase {
  if (published) return "results";
  if (!h.kickoffUtc || !h.deadlineUtc) return "coming-soon";
  const kickoff = Date.parse(h.kickoffUtc), deadline = Date.parse(h.deadlineUtc);
  const closes = h.registrationClosesUtc ? Date.parse(h.registrationClosesUtc) : kickoff;
  if (now < closes) return "registration";
  if (now < kickoff) return "closed";
  if (now < deadline) return "live";
  return "judging";
}

/** Leaders may still change the roster. */
export function rosterOpen(now = Date.now(), lock = HACKATHON.rosterLockUtc) {
  return !lock || now < Date.parse(lock);
}
