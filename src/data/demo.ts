/**
 * SAMPLE learner data for the demo dashboard and learning pages.
 * TODO(Real learner dashboard): replace with the signed-in learner's data from Supabase.
 */
export const demoLearner = {
  firstName: "Learner",
  currentDay: 9,
  completedDays: [1, 2, 3, 4, 5, 6, 7, 8],
  assessments: [{ afterDay: 7, score: null as number | null, status: "Awaiting feedback" }],
};

/** Generic rubric used in the assessment preview until real scoring exists. */
export const assessmentRubric = [
  { criterion: "Correctness", description: "The solution works and addresses the brief." },
  { criterion: "Reasoning", description: "Decisions and trade-offs are explained clearly." },
  { criterion: "Role practice", description: "Follows how the role is done in a real team." },
  { criterion: "Communication", description: "Written so a colleague or manager can act on it." },
];

export const dailyChecklist = [
  "Read the problem and restate it in your own words",
  "Note your assumptions",
  "Solve it and save your work",
  "Write 3–5 sentences explaining your approach",
];
