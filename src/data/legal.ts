/**
 * ─────────────────────────────────────────────────────────────
 *  ENTITY, GRIEVANCE AND POLICY DETAILS
 * ─────────────────────────────────────────────────────────────
 *
 * These are published legal identifications under India's Digital Personal
 * Data Protection Act 2023, the IT Rules 2021 and the Consumer Protection
 * (E-Commerce) Rules 2020. Taken from the Udyam Registration Certificate for
 * BIGBETS.AI (verified 17 September 2026).
 *
 * ⚠️ Anything marked `confirm` below is my best reading of what you told me —
 * check each one before you take a single payment.
 */

export const entity = {
  brand: "Klymb.ai",
  registeredName: "BIGBETS.AI",
  entityType: "Sole Proprietorship (Proprietary)",
  enterpriseScale: "Micro (Udyam)",
  majorActivity: "Services",
  nic: "62099 — Other information technology and computer service activities n.e.c.",
  proprietor: "Suman Shukla",
  udyamNumber: "UDYAM-UP-29-0250625",
  udyamDate: "01 August 2026",
  incorporationDate: "25 July 2026",
  address: "Flat No. 803-A, Tower 2A, Panchsheel Wellington, Crossing Republic, Ghaziabad, Uttar Pradesh 201016, India",
} as const;

export const grievance = {
  name: "Suman Shukla",
  designation: "Proprietor and Grievance Officer",
  email: "klymbofficial@gmail.com", // confirm: or team@abtalks.in / contact.bigbetsai@gmail.com
  address: entity.address,
  acknowledgeWithin: "24 hours",
  resolveWithin: "15 days",
} as const;

export const policyVersion = {
  version: "2026-09-17",
  effective: "17 September 2026",
} as const;

/**
 * Refund: complete the cohort, get the whole fee back.
 * The conditions below are what make that promise enforceable rather than
 * arguable — confirm each one.
 */
export const refund = {
  headline: "Complete all 30 days and we refund 100% of your fee.",
  /** confirm: is every one of these required? */
  conditions: [
    "All 30 days submitted — a deliverable or answers recorded for every day from 1 to 30",
    "All four weekly assessments submitted and defended (days 7, 14, 21 and 28)",
    "Both mock interview rounds attended (days 29 and 30)",
    "The four checkpoint LinkedIn posts published from your own profile",
    "Your portfolio repository public, with commits on at least 20 separate days",
  ],
  /** confirm: must work be done during the cohort, or can days be caught up afterwards? */
  window: "Every submission must be made during the cohort — by the end of Day 30. Work backfilled after the cohort ends does not count towards completion.",
  /** confirm: 14 working days, and to the original payment method? */
  payout: "Refunds are paid to the original payment method within 14 working days of the cohort ending, once completion has been verified by your reviewer.",
  partial: "There is no partial refund. Completing 29 of 30 days does not qualify — the point of the guarantee is finishing.",
  /** confirm: is this right? A learner who is removed for cheating presumably forfeits. */
  forfeit: "A place ended for plagiarism, fabricated evidence or undisclosed AI use does not qualify for the refund.",
  cancellation: "Cancel before the cohort starts and you are refunded in full, no conditions. After the cohort starts, the completion guarantee above is the route to a refund.",
} as const;

export const dataPoints = {
  collected: [
    ["Registration", "Name, email, phone, chosen track, current role, years of experience, optional LinkedIn URL, and your consent to be contacted"],
    ["Account", "Your Google account email, name and profile image, through Google sign-in"],
    ["Evidence accounts", "The GitHub username and LinkedIn profile you declare, so submitted links can be checked as yours"],
    ["Coursework", "Daily submissions, deliverable links, your notes, knowledge-check answers, checkpoint LinkedIn post links, assessment scores and reviewer feedback"],
    ["Technical logs", "IP address, request time, path, status and browser type, processed by our hosting provider to serve pages and keep the service secure"],
    ["Analytics", "Aggregate usage measured with Google Analytics 4, only if you allow analytics cookies"],
  ],
  processors: [
    ["Vercel", "Website hosting and technical logs", "United States and global edge network"],
    ["Supabase", "Database holding registrations, learner records and submissions", "Tokyo, Japan"],
    ["Google", "Sign-in (OAuth) and, with your consent, Google Analytics 4", "Global"],
  ],
} as const;
