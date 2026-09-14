import type { Evidence, Faq, Source, WeekPhase } from "@/types/program";
import { contact } from "./config";

export const brand = {
  name: "Klymb.ai",
  tagline: "30-day job readiness for the AI era.",
};

export const navLinks = [
  { label: "Program", href: "/program" },
  { label: "Career Tracks", href: "/tracks" },
  { label: "How It Works", href: "/#how-it-works" },
  { label: "Pricing", href: "/#pricing" },
];

export const hero = {
  eyebrow: "30-Day Job Readiness Program",
  headline: "Become Job-Ready in 30 Days",
  subheadline:
    "Choose your target role, solve real workplace problems every day, complete weekly assessments and prepare for mock interviews with a structured career track.",
  primaryCta: { label: "Choose My Career Track", href: "/tracks" },
  secondaryCta: { label: "See How the 30 Days Work", href: "/#how-it-works" },
};

/** The story beat under the hero. */
export const statement = "Your title is the liability. Your domain knowledge is the asset.";

export const inclusions = [
  { figure: "1", label: "Selected career track", detail: "Everything you do is specific to the role you want." },
  { figure: "30", label: "Practical daily challenges", detail: "One real workplace problem a day." },
  { figure: "4", label: "Weekly assessments", detail: "After Days 7, 14, 21 and 28, with feedback." },
  { figure: "1+", label: "Role-specific project", detail: "Evidence you can show an interviewer." },
  { figure: "✓", label: "Interview preparation", detail: "Role-specific questions and answer frameworks." },
  { figure: "2", label: "Mock interview days", detail: "Days 29 and 30, after Week 4." },
];

export const sources = {
  wef: {
    label: "World Economic Forum, Future of Jobs Report 2025",
    url: "https://www.weforum.org/press/2025/01/future-of-jobs-report-2025-78-million-new-job-opportunities-by-2030-but-urgent-upskilling-needed-to-prepare-workforces/",
  },
  pwc: {
    label: "PwC, 2025 Global AI Jobs Barometer",
    url: "https://www.pwc.com/gx/en/news-room/press-releases/2025/ai-linked-to-a-fourfold-increase-in-productivity-growth.html",
  },
  microsoft: {
    label: "Microsoft Research, Working with AI (2025)",
    url: "https://www.microsoft.com/en-us/research/publication/working-with-ai-measuring-the-occupational-implications-of-generative-ai/",
  },
  qaSalary: {
    label: "SoftwareTestPilot, QA Salary Guide 2026 (India)",
    url: "https://softwaretestpilot.com/qa-salary-guide",
  },
  aiSalary: {
    label: "Futurense, AI Engineer Salary in India",
    url: "https://futurense.com/blog/ai-engineer-salary-in-india",
  },
} satisfies Record<string, Source>;

/**
 * Every figure here must link to a public source.
 * Re-check figures before launch; reports are updated yearly.
 */
export const evidence: Evidence[] = [
  {
    figure: "92M",
    claim: "Jobs expected to be displaced globally by 2030, while 170M new roles are created. The shift rewards people who reskill.",
    source: sources.wef,
  },
  {
    figure: "56%",
    claim: "Average wage premium for jobs that require AI skills, up from 25% the year before.",
    source: sources.pwc,
  },
  {
    figure: "3x",
    claim:
      "Entry pay for AI engineers in India (₹15–30 LPA, 2–5 yrs) starts at roughly 3x a manual tester's band (₹5–9 LPA, 1–3 yrs). Market ranges, not a promise of any individual salary.",
    source: sources.aiSalary,
  },
];

export const howItWorks = [
  { title: "Choose a track", body: "Pick one of five roles. Everything after this is specific to it." },
  { title: "Solve a daily workplace problem", body: "One realistic problem a day, the kind the role actually faces." },
  { title: "Complete the weekly assessment", body: "After Days 7, 14, 21 and 28 — scored, with feedback." },
  { title: "Build role-specific evidence", body: "Your work becomes a portfolio piece you can walk through." },
  { title: "Prepare for interviews", body: "Role-specific questions, frameworks and practice answers." },
  { title: "Complete mock interviews", body: "Days 29 and 30: realistic interviews with feedback." },
];

export const weekPhases: WeekPhase[] = [
  { week: 1, name: "Foundations", days: "Days 1–7", summary: "The core concepts and tools of the role, and how AI is changing them." },
  { week: 2, name: "Practical execution", days: "Days 8–14", summary: "Doing the actual work, end to end, on realistic scenarios." },
  { week: 3, name: "Real-world problem solving", days: "Days 15–21", summary: "Messy, ambiguous problems with trade-offs and stakeholders." },
  { week: 4, name: "Portfolio and interview readiness", days: "Days 22–28", summary: "Finish your project and prepare to present it." },
];

export const mockInterviewPhase = {
  days: "Days 29–30",
  name: "Mock interviews",
  summary: "Technical, scenario and behavioural rounds with written feedback.",
};

export const outcomes = [
  "Solve role-specific workplace problems",
  "Build evidence of practical ability",
  "Complete weekly assessments",
  "Improve communication and decision-making",
  "Prepare for common interview questions",
  "Practice with mock interviews",
];

export const valueBreakdown = [
  "30 daily practical problems",
  "4 weekly assessments",
  "Role-specific projects",
  "Progress tracking",
  "Interview preparation",
  "Mock interview preparation",
];

/** Placeholder answers are marked. Replace once policies are final. */
export const faqs: Faq[] = [
  {
    question: "Who is this program for?",
    answer:
      "Working professionals and graduates who want to move into, or level up within, one of our five roles: QA Engineer, L1/L2 Support, Project Manager, Junior Developer or Reporting Analyst.",
  },
  {
    question: "Do I need prior experience?",
    answer:
      "No prior experience in the target role is required, but you should be comfortable using a computer daily and committing 1–2 hours a day. Some tracks recommend basic familiarity with the domain; each track page lists who it is for.",
  },
  {
    question: "Can I change my track?",
    answer:
      "Placeholder: track changes may be allowed before the cohort starts or within the first few days. The final policy will be published before enrolment opens.",
  },
  {
    question: "What happens every day?",
    answer:
      "You receive one practical workplace problem for your track, work on it, and submit your solution. Each problem builds towards that week's assessment and your final project.",
  },
  {
    question: "How do weekly assessments work?",
    answer:
      "After Days 7, 14, 21 and 28 you complete an assessment based on that week's work. It is scored against a rubric and you receive feedback on what to improve.",
  },
  {
    question: "When do mock interviews happen?",
    answer: "On Days 29 and 30, after all four weekly assessments are complete.",
  },
  {
    question: "Is employment guaranteed?",
    answer:
      "No. Klymb.ai does not guarantee a job, placement or salary. The program is designed to build practical ability, evidence and interview readiness — outcomes depend on you and the job market.",
  },
  {
    question: "What is included in the price?",
    answer:
      "One career track with 30 daily problems, 4 weekly assessments with feedback, role-specific projects, progress tracking, interview preparation and mock interviews.",
  },
  {
    question: "What is the refund policy?",
    answer: `Placeholder: the refund policy is being finalised and will be published before payments open. For questions, write to ${contact.email}.`,
  },
];

export const urgency = {
  headline: "The next cohort closes before your role does.",
};

export const footerLinks = {
  program: [
    { label: "Career Tracks", href: "/tracks" },
    { label: "Program", href: "/program" },
    { label: "Register", href: "/register" },
    { label: "Learner dashboard (demo)", href: "/dashboard" },
  ],
  company: [
    { label: "Contact", href: "/contact" },
    { label: "Privacy Policy", href: "/privacy" },
    { label: "Terms", href: "/terms" },
    { label: "Refund Policy", href: "/refund-policy" },
  ],
};

export const roleOptions = ["Student / graduate", "Manual tester", "Support executive", "Coordinator / PM", "Developer", "Analyst", "Career switcher", "Other"];
export const experienceOptions = ["0–1 years", "1–3 years", "3–5 years", "5–8 years", "8+ years"];
