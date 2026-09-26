/**
 * ─────────────────────────────────────────────────────────────
 *  WHO DESIGNED THIS: real people only
 * ─────────────────────────────────────────────────────────────
 *
 * Every entry is a public claim about a named person and their employer.
 * Before adding anyone, you need all four of these:
 *   1. their name and exact title
 *   2. what they actually did on THIS program (designed / reviewed /
 *      advises / runs mock interviews): say the true one, not the biggest one
 *   3. their explicit consent to be named publicly alongside their employer
 *   4. `current: false` if the role is past ("ex-Google", not "at Google")
 *
 * The section renders nothing while this list is empty, so an unfinished
 * placeholder can never reach a learner.
 *
 * Do not add company logos: using an employer's marks to sell a product
 * implies an endorsement they have not given.
 */
export interface Designer {
  name: string;
  title: string;
  company: string;
  /** True if they hold this role now; false renders "formerly". */
  current: boolean;
  /** The specific part of the program they shaped, in their own words where possible. */
  contribution: string;
  linkedin?: string;
}

export const designers: Designer[] = [
  // Example of the shape: delete this comment block and add real, consented entries:
  // {
  //   name: "Priya Nair",
  //   title: "Senior Engineering Program Manager",
  //   company: "Microsoft",
  //   current: true,
  //   contribution: "Reviewed the Week 2 estimation model and runs the Day 29 technical round.",
  //   linkedin: "https://www.linkedin.com/in/example",
  // },
];

/**
 * Layout demo only. Enabled with NEXT_PUBLIC_DESIGNER_DEMO=true, never in
 * production: the roles are generic and the companies are lettered so nothing
 * here can be mistaken for a real person or a real endorsement.
 */
export const demoDesigners: Designer[] = [
  { name: "Advisor one", title: "Senior Engineering Program Manager", company: "Company A", current: true, contribution: "Reviews the Week 2 estimation model and runs Day 29 technical rounds." },
  { name: "Advisor two", title: "Senior QA Engineer", company: "Company B", current: true, contribution: "Shapes the testing track and the Day 21 crisis injects." },
  { name: "Advisor three", title: "Technical Support Lead", company: "Company C", current: true, contribution: "Designed the incident communication exercise." },
  { name: "Advisor four", title: "Software Development Engineer", company: "Company D", current: true, contribution: "Reviews the code-review and AI-governance days." },
  { name: "Advisor five", title: "Business Reporting Analyst", company: "Company E", current: true, contribution: "Built the measurement plan and metric definitions." },
  { name: "Advisor six", title: "Technical Program Manager", company: "Company F", current: true, contribution: "Co-designed the assessment rubric." },
];

export const designerDemoEnabled = process.env.NEXT_PUBLIC_DESIGNER_DEMO === "true";

/** Shown while the list is empty: true, and stronger than a row of logos. */
export const designStandard = {
  eyebrow: "How this was built",
  title: "Built from how the work is actually done",
  points: [
    "One running project modelled on a real delivery, not exercises",
    "Every figure on this site links to its public source",
    "Four checkpoints that are defended live, not marked by a script",
    "No job guarantee, no placement claim, no invented testimonials",
  ],
};
