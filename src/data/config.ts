/**
 * ─────────────────────────────────────────────────────────────
 *  PRICING, COHORT & URGENCY CONFIG
 *  Every price, date and capacity shown on the site comes from here.
 * ─────────────────────────────────────────────────────────────
 *
 * ⚠️ VERIFY BEFORE LAUNCH
 * - `launchPrice` and `referenceValue` must both be confirmed by the business.
 * - `referenceValue` may only be shown if it reflects a genuine, documented
 *   value breakdown of what is included. Do not use it as a fake price anchor.
 *   Set `showReferenceValue` to false if it cannot be justified.
 * - `cohortCapacity` is a PLACEHOLDER. Replace it
 *   with real values. Never show a countdown or seat counter that is not
 *   driven by real data.
 */
export const pricing = {
  currency: "INR",
  programName: "30-Day Job Readiness Program",
  // Each track has its own launch price, see `price` in src/data/tracks.ts.
  referenceValue: 50000, // TODO: verify before launch: must match a real value breakdown
  // Off until the figure is backed by a documented value breakdown: a
  // reference price that cannot be shown to be real is a dark pattern.
  showReferenceValue: false,
  taxNote: "Per learner, for one career track. Prices include GST.",
};

/**
 * Enrolment is rolling: each learner's Day 1 is the day they are enrolled,
 * not a shared date. `startDate` is kept only as the intake key that ties a
 * registration to its payment in the database; it is never shown to buyers.
 */
export const enrolment = {
  rolling: true,
  dailyTime: "1–2 hrs a day",
  dailyTimeLong: "1–2 hours a day, whenever suits you",
};

export const cohort = {
  /** Intake key for registrations and payments. Not a public start date: see `enrolment`. */
  startDate: "2026-10-05",
  /** Confirmed by the business, 1 October 2026: the day before the cohort starts. */
  enrollmentDeadline: "2026-10-04",
  enrollmentDeadlineIsPlaceholder: false,
  /** PLACEHOLDER: replace with the real seat cap per track. */
  cohortCapacity: 40,
  cohortCapacityIsPlaceholder: true,
  capacityReason:
    "Cohort size is limited because every weekly assessment and mock interview gets individual feedback.",
};

/** The canonical public address. Everything absolute, links in previews, the sitemap, is built from this. */
export const site = {
  url: "https://www.klymb.ai",
  /** The production alias Vercel gives the project; permanently redirected to `url`. */
  vercelAlias: "klymb-ai.vercel.app",
};

export const contact = {
  email: "klymbofficial@gmail.com",
};

export const socials = [
  { label: "Instagram", handle: "@klymb.ai", href: "https://www.instagram.com/klymb.ai/" },
  { label: "X", handle: "@KlymbAI", href: "https://x.com/KlymbAI" },
];
