/**
 * ─────────────────────────────────────────────────────────────
 *  WHO DESIGNED THIS — real people only
 * ─────────────────────────────────────────────────────────────
 *
 * Every entry is a public claim about a named person and their employer.
 * Before adding anyone, you need all four of these:
 *   1. their name and exact title
 *   2. what they actually did on THIS program (designed / reviewed /
 *      advises / runs mock interviews) — say the true one, not the biggest one
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
  // Example of the shape — delete this comment block and add real, consented entries:
  // {
  //   name: "Priya Nair",
  //   title: "Senior Engineering Program Manager",
  //   company: "Microsoft",
  //   current: true,
  //   contribution: "Reviewed the Week 2 estimation model and runs the Day 29 technical round.",
  //   linkedin: "https://www.linkedin.com/in/example",
  // },
];

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
