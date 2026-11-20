/**
 * The words on /webinar, the long public page for the free System Design
 * webinar. The date, time and sign-up come from src/lib/webinar.ts; the
 * headlines, figures and answers below belong to this page only.
 *
 * Every headline links to its original publication, and every figure is as
 * that publication reported it. Check them again before the next webinar.
 */

export interface Headline {
  outlet: string;
  when: string;
  title: string;
  blurb: string;
  href: string;
  /** The tilt of the cutting, in degrees, so the row looks pinned up by hand. */
  tilt: number;
  /** Pixels it sits lower than its neighbours. */
  drop?: number;
}

export interface Stat {
  value: string;
  label: string;
  source?: string;
  /** Drawn pale: the figure we want you to compare against. */
  faded?: boolean;
  /** Drawn in the brand red, on the dark section. */
  accent?: boolean;
}

export const LAYOFF_HEADLINES: Headline[] = [
  {
    outlet: "Reuters", when: "Bengaluru · Aug 2025", tilt: -1.4,
    title: "India tech giant TCS layoffs herald AI shakeup of $283 billion outsourcing sector",
    blurb: "Experts say the trend could eliminate “around half a million jobs over the next two to three years.”",
    href: "https://tech.yahoo.com/ai/articles/analysis-india-tech-giant-tcs-052643308.html",
  },
  {
    outlet: "Latin Times", when: "Nov 2026", tilt: 1.1, drop: 18,
    title: "Tech Companies Cut More Than 206,000 Jobs This Year While Pouring An Estimated $700 Billion Into AI",
    blurb: "AI was the top stated reason for US job cuts, according to the report.",
    href: "https://www.latintimes.com/ai-cited-us-tech-layoffs-2026-601307",
  },
  {
    outlet: "Yahoo Finance", when: "2026", tilt: -0.6,
    title: "Monday.com is the latest tech company to blame AI for layoffs. Here are 20 others",
    blurb: "Meta “laid off about 8,000 employees, roughly 10% of its workforce” in May 2026.",
    href: "https://finance.yahoo.com/technology/ai/articles/running-list-major-tech-layoffs-012755703.html",
  },
  {
    outlet: "Deccan Herald", when: "8 Aug 2025", tilt: 1.6, drop: 10,
    title: "Adapt or perish: TCS layoffs mark the start of AI reckoning for India's IT sector",
    blurb: "Analysts name people managers, testers and mid-career professionals as most exposed.",
    href: "https://www.deccanherald.com/business/adapt-or-perish-tcs-layoffs-mark-the-start-of-ai-reckoning-for-indias-it-sector-3671984",
  },
];

export const LAYOFF_STATS: Stat[] = [
  { value: "2,06,877", label: "tech workers laid off in 2026", source: "TrueUp tracker, as of 15 Nov 2026" },
  { value: "12,000+", label: "jobs cut at TCS, its largest layoff ever", source: "Reuters, 2025" },
  { value: "1,21,401", label: "US job cuts that named AI as the reason, Jan–Oct 2026", source: "Challenger, Gray & Christmas" },
];

export const HIRING_HEADLINES: Headline[] = [
  {
    outlet: "Careerindia", when: "Nov 2026", tilt: -1,
    title: "India's Hiring Surge: AI and ML Roles Jump 32%. Here's Where the Jobs Are",
    blurb: "Naukri JobSpeak, October 2026. In the same month, “general software and QA hiring grew just 1%.”",
    href: "https://www.careerindia.com/news/india-job-market-2026-ai-ml-hiring-surge-october-report-011-68141.html",
  },
  {
    outlet: "World Economic Forum", when: "Jan 2025", tilt: 1.2, drop: 16,
    title: "170 million jobs created, 92 million displaced by 2030",
    blurb: "Future of Jobs Report 2025. A net 78 million new jobs, and about 39% of core job skills will change.",
    href: "https://www.weforum.org/publications/the-future-of-jobs-report-2025/",
  },
  {
    outlet: "Nasscom, via BHRRC", when: "2025", tilt: -0.5,
    title: "India needs a million AI professionals. Not even 20% of its IT workforce is AI-skilled.",
    blurb: "Companies are hiring for new skills while letting go of people without them.",
    href: "https://www.business-humanrights.org/en/latest-news/india-mass-layoffs-at-tcs-amid-ai-driven-restructuring-spark-fears-of-job-loss-skills-mismatch-and-shrinking-middle-class-in-it-sector/",
  },
];

export const HIRING_STATS: Stat[] = [
  { value: "+32%", label: "AI and ML hiring in India, Oct 2026", accent: true },
  { value: "+1%", label: "general software and QA hiring, same month", faded: true },
  { value: "+78M", label: "net new jobs worldwide by 2030" },
];

export const SKILL_STATEMENT =
  "Writing code is getting cheaper every month. Deciding how a system should work, at what scale, at what cost and what happens when it breaks, still needs a person. Interviewers test it. Senior roles are built on it.";

/** "If you nod at any of these". */
export const AUDIENCES: [who: string, why: string][] = [
  ["Final-year student", "Placements are close and “design this app” sounds scarier than any DSA question."],
  ["Fresher still looking", "Entry-level roles are tight, and you need something on your side that AI can't copy."],
  ["Developer, 1 to 5 years in", "You ship features every day, but the SDE-2 or senior round keeps asking you to design."],
  ["Worried about the next layoff list", "You read the headlines above and want to be in the skill that's growing."],
  ["Switching into tech", "You've learned to code and now want to see how real products fit together."],
  ["Coding with AI every day", "Copilot writes half your code, and you wonder what's left for you to be good at."],
];

export const NOT_FOR =
  "you already take system design interviews for your company. You'd be bored, and we'd rather you send this to someone who isn't.";

export const FAQ: [q: string, a: string][] = [
  ["Is it really free?", "Yes. Register with your name, email and WhatsApp number. No payment, no card."],
  ["I've never done system design. Will I keep up?", "Yes. We start from the basics in plain words. If you've written any code, you'll follow along."],
  ["Do I need to know a particular language?", "No. System design is about how parts fit together, not syntax."],
  ["What do I need on the day?", "A laptop or phone, a steady connection and a notebook. Join five minutes early."],
  ["Is this a sales pitch?", "A few minutes near the end are about why we started Klymb.ai and what we built. The rest of the hour is teaching."],
];
