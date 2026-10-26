import type { TrackSlug } from "@/types/program";

/**
 * What a five-minute spoken session is about.
 *
 * One topic per session, chosen from the learner's own track and drawn from
 * what its first fortnight actually teaches (src/data/curricula) — so the
 * coach asks about work they have done, not about a subject in general. The
 * screen says "Practising: <label>" throughout, which is what stops the
 * session feeling like an open-ended chat.
 *
 * `skills` are what gets recorded against the learner, so the ids and the
 * skill names are stored and must not be reworded casually: a renamed skill
 * reads as a new one and breaks the comparison with an earlier session.
 */
export interface CoachTopic {
  /** Stored on every row of evidence, so it is permanent. */
  id: string;
  /** Said out loud and shown on screen. */
  label: string;
  /** Three or four is all one session can honestly cover. */
  skills: string[];
  /** The opening question, asked verbatim so every learner starts level. */
  opener: string;
  /** What separates an answer with substance from a confident label, so the coach probes. */
  strongAnswer: string;
}

const TOPICS: Record<TrackSlug, CoachTopic[]> = {
  "junior-developer": [
    {
      id: "git-history",
      label: "Git history as an argument",
      skills: ["Commit messages", "Branching and rebasing", "Explaining a change"],
      opener: "Walk me through the last commit you pushed. What does the message say, and why that message?",
      strongAnswer:
        "The message says why, not what; they can name what they would split out of a large commit, and why a reviewer reads history rather than the diff alone.",
    },
    {
      id: "reading-unfamiliar-code",
      label: "Reading code you did not write",
      skills: ["Finding the entry point", "Tracing data flow", "Working without running it"],
      opener:
        "Think of a codebase you opened for the first time recently. How did you find where a request turns into a database call?",
      strongAnswer:
        "A route or handler as the entry point, followed through the layers by reading rather than guessing, and the honesty to say which part they are still unsure of.",
    },
    {
      id: "async-javascript",
      label: "JavaScript promises and async flow",
      skills: ["await versus then", "Handling a rejection", "Running work in parallel"],
      opener: "In your own words, what does await actually do to the function it is in?",
      strongAnswer:
        "The function yields and the rest is resumed later; a rejection needs try/catch or a catch handler; two independent calls belong in Promise.all rather than one await after another.",
    },
  ],
  "qa-engineer": [
    {
      id: "test-design",
      label: "Test design that finds real defects",
      skills: ["Boundaries and edge cases", "Equivalence partitioning", "Deciding what not to test"],
      opener:
        "Take a field that accepts a quantity between one and ninety-nine. Which cases do you write, and which do you leave out?",
      strongAnswer:
        "The boundaries and just outside them, one case per class rather than many of the same, and a stated reason for leaving the rest — risk, not coverage for its own sake.",
    },
    {
      id: "defect-reports",
      label: "Defect reports that get fixed",
      skills: ["Reproduction steps", "Severity against priority", "Attaching the evidence"],
      opener: "Tell me about a bug you reported that the developer could reproduce immediately. What was in that report?",
      strongAnswer:
        "Steps someone else can follow, expected against actual, the environment and build, and severity argued from impact rather than from how annoying it was.",
    },
    {
      id: "flaky-tests",
      label: "Flaky tests and their root cause",
      skills: ["Waiting properly", "Test isolation", "Diagnosing nondeterminism"],
      opener: "You have a test that passes alone and fails in the suite. Where do you look first?",
      strongAnswer:
        "Shared state or ordering before anything else, waiting on a condition rather than on a sleep, and a retry named as a cover-up rather than a fix.",
    },
  ],
  "l1-l2-support": [
    {
      id: "triage-severity",
      label: "Triage and severity that survives an audit",
      skills: ["Severity against priority", "Assessing impact", "Working to an SLA"],
      opener: "One customer cannot log in, and a hundred see a slow dashboard. Which one do you pick up first, and why?",
      strongAnswer:
        "Impact and blast radius reasoned out loud, severity separated from priority, and a decision they could defend to a customer either way.",
    },
    {
      id: "customer-reply",
      label: "The reply a customer acts on",
      skills: ["Plain language", "One clear action", "Setting expectations"],
      opener: "How do you open a reply to someone who is already angry and has waited two days?",
      strongAnswer:
        "What is true now, one thing for them to do, and when they will next hear from you — an apology that is not a substitute for any of the three.",
    },
    {
      id: "escalation",
      label: "The escalation engineering accepts",
      skills: ["Gathering evidence", "Reading logs and traces", "Reproducing the failure"],
      opener: "What goes into an escalation before you send it to engineering?",
      strongAnswer:
        "The one failing request found in the logs, how to reproduce it, what they already ruled out, and the impact — not a forwarded complaint.",
    },
  ],
  "project-manager": [
    {
      id: "scope-boundary",
      label: "Charter and the scope boundary",
      skills: ["What is out of scope", "Change control", "Saying no"],
      opener: "A stakeholder adds a request mid-sprint. What do you say to them?",
      strongAnswer:
        "Out-of-scope stated as plainly as in-scope, the trade named in time or people, and a route for the request rather than a flat refusal.",
    },
    {
      id: "estimation",
      label: "Estimating without lying",
      skills: ["Ranges and confidence", "Naming assumptions", "Where buffers go"],
      opener: "Someone wants a date for work nobody has done before. What do you give them?",
      strongAnswer:
        "A range with what would move it, assumptions written down, and buffer held at the plan level rather than hidden inside every task.",
    },
    {
      id: "status-reporting",
      label: "Status an executive can act on",
      skills: ["Asking for a decision", "Honest red and amber", "Surfacing risk early"],
      opener: "Your project slipped a week. How does that appear in the status report?",
      strongAnswer:
        "The slip up front with its cause, the decision being asked for, and amber used before the week is lost rather than after.",
    },
  ],
  "reporting-analyst": [
    {
      id: "sql-beyond-select",
      label: "SQL past the SELECT",
      skills: ["Joins and what they drop", "Grouping and filtering groups", "Window functions"],
      opener: "What is the difference between filtering in WHERE and filtering in HAVING?",
      strongAnswer:
        "Before and after the grouping, said with an example; an inner join quietly losing rows; and a window function where a group-by would have collapsed what they needed.",
    },
    {
      id: "metric-definition",
      label: "Defining a metric that survives an executive",
      skills: ["Numerator and denominator", "Time grain", "The edge cases"],
      opener: "How would you define active users, as you would write it down for the business?",
      strongAnswer:
        "An explicit numerator, denominator and window, what counts as an action, and the exclusions — staff accounts, bots, refunds — named before being asked.",
    },
    {
      id: "data-quality",
      label: "The data is wrong, and you have to say so",
      skills: ["Spotting the anomaly", "Quantifying the impact", "Raising it"],
      opener: "A number in yesterday's report is clearly too high. What do you do before telling anyone?",
      strongAnswer:
        "Reproduce it, find where it enters, size how much of the report is affected, then tell people with the size of the problem rather than only the fact of it.",
    },
  ],
  "ai-product-manager": [
    {
      id: "product-contract",
      label: "An auditable product contract",
      skills: ["Acceptance criteria", "Naming the failure modes", "Hooks for evaluation"],
      opener: "You are specifying an AI feature. What makes the spec auditable rather than hopeful?",
      strongAnswer:
        "Criteria that can be checked by someone else, the failure modes written down with what happens in each, and where the measurement attaches before launch.",
    },
    {
      id: "model-selection",
      label: "Selecting a model against product constraints",
      skills: ["Cost, latency and quality", "Evidence for the choice", "What happens on failure"],
      opener: "How do you choose between two models for a feature without going on vibes?",
      strongAnswer:
        "A small evaluation set from real inputs, the three constraints traded off explicitly, and a fallback for when the first choice is slow or down.",
    },
    {
      id: "retrieval-value",
      label: "Comparing retrieval against outcome value",
      skills: ["Chunking choices", "Checking grounding", "Measuring the answer"],
      opener: "Retrieval is returning plausible answers that are subtly wrong. Where do you look?",
      strongAnswer:
        "Chunking and what it cut in half, whether the answer is attributable to a source, and a measure of usefulness rather than of similarity.",
    },
  ],
};

export function topicsFor(track: string): CoachTopic[] {
  return TOPICS[track as TrackSlug] ?? [];
}

export function findTopic(track: string, id: string | null | undefined): CoachTopic | undefined {
  return id ? topicsFor(track).find((topic) => topic.id === id) : undefined;
}

export function topicIds(track: string): string[] {
  return topicsFor(track).map((topic) => topic.id);
}

/**
 * What to practise next: the first topic with no evidence recorded against
 * it, so a learner working through them is not asked the same opener twice.
 * Once all of them have been covered it starts again at the beginning —
 * a second pass is a fair way to show the answer has improved.
 */
export function nextTopic(track: string, assessed: readonly string[]): CoachTopic | undefined {
  const topics = topicsFor(track);
  return topics.find((topic) => !assessed.includes(topic.id)) ?? topics[0];
}
