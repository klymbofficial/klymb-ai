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
 * - `enrollmentDeadline` and `cohortCapacity` are PLACEHOLDERS. Replace them
 *   with real values. Never show a countdown or seat counter that is not
 *   driven by real data.
 */
export const pricing = {
  currency: "INR",
  programName: "30-Day Job Readiness Program",
  launchPrice: 14999, // TODO: verify before launch
  referenceValue: 50000, // TODO: verify before launch — must match a real value breakdown
  showReferenceValue: true,
  taxNote: "Price shown is per learner, for one career track. Tax treatment to be confirmed.",
};

export const cohort = {
  /** ISO date. Confirmed by the business. */
  startDate: "2026-09-25",
  /** PLACEHOLDER — replace with the real enrollment deadline. */
  enrollmentDeadline: "2026-09-22",
  enrollmentDeadlineIsPlaceholder: true,
  /** PLACEHOLDER — replace with the real seat cap per track. */
  cohortCapacity: 40,
  cohortCapacityIsPlaceholder: true,
  capacityReason:
    "Cohort size is limited because every weekly assessment and mock interview gets individual feedback.",
};

export const contact = {
  email: "klymbofficial@gmail.com",
};
