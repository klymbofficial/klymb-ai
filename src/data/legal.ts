/**
 * ─────────────────────────────────────────────────────────────
 *  ENTITY, GRIEVANCE AND POLICY DETAILS
 * ─────────────────────────────────────────────────────────────
 *
 * The legal identification India's Digital Personal Data Protection Act 2023,
 * the IT Rules 2021 and the Consumer Protection (E-Commerce) Rules 2020 require
 * a seller to publish. Klymb.ai is a brand of Creators Enterprises Private
 * Limited, which also holds the account payments settle to: the seller named
 * here must be the entity that receives the money.
 *
 * CIN, incorporation date, registered office and directors are from the
 * company's public MCA record (looked up 26 September 2026).
 *
 * ⚠️ `confirm` marks what should be checked against the Certificate of
 * Incorporation, or decided by the company, before the first payment.
 */

export const entity = {
  brand: "Klymb.ai",
  registeredName: "Creators Enterprises Private Limited",
  entityType: "Private Limited Company",
  cin: "U72900UP2016PTC086187",
  incorporationDate: "06 September 2016",
  registrar: "Registrar of Companies, Kanpur",
  directors: ["Tarun Kumar Singh", "Gayatri Singh"],
  /** confirm: exactly as printed on the Certificate of Incorporation. */
  address: "1605, Tower 3, Panchsheel Wellington, Crossing Republik, Ghaziabad, Uttar Pradesh 201016, India",
  /** confirm: add the GSTIN here once registered; it is shown wherever it is set. */
  gstin: null as string | null,
} as const;

/** The same facts on every legal page, in one order, so they cannot drift apart. */
export const entityRows: [string, string][] = [
  ["Brand", entity.brand],
  ["Registered entity", entity.registeredName],
  ["Entity type", entity.entityType],
  ["Corporate Identification Number (CIN)", entity.cin],
  ["Date of incorporation", entity.incorporationDate],
  ["Registered with", entity.registrar],
  ["Directors", entity.directors.join(", ")],
  ...(entity.gstin ? ([["GSTIN", entity.gstin]] as [string, string][]) : []),
  ["Registered office", entity.address],
];

export const grievance = {
  /** confirm: the company's choice of Grievance Officer: a director by default. */
  name: "Tarun Kumar Singh",
  designation: "Director and Grievance Officer",
  email: "klymbofficial@gmail.com",
  address: entity.address,
  acknowledgeWithin: "24 hours",
  resolveWithin: "15 days",
} as const;

export const policyVersion = {
  version: "2026-10-07",
  effective: "7 October 2026",
} as const;

/**
 * Refund: complete the cohort, get the whole fee back.
 * The conditions below are what make that promise enforceable rather than
 * arguable: confirm each one.
 */
export const refund = {
  headline: "Complete all 30 days and we refund 100% of your fee.",
  /** confirm: is every one of these required? */
  conditions: [
    "All 30 days submitted: a deliverable or answers recorded for every day from 1 to 30",
    "All four weekly assessments submitted and defended (days 7, 14, 21 and 28)",
    "Both mock interview rounds attended (days 29 and 30)",
    "The four checkpoint LinkedIn posts published from your own profile",
    "Your portfolio repository public, with commits on at least 20 separate days",
  ],
  /** confirm: must work be done during the cohort, or can days be caught up afterwards? */
  window: "Every submission must be made by the end of your Day 30. Work backfilled after your 30 days end does not count towards completion.",
  /** confirm: 14 working days, and to the original payment method? */
  payout: "Refunds are paid to the original payment method within 14 working days of your Day 30, once completion has been verified by your reviewer.",
  partial: "There is no partial refund. Completing 29 of 30 days does not qualify: the point of the guarantee is finishing.",
  /** confirm: is this right? A learner who is removed for cheating presumably forfeits. */
  forfeit: "A place ended for plagiarism, fabricated evidence or undisclosed AI use does not qualify for the refund.",
  cancellation: "Cancel before your Day 1 opens and you are refunded in full, no conditions. After that, the completion guarantee above is the route to a refund.",
} as const;

export const dataPoints = {
  collected: [
    ["Registration", "Name, email, phone, chosen track, current role, years of experience, optional LinkedIn URL, and your consent to be contacted"],
    ["Account", "Your Google account email, name and profile image, through Google sign-in"],
    ["Evidence accounts", "The GitHub username and LinkedIn profile you declare, so submitted links can be checked as yours"],
    ["Coursework", "Daily submissions, deliverable links, your notes, knowledge-check answers, checkpoint LinkedIn post links, assessment scores and reviewer feedback"],
    ["Technical logs", "IP address, request time, path, status and browser type, processed by our hosting provider to serve pages and keep the service secure"],
    ["Analytics", "Aggregate usage measured with Google Analytics 4, on by default and switchable off at /cookies"],
  ],
  processors: [
    ["Vercel", "Website hosting and technical logs", "United States and global edge network"],
    ["Supabase", "Database holding registrations, learner records and submissions", "Tokyo, Japan"],
    ["Google", "Sign-in (OAuth) and Google Analytics 4", "Global"],
  ],
} as const;
