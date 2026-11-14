import { entity } from "@/data/legal";
import { contact } from "@/data/config";
import { tracks } from "@/data/tracks";

/**
 * Copy for the public story pages (Home, Why Klymb, About, Organizations).
 * Every line states something the code does today, so each entry names where
 * it comes from. When the product changes, change the line here.
 */

export const trackCount = tracks.filter((t) => t.available).length;

/**
 * The home page's first screen. Two audiences, said with equal weight. Every
 * line is something the site does today: the career tracks and System Design
 * are open (src/data/catalog.ts), and the organization pages let a company add
 * people, group them into teams and assign System Design as a pilot
 * (docs/organization-workspace.md). Draft wording, for review.
 */
export const homeHero = {
  eyebrow: "For individuals and for organizations",
  titleLines: ["Practical learning,", "for you or your team."],
  body: "Individuals can work through a 30-day career track or take a course. Organizations can add their people, group them into teams and assign System Design, as a pilot.",
};

/** The two doors on the first screen, equal in size and weight. Each button goes to a page that exists. */
export const homeDoors = {
  individuals: {
    eyebrow: "For individuals",
    title: "Explore courses and career tracks.",
    body: `${trackCount} career tracks of 30 days each, and the System Design course.`,
    cta: { label: "Explore courses", href: "/courses" },
    secondary: { label: "Career tracks", href: "/tracks" },
  },
  organizations: {
    eyebrow: "For organizations · pilot",
    title: "Explore team training and the organization pilot.",
    body: "Add people, group them into teams and assign System Design. Other courses can't be assigned yet.",
    cta: { label: "Explore team training", href: "/training-solutions" },
    secondary: { label: "Organization pilot", href: "/organizations" },
  },
};

export const learnerPath = {
  eyebrow: "For individuals",
  title: "Learn one role in 30 days, or take a single course.",
  body: "Choose a career track and work through one realistic workplace problem a day, with four checkpoints and two days of interview prep. Or take System Design, a video course with short lessons.",
  points: [
    "One role, one project, built day by day",
    "Start any day, 1–2 hours at a time",
    "Your work lives in your own GitHub repository",
  ],
  cta: { label: "Explore courses", href: "/courses" },
  secondary: { label: "Compare the career tracks", href: "/tracks" },
};

/** What a company can do in /org today (People, Teams, Learning pages). */
export const orgPath = {
  eyebrow: "For organizations · pilot",
  title: "Upskill the people you already employ.",
  body: "A pilot workspace for companies: add your people, group them into teams and assign System Design. See who has started, lessons passed and final assessment scores.",
  points: [
    "Invite people one by one or from a CSV",
    "Teams, each with a head you choose",
    "Progress you can read at a glance, live",
  ],
  cta: { label: "Explore team training", href: "/training-solutions" },
  secondary: { label: "Organization pilot", href: "/organizations" },
  signIn: { label: "Already invited? Sign in", href: "/org/sign-in" },
};

/** The daily loop, as the learner screens actually work. */
export const approach = [
  { title: "One problem a day", body: "Each day is one realistic problem from the role, with a mission, build steps and what done looks like." },
  { title: "You submit real work", body: "Paste the link to your own GitHub repository, add a note on what you did and why, and answer a few written questions. You can update a day any time." },
  { title: "Four checkpoints", body: "After Days 7, 14, 21 and 28 you complete a checkpoint on that week's work." },
  { title: "Interview prep to finish", body: "Days 29 and 30 take the most-asked questions for your role, answered in writing with your own work as the example." },
  { title: "See where you stand", body: "A calendar shows every day you have submitted and what comes next. Days open in order, so you always know the one to do today." },
];

export const principles = [
  { title: "Evidence, not a certificate", body: "There is no certificate. What you leave with is a project in your own repository and answers you can walk an interviewer through." },
  { title: "No promised outcomes", body: "No program can guarantee a job, and we don't say it will. We say what you will have done." },
  { title: "Say what is not built yet", body: "Where something is not available, we say so, on the page where you would look for it." },
];

/** What the organization pages say is not available yet, in the same words. */
export const orgNotYet = [
  "Assigning anything other than System Design, and assigning assessments.",
  "Company reports and exports.",
  "Single sign-on: people sign in with an emailed code.",
];

export const aboutFacts = {
  email: contact.email,
  registeredName: entity.registeredName,
  incorporationYear: entity.incorporationDate.slice(-4),
  country: "India",
};
