/**
 * The junior-developer curriculum, day by day.
 *
 * Converted from the track's .docx programme document (~/Downloads/30_Day_Junior_Developer_AI_Assisted_Engineer_Cohort.docx),
 * so the app and the document say the same thing. Re-convert rather than hand-edit
 * when the document changes. Resources were checked when the document was written:
 * re-check annually, links rot.
 */
import type { CurriculumDay, CurriculumModule } from "@/types/curriculum";

export const juniorDevCurriculum: CurriculumDay[] = [
  {
    "day": 1,
    "week": 1,
    "kind": "build",
    "title": "The developer operating system, and what changed",
    "mission": "Set up the evidence trail you will be judged on, take on your running codebase, and be honest about which parts of your current work a tool already does better.",
    "points": 12,
    "estimateMinutes": 105,
    "tags": [
      "Hands-on"
    ],
    "objectives": [
      "Stand up the portfolio repo that holds every artifact",
      "Read an unfamiliar codebase and map it without asking anyone",
      "Name the parts of your work that generation already covers"
    ],
    "concepts": [
      "What an engineer owns: the change, the review, the test, and the consequence",
      "Writing code versus deciding what to write — which one is being automated away",
      "Why a portfolio of tutorials convinces nobody, and what does",
      "Repo-as-portfolio: structure, README as index, commit history as proof"
    ],
    "steps": [
      "Fork Meridian Ledger and create the public repo dev-evidence-portfolio alongside it, with the folder structure given.",
      "Read the codebase without running it and draw the map: entry points, data flow, where a request becomes a database call.",
      "List everything that looks wrong, without fixing anything yet.",
      "Write the repo README and update your LinkedIn headline to name the work you are moving into."
    ],
    "deliverable": "README.md committed, repo public, codebase map committed, LinkedIn headline updated",
    "reviewerChecks": "Map is derived from reading rather than from running; at least 12 concrete problems listed; commit dated Day 1.",
    "resources": [
      {
        "kind": "read",
        "label": "Pro Git: the complete book, free online",
        "url": "https://git-scm.com/book/en/v2"
      },
      {
        "kind": "read",
        "label": "The Twelve-Factor App",
        "url": "https://12factor.net/"
      },
      {
        "kind": "read",
        "label": "GitHub: basic writing and formatting syntax",
        "url": "https://docs.github.com/en/get-started/writing-on-github/getting-started-with-writing-and-formatting-on-github/basic-writing-and-formatting-syntax"
      }
    ],
    "quiz": [
      "Paste the URL of your portfolio repo.",
      "Where does an HTTP request become a database query in this codebase?",
      "Which part of your current work could a tool do today, without you?"
    ]
  },
  {
    "day": 2,
    "week": 1,
    "kind": "build",
    "title": "Git as an argument, not a save button",
    "mission": "Your commit history is the only record of how you think. Today you learn to write one a reviewer can follow.",
    "points": 12,
    "estimateMinutes": 105,
    "tags": [
      "Git",
      "Hands-on"
    ],
    "objectives": [
      "Write commits that isolate one change with a reason",
      "Rewrite a messy branch into a reviewable sequence",
      "Recover from the three git situations that panic juniors"
    ],
    "concepts": [
      "The commit as a unit of reasoning: what changed and why, not what you typed",
      "Branching, rebasing and merging — what each one does to the history a reviewer reads",
      "Interactive rebase for cleaning a branch before review",
      "reflog, revert and reset — recovering without destroying"
    ],
    "steps": [
      "Make five unrelated fixes to Meridian Ledger on one messy branch, deliberately badly.",
      "Rewrite that branch into five isolated commits, each with a message stating the reason.",
      "Practise recovery: lose a commit and get it back with reflog; revert a pushed commit correctly.",
      "Write the short note on when you would revert rather than reset, and why."
    ],
    "deliverable": "02-git/ with the rewritten branch and the recovery note",
    "reviewerChecks": "Each commit is independently revertible; messages state reasons not actions; the revert-versus-reset note is correct about shared history.",
    "resources": [
      {
        "kind": "read",
        "label": "Pro Git: the complete book, free online",
        "url": "https://git-scm.com/book/en/v2"
      },
      {
        "kind": "read",
        "label": "Conventional Commits: specification",
        "url": "https://www.conventionalcommits.org/en/v1.0.0/"
      },
      {
        "kind": "read",
        "label": "GitHub: understanding the GitHub flow",
        "url": "https://docs.github.com/en/get-started/using-github/github-flow"
      }
    ],
    "quiz": [
      "Which commit was hardest to isolate, and why?",
      "What would you do if you had already pushed the bad commit?",
      "Paste the message you are proudest of, and say what makes it good."
    ]
  },
  {
    "day": 3,
    "week": 1,
    "kind": "build",
    "title": "Reading code you did not write",
    "mission": "You will spend more of your career reading code than writing it. Today you get deliberate about it.",
    "points": 12,
    "estimateMinutes": 105,
    "tags": [
      "Reading",
      "Hands-on"
    ],
    "objectives": [
      "Trace an unfamiliar feature end to end without a debugger",
      "Form and test a hypothesis about how something works",
      "Document a subsystem so the next person is faster"
    ],
    "concepts": [
      "Top-down and bottom-up reading, and when each one gets you lost",
      "Following data rather than control flow",
      "Reading tests as documentation of intent",
      "The questions to ask a codebase: what owns this state, and who can change it"
    ],
    "steps": [
      "Trace the Meridian Ledger expense-approval flow from HTTP request to database write and back.",
      "Write the sequence as numbered steps naming the function and file at each hop.",
      "Find one thing the code does that the README claims it does not, or vice versa.",
      "Write the subsystem note that would save the next reader an hour."
    ],
    "deliverable": "03-reading/approval-flow.md with the trace and the discrepancy",
    "reviewerChecks": "The trace names real files and functions; the discrepancy is real and specific; the note is written for a stranger.",
    "resources": [
      {
        "kind": "read",
        "label": "Google: Software Engineering at Google, the testing chapter",
        "url": "https://abseil.io/resources/swe-book/html/ch11.html"
      },
      {
        "kind": "read",
        "label": "Google: engineering practices, the code reviewer's guide",
        "url": "https://google.github.io/eng-practices/review/reviewer/"
      },
      {
        "kind": "read",
        "label": "MDN Web Docs: the web platform reference",
        "url": "https://developer.mozilla.org/en-US/"
      }
    ],
    "quiz": [
      "What does the README get wrong?",
      "Which hop took longest to find, and what made it hard?",
      "What state does this flow mutate that is not obvious?"
    ]
  },
  {
    "day": 4,
    "week": 1,
    "kind": "build",
    "title": "Prompting as an interface specification",
    "mission": "A prompt that produces code you then rewrite has cost you time. Today you learn to specify precisely enough that you can accept the output.",
    "points": 12,
    "estimateMinutes": 105,
    "tags": [
      "Ai",
      "AI",
      "Hands-on"
    ],
    "objectives": [
      "Write a prompt with an explicit contract and constraints",
      "Give a model the failing test instead of the description",
      "Refuse and re-specify rather than patching bad output"
    ],
    "concepts": [
      "The anatomy of a working prompt: context, task, constraints, output shape, examples",
      "Test-first prompting: the assertion is the least ambiguous specification you own",
      "Constraining to an existing codebase's conventions rather than a generic style",
      "Knowing when to stop prompting and write it yourself"
    ],
    "steps": [
      "Write the failing tests for a new Meridian Ledger feature before writing any prompt.",
      "Write a prompt that includes the tests, the conventions and the interfaces it must use.",
      "Generate the implementation, and log every change you had to make to the output.",
      "Re-specify the prompt so the next run needs fewer changes, and prove it by rerunning."
    ],
    "deliverable": "04-ai/spec-prompt.md with both runs and the change log",
    "reviewerChecks": "Tests were written before the prompt; the second run measurably needed fewer corrections; the log says what was wrong rather than that it was wrong.",
    "resources": [
      {
        "kind": "use",
        "label": "Anthropic: prompt engineering overview",
        "url": "https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering/overview"
      },
      {
        "kind": "use",
        "label": "Claude Code: documentation",
        "url": "https://docs.claude.com/en/docs/claude-code/overview"
      },
      {
        "kind": "use",
        "label": "Vitest: documentation",
        "url": "https://vitest.dev/guide/"
      }
    ],
    "quiz": [
      "What did the model get wrong that your prompt had not ruled out?",
      "Which correction taught you the most about your own specification?",
      "Where would you have been faster writing it by hand?"
    ]
  },
  {
    "day": 5,
    "week": 1,
    "kind": "build",
    "title": "Context engineering — what the model can actually see",
    "mission": "Most confidently wrong generated code is a context problem. Today you learn to manage what the model is given.",
    "points": 12,
    "estimateMinutes": 105,
    "tags": [
      "Ai",
      "AI",
      "Hands-on"
    ],
    "objectives": [
      "Diagnose a wrong output as a context failure rather than a model failure",
      "Assemble the minimum context that produces correct code",
      "Recognise and stop a model inventing an API"
    ],
    "concepts": [
      "What is actually in the context: files, history, instructions, and what was silently dropped",
      "Why more context is not better context",
      "Hallucinated APIs as a symptom of missing interface definitions",
      "Project-level instructions as durable context you write once"
    ],
    "steps": [
      "Take five wrong generations against Meridian Ledger and label each as a context or model failure, with evidence.",
      "For the context failures, find the minimum set of files that fixes each.",
      "Write the project instruction file that encodes the conventions a model keeps getting wrong.",
      "Re-run all five and record which are now correct."
    ],
    "deliverable": "05-ai/context-audit.md and the committed project instruction file",
    "reviewerChecks": "Labels are evidenced by a re-run, not asserted; the minimum context is genuinely minimal; at least one failure remains a model failure.",
    "resources": [
      {
        "kind": "read",
        "label": "Anthropic: context windows explained",
        "url": "https://docs.anthropic.com/en/docs/build-with-claude/context-windows"
      },
      {
        "kind": "use",
        "label": "Claude Code: documentation",
        "url": "https://docs.claude.com/en/docs/claude-code/overview"
      },
      {
        "kind": "use",
        "label": "Anthropic: prompt engineering overview",
        "url": "https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering/overview"
      }
    ],
    "quiz": [
      "Which wrong output looked like a model failure and was not?",
      "What is the smallest context that produced the right answer?",
      "Which one stayed wrong, and what does that tell you?"
    ]
  },
  {
    "day": 6,
    "week": 1,
    "kind": "build",
    "title": "Choosing a model, and what it costs you",
    "mission": "Autocomplete, refactor and architecture are three different jobs. Today you stop paying frontier prices for all of them.",
    "points": 12,
    "estimateMinutes": 105,
    "tags": [
      "Ai",
      "AI",
      "Hands-on"
    ],
    "objectives": [
      "Match model tiers to engineering tasks with a stated reason",
      "Measure the latency and cost difference on real tasks",
      "Show where the cheaper model is the better engineering choice"
    ],
    "concepts": [
      "What differs between tiers: reasoning depth, context, latency, price",
      "Latency as a developer-experience property in an editor loop",
      "Agentic runs, where cost compounds quietly",
      "Provider documentation as the source of truth over any blog post"
    ],
    "steps": [
      "Define five engineering tasks, from rename-across-files to designing a schema migration, and assign a tier with a reason.",
      "Run the same refactor through a small and a large model and diff both output and elapsed time.",
      "Estimate your monthly cost at a realistic daily usage, with assumptions written down.",
      "Write the routing rule you would give a new team member."
    ],
    "deliverable": "06-ai/model-selection.md with the diff and the cost model",
    "reviewerChecks": "Assumptions are stated and the arithmetic checks out; the diff shows a task where the small model is sufficient and one where it is not.",
    "resources": [
      {
        "kind": "read",
        "label": "Anthropic: model overview and choosing a model",
        "url": "https://docs.anthropic.com/en/docs/about-claude/models/overview"
      },
      {
        "kind": "read",
        "label": "OpenAI: models reference",
        "url": "https://platform.openai.com/docs/models"
      },
      {
        "kind": "use",
        "label": "Claude Code: documentation",
        "url": "https://docs.claude.com/en/docs/claude-code/overview"
      }
    ],
    "quiz": [
      "Where did the cheap model produce code you would have shipped?",
      "Where did it produce something subtly wrong?",
      "Which task would you never delegate to a model at all?"
    ]
  },
  {
    "day": 7,
    "week": 1,
    "kind": "assessment",
    "title": "Codebase comprehension and the reviewed change",
    "mission": "Given an unfamiliar area of Meridian Ledger, trace a reported behaviour to its cause, ship a minimal fix on a clean branch with a real commit history, and defend both the diagnosis and the size of the change.",
    "points": 40,
    "estimateMinutes": 90,
    "tags": [
      "Assessment"
    ],
    "objectives": [
      "The trace, naming files and functions at each hop",
      "A branch of isolated commits with reasoned messages",
      "The pull request description, written for a reviewer with no context",
      "Five-minute unscripted video defence"
    ],
    "concepts": [],
    "steps": [],
    "deliverable": "Submitted artifacts plus your defence recording",
    "reviewerChecks": "Fixes that work and changes that sprawl. A minimal, well-argued change scores above a larger one that also happens to work.",
    "resources": [
      {
        "kind": "read",
        "label": "Pro Git: the complete book, free online",
        "url": "https://git-scm.com/book/en/v2"
      },
      {
        "kind": "read",
        "label": "Google: engineering practices, the code reviewer's guide",
        "url": "https://google.github.io/eng-practices/review/reviewer/"
      }
    ],
    "quiz": [
      "Your fix is three lines. What convinced you the cause was not upstream of it?",
      "You changed a shared function. What else calls it, and how do you know?",
      "Why did you not add a test?"
    ]
  },
  {
    "day": 8,
    "week": 2,
    "kind": "build",
    "title": "The data model comes first",
    "mission": "Most bad features are bad schemas wearing a user interface. Today you design the data before anything else.",
    "points": 12,
    "estimateMinutes": 105,
    "tags": [
      "Feature",
      "AI",
      "Hands-on"
    ],
    "objectives": [
      "Design a schema with the constraints the business actually has",
      "Write a reversible migration",
      "Say what your schema makes impossible, on purpose"
    ],
    "concepts": [
      "Normalisation far enough to stop lying, and no further",
      "Constraints as executable business rules: not null, unique, foreign key, check",
      "Migrations as code: forward, backward, and never editing an applied one",
      "Nullable columns as a design decision you have to justify"
    ],
    "steps": [
      "Design the schema for Meridian Ledger's new recurring-expense feature.",
      "Write the migration, with a working down path, and apply it locally.",
      "Add every constraint that encodes a real rule, and write the rule beside each.",
      "List three states your schema makes impossible, and one it permits that it should not."
    ],
    "deliverable": "08-feature/migration.sql and the schema rationale",
    "reviewerChecks": "Migration is reversible and has been reversed locally; constraints are justified by rules; the permitted-but-wrong state is honestly named.",
    "resources": [
      {
        "kind": "read",
        "label": "PostgreSQL: official documentation",
        "url": "https://www.postgresql.org/docs/current/"
      },
      {
        "kind": "use",
        "label": "Mode: SQL tutorial",
        "url": "https://mode.com/sql-tutorial/"
      },
      {
        "kind": "read",
        "label": "The Twelve-Factor App",
        "url": "https://12factor.net/"
      }
    ],
    "quiz": [
      "Which constraint encodes the rule you were most tempted to enforce in application code?",
      "What does your schema still allow that it should not?",
      "How would you roll this back with data already in it?"
    ]
  },
  {
    "day": 9,
    "week": 2,
    "kind": "build",
    "title": "The API contract",
    "mission": "An endpoint is a promise to someone you will never meet. Today you write one you can keep.",
    "points": 12,
    "estimateMinutes": 105,
    "tags": [
      "Feature",
      "Hands-on"
    ],
    "objectives": [
      "Design endpoints around resources and outcomes, not database tables",
      "Choose status codes that tell the client what to do",
      "Write an error envelope a front end can act on"
    ],
    "concepts": [
      "Resource modelling versus table exposure",
      "The status codes that matter, and the ones people misuse",
      "Validation errors: which field, what was wrong, what is acceptable",
      "Idempotency, and why a retried request must not charge twice"
    ],
    "steps": [
      "Design the recurring-expense endpoints and write the contract before implementing anything.",
      "Define the error envelope and the validation error shape, with examples.",
      "Implement the endpoints against the contract.",
      "Write the client-facing documentation, and check it against what you actually built."
    ],
    "deliverable": "09-feature/api-contract.md and the implemented endpoints",
    "reviewerChecks": "Status codes are correct and defensible; validation errors identify the field; the documentation matches the implementation exactly.",
    "resources": [
      {
        "kind": "read",
        "label": "MDN: HTTP response status codes",
        "url": "https://developer.mozilla.org/en-US/docs/Web/HTTP/Status"
      },
      {
        "kind": "read",
        "label": "Node.js: official documentation",
        "url": "https://nodejs.org/docs/latest/api/"
      },
      {
        "kind": "read",
        "label": "TypeScript: handbook",
        "url": "https://www.typescriptlang.org/docs/handbook/intro.html"
      }
    ],
    "quiz": [
      "Which status code did you nearly get wrong?",
      "What does your API do if the same create request arrives twice?",
      "Where does your documentation still not match the code?"
    ]
  },
  {
    "day": 10,
    "week": 2,
    "kind": "build",
    "title": "Tests that would have caught the bug",
    "mission": "Coverage is not the goal. Today you write the tests that would actually have stopped the defects already in this codebase.",
    "points": 12,
    "estimateMinutes": 105,
    "tags": [
      "Tests",
      "Hands-on"
    ],
    "objectives": [
      "Write tests at the level where the risk lives",
      "Write a test that fails for the right reason",
      "Argue against a test that is not worth its maintenance"
    ],
    "concepts": [
      "The pyramid in practice: unit, integration, end-to-end and what each is for",
      "Arrange-act-assert, and one assertion of intent per test",
      "Testing behaviour rather than implementation, so refactors do not break the suite",
      "The test you should delete: slow, flaky, or asserting a coincidence"
    ],
    "steps": [
      "Pick three real defects from your Day 1 list and write the test that would have caught each.",
      "Write the integration tests for your recurring-expense endpoints, including the failure paths.",
      "Deliberately break the implementation and confirm each test fails for the right reason.",
      "Find one existing test in the repo that should be deleted, and write the argument."
    ],
    "deliverable": "10-tests/ with the suite and the deletion argument",
    "reviewerChecks": "Each test fails for the intended reason when the code is broken; failure paths are covered; the deletion argument is about maintenance cost, not dislike.",
    "resources": [
      {
        "kind": "read",
        "label": "Martin Fowler: the practical test pyramid",
        "url": "https://martinfowler.com/articles/practical-test-pyramid.html"
      },
      {
        "kind": "use",
        "label": "Vitest: documentation",
        "url": "https://vitest.dev/guide/"
      },
      {
        "kind": "read",
        "label": "Google: Software Engineering at Google, the testing chapter",
        "url": "https://abseil.io/resources/swe-book/html/ch11.html"
      }
    ],
    "quiz": [
      "Which test passed even when you broke the code, and why?",
      "Which defect was hardest to write a test for?",
      "Which test would you delete, and what does the team lose?"
    ]
  },
  {
    "day": 11,
    "week": 2,
    "kind": "build",
    "title": "The interface, and the user who is not you",
    "mission": "A feature nobody can operate is not shipped. Today you build the front end and measure it honestly.",
    "points": 12,
    "estimateMinutes": 105,
    "tags": [
      "Feature",
      "Hands-on"
    ],
    "objectives": [
      "Build a component that handles loading, empty, error and success",
      "Make it usable by keyboard and screen reader",
      "Capture a performance baseline you will be measured against"
    ],
    "concepts": [
      "The four states every data-driven component has, and the three people forget",
      "Semantic HTML as the cheapest accessibility you will ever buy",
      "Focus management, labels, and what a screen reader actually announces",
      "Core Web Vitals, and measuring before you optimise"
    ],
    "steps": [
      "Build the recurring-expense UI with all four states handled explicitly.",
      "Operate it entirely by keyboard, and fix every trap and unlabelled control you find.",
      "Run an accessibility audit and fix the issues you can fix today.",
      "Capture and commit the performance baseline for the page."
    ],
    "deliverable": "11-feature/ui with the audit results and the committed baseline",
    "reviewerChecks": "All four states are real rather than stubs; keyboard operation is complete; the baseline includes the numbers and how they were captured.",
    "resources": [
      {
        "kind": "read",
        "label": "React: official documentation",
        "url": "https://react.dev/learn"
      },
      {
        "kind": "read",
        "label": "W3C: WCAG 2.2 quick reference",
        "url": "https://www.w3.org/WAI/WCAG22/quickref/"
      },
      {
        "kind": "read",
        "label": "web.dev: Core Web Vitals",
        "url": "https://web.dev/articles/vitals"
      }
    ],
    "quiz": [
      "Which state had you not implemented before the audit?",
      "What did the keyboard pass reveal?",
      "What is your baseline, and on what hardware?"
    ]
  },
  {
    "day": 12,
    "week": 2,
    "kind": "build",
    "title": "Reviewing code you did not write",
    "mission": "The scarce skill. Today you review generated code with the same rigour you would give a colleague's, and refuse some of it.",
    "points": 12,
    "estimateMinutes": 105,
    "tags": [
      "Review",
      "AI",
      "Hands-on"
    ],
    "objectives": [
      "Find the subtle defect in plausible-looking code",
      "Write review comments that change the code rather than the mood",
      "Refuse a change and justify it"
    ],
    "concepts": [
      "What generated code gets wrong: edge cases, error paths, and invented APIs",
      "Reviewing for correctness, then design, then style — in that order",
      "Comment styles: blocking, suggestion, question, and using each honestly",
      "Approving is an act of ownership, not a courtesy"
    ],
    "steps": [
      "Review the three seeded pull requests, one human-written and two generated, without being told which is which.",
      "Leave real comments, marked blocking or non-blocking, on each.",
      "Find the deliberate subtle defect in each and describe its consequence.",
      "Write the refusal on the one that should not be merged, with the reason."
    ],
    "deliverable": "12-review/pr-reviews.md with all comments and the refusal",
    "reviewerChecks": "Each subtle defect is found and its consequence named; blocking comments are genuinely blocking; the refusal argues from risk rather than taste.",
    "resources": [
      {
        "kind": "read",
        "label": "Google: engineering practices, the code reviewer's guide",
        "url": "https://google.github.io/eng-practices/review/reviewer/"
      },
      {
        "kind": "read",
        "label": "GitHub: about pull requests",
        "url": "https://docs.github.com/en/pull-requests"
      },
      {
        "kind": "read",
        "label": "Google: Software Engineering at Google, the testing chapter",
        "url": "https://abseil.io/resources/swe-book/html/ch11.html"
      }
    ],
    "quiz": [
      "Which pull request did you think was generated, and were you right?",
      "What was the subtlest defect, and what would it have done in production?",
      "Which comment of yours was really about style pretending to be correctness?"
    ]
  },
  {
    "day": 13,
    "week": 2,
    "kind": "build",
    "title": "Continuous integration that says no",
    "mission": "A pipeline that always passes tells you nothing. Today you build one that blocks the merge when it should.",
    "points": 12,
    "estimateMinutes": 105,
    "tags": [
      "Ci",
      "Hands-on"
    ],
    "objectives": [
      "Build a pipeline that runs tests, types and lint on every pull request",
      "Make a failure message tell you what to do",
      "Decide what should block a merge and what should only warn"
    ],
    "concepts": [
      "What CI is for: the same verdict for everyone, every time",
      "Fast feedback and pipeline ordering — failing cheaply first",
      "Blocking versus advisory checks, and the cost of blocking on the wrong thing",
      "Flaky pipelines, and why teams stop trusting them"
    ],
    "steps": [
      "Write the GitHub Actions workflow for Meridian Ledger: install, types, lint, unit, integration.",
      "Order the jobs so the cheapest failure is reported first.",
      "Open a pull request that should fail and confirm it is blocked, then fix it.",
      "Write down which checks block and which warn, and justify each."
    ],
    "deliverable": "13-ci/workflow.yml and the blocking policy",
    "reviewerChecks": "Pipeline genuinely blocks a bad pull request; ordering fails cheaply first; the blocking policy is justified rather than maximal.",
    "resources": [
      {
        "kind": "use",
        "label": "GitHub Actions: documentation",
        "url": "https://docs.github.com/en/actions"
      },
      {
        "kind": "read",
        "label": "GitHub: understanding the GitHub flow",
        "url": "https://docs.github.com/en/get-started/using-github/github-flow"
      },
      {
        "kind": "read",
        "label": "Martin Fowler: the practical test pyramid",
        "url": "https://martinfowler.com/articles/practical-test-pyramid.html"
      }
    ],
    "quiz": [
      "Which check did you choose not to block on, and why?",
      "How long does your pipeline take, and what dominates it?",
      "What would you do if it became flaky?"
    ]
  },
  {
    "day": 14,
    "week": 2,
    "kind": "assessment",
    "title": "Feature delivery end to end",
    "mission": "Take an unseen small feature from requirement to open pull request: schema, endpoint, tests, UI state handling and a green pipeline. Then respond to a reviewer's blocking comments in real time.",
    "points": 40,
    "estimateMinutes": 90,
    "tags": [
      "Assessment"
    ],
    "objectives": [
      "The pull request, with commits a reviewer can follow",
      "Migration, tests and passing pipeline",
      "Written responses to three blocking review comments",
      "Five-minute unscripted video defence"
    ],
    "concepts": [],
    "steps": [],
    "deliverable": "Submitted artifacts plus your defence recording",
    "reviewerChecks": "Learners who accept every review comment without argument. Agreeing with a reviewer who is wrong is marked down as hard as refusing one who is right.",
    "resources": [
      {
        "kind": "read",
        "label": "GitHub: about pull requests",
        "url": "https://docs.github.com/en/pull-requests"
      },
      {
        "kind": "read",
        "label": "Martin Fowler: the practical test pyramid",
        "url": "https://martinfowler.com/articles/practical-test-pyramid.html"
      }
    ],
    "quiz": [
      "Your migration has no down path. What happens when this is rolled back at 11pm?",
      "You tested the happy path only. Which failure would a customer hit first?",
      "The reviewer asks for a change you disagree with. Argue your side."
    ]
  },
  {
    "day": 15,
    "week": 3,
    "kind": "build",
    "title": "Debugging as a discipline",
    "mission": "Guessing is not debugging. Today you learn the method that finds the cause instead of a workaround.",
    "points": 12,
    "estimateMinutes": 105,
    "tags": [
      "Debug",
      "Hands-on"
    ],
    "objectives": [
      "Reduce a failure to the smallest reproduction",
      "Bisect a regression to the commit that caused it",
      "Distinguish the cause from the symptom you patched"
    ],
    "concepts": [
      "Hypothesis, prediction, experiment — debugging as science",
      "Minimal reproductions, and why halving the input halves the search",
      "git bisect for regressions with a known-good commit",
      "The workaround that hides a cause, and the cost of shipping it"
    ],
    "steps": [
      "Take the seeded intermittent failure in Meridian Ledger and reduce it to a minimal reproduction.",
      "Bisect the history to the commit that introduced it.",
      "Write the hypothesis log: what you predicted, what you tested, what it ruled out, including dead ends.",
      "Fix the cause, and write what the workaround would have been and why you rejected it."
    ],
    "deliverable": "15-debug/investigation.md with the hypothesis log and the bisect result",
    "reviewerChecks": "The reproduction is genuinely minimal; dead ends are recorded rather than hidden; the cause is distinguished from the symptom.",
    "resources": [
      {
        "kind": "read",
        "label": "Pro Git: the complete book, free online",
        "url": "https://git-scm.com/book/en/v2"
      },
      {
        "kind": "use",
        "label": "Sentry: product documentation",
        "url": "https://docs.sentry.io/"
      },
      {
        "kind": "read",
        "label": "OpenTelemetry: observability primer",
        "url": "https://opentelemetry.io/docs/concepts/observability-primer/"
      }
    ],
    "quiz": [
      "What was the commit, and what did it change?",
      "Which hypothesis was wrong, and what ruled it out?",
      "What would the workaround have cost you in six months?"
    ]
  },
  {
    "day": 16,
    "week": 3,
    "kind": "build",
    "title": "The N+1 and the query you did not know you wrote",
    "mission": "Performance problems in small apps are almost always database access patterns. Today you find and fix yours.",
    "points": 12,
    "estimateMinutes": 105,
    "tags": [
      "Performance",
      "Hands-on"
    ],
    "objectives": [
      "Find the query pattern behind a slow page",
      "Read an execution plan well enough to act on it",
      "Prove an optimisation worked, with numbers"
    ],
    "concepts": [
      "The N+1 problem, and how an ORM produces it silently",
      "Indexes: what they cost on write, what they save on read",
      "Reading EXPLAIN: sequential scans, index scans, and row estimates",
      "Measuring before and after, on the same data"
    ],
    "steps": [
      "Instrument Meridian Ledger to log every query for one page load and count them.",
      "Find the N+1 and fix it, then re-count.",
      "Run EXPLAIN on the slowest remaining query and add the index it needs.",
      "Record before-and-after timings on identical seeded data."
    ],
    "deliverable": "16-performance/query-report.md with plans and timings",
    "reviewerChecks": "Query counts are measured not estimated; the index is justified by the plan; timings are on identical data.",
    "resources": [
      {
        "kind": "read",
        "label": "PostgreSQL: official documentation",
        "url": "https://www.postgresql.org/docs/current/"
      },
      {
        "kind": "use",
        "label": "Mode: SQL tutorial",
        "url": "https://mode.com/sql-tutorial/"
      },
      {
        "kind": "read",
        "label": "OpenTelemetry: observability primer",
        "url": "https://opentelemetry.io/docs/concepts/observability-primer/"
      }
    ],
    "quiz": [
      "How many queries did one page load actually make?",
      "What did EXPLAIN tell you that you had not guessed?",
      "What does your new index cost on write?"
    ]
  },
  {
    "day": 17,
    "week": 3,
    "kind": "build",
    "title": "The vulnerabilities in your own code",
    "mission": "You already shipped at least one. Today you find it, exploit it in a safe environment, and close it.",
    "points": 12,
    "estimateMinutes": 105,
    "tags": [
      "Security",
      "Hands-on"
    ],
    "objectives": [
      "Find and exploit an injection flaw in your own codebase",
      "Fix it at the right layer",
      "Say what else in this codebase has the same shape"
    ],
    "concepts": [
      "Injection in plain terms: data arriving where code is expected",
      "Parameterised queries, and why escaping is not the fix",
      "Broken access control — the most common real-world failure",
      "Secrets in a repository, and what to do once one has been committed"
    ],
    "steps": [
      "Find the SQL injection in Meridian Ledger and exploit it against your local instance.",
      "Fix it with parameterisation, and prove the exploit no longer works.",
      "Find the broken access control — an endpoint that does not check ownership — and close it.",
      "Audit the repository for committed secrets and write the remediation steps for one you find."
    ],
    "deliverable": "17-security/findings.md with exploit, fix and proof for each",
    "reviewerChecks": "The exploit is demonstrated before and after; the access-control fix checks ownership server-side; secret remediation includes rotation, not only removal.",
    "resources": [
      {
        "kind": "read",
        "label": "OWASP: Top 10 web application security risks",
        "url": "https://owasp.org/www-project-top-ten/"
      },
      {
        "kind": "read",
        "label": "PostgreSQL: official documentation",
        "url": "https://www.postgresql.org/docs/current/"
      },
      {
        "kind": "read",
        "label": "The Twelve-Factor App",
        "url": "https://12factor.net/"
      }
    ],
    "quiz": [
      "What did the injection let you read that you should not have?",
      "Why is escaping the wrong fix?",
      "Which other endpoint has the same access-control shape?"
    ]
  },
  {
    "day": 18,
    "week": 3,
    "kind": "build",
    "title": "Refactoring without breaking anything",
    "mission": "Changing code you do not fully understand is the daily reality. Today you learn to do it safely.",
    "points": 12,
    "estimateMinutes": 105,
    "tags": [
      "Refactor",
      "Hands-on"
    ],
    "objectives": [
      "Characterise existing behaviour before changing it",
      "Refactor in steps that each keep the suite green",
      "Know when not to refactor"
    ],
    "concepts": [
      "Characterisation tests: pinning behaviour you do not yet understand",
      "Small steps, green between each, and why the big-bang rewrite fails",
      "Naming as the cheapest refactor with the highest return",
      "The refactor you should not do, because nothing depends on it changing"
    ],
    "steps": [
      "Pick the worst function in Meridian Ledger and write characterisation tests for its current behaviour, bugs included.",
      "Refactor it in at least four steps, running the suite between each.",
      "Record any behaviour change you found and decided to keep or fix.",
      "Identify one piece of ugly code you chose not to refactor, and justify leaving it."
    ],
    "deliverable": "18-refactor/ with the tests, the step-by-step commits and the justification",
    "reviewerChecks": "Characterisation tests pin current behaviour including its bugs; each commit is green; the leave-it-alone justification is about value, not effort.",
    "resources": [
      {
        "kind": "read",
        "label": "Google: Software Engineering at Google, the testing chapter",
        "url": "https://abseil.io/resources/swe-book/html/ch11.html"
      },
      {
        "kind": "read",
        "label": "Martin Fowler: the practical test pyramid",
        "url": "https://martinfowler.com/articles/practical-test-pyramid.html"
      },
      {
        "kind": "read",
        "label": "Google: engineering practices, the code reviewer's guide",
        "url": "https://google.github.io/eng-practices/review/reviewer/"
      }
    ],
    "quiz": [
      "Which behaviour turned out to be a bug you had been preserving?",
      "Which step broke the suite, and what did that teach you?",
      "What did you decide not to touch, and why?"
    ]
  },
  {
    "day": 19,
    "week": 3,
    "kind": "build",
    "title": "Building a feature on top of a model, safely",
    "mission": "Putting model output near a database, a shell or a browser creates a new attack surface. Today you build one and then attack it.",
    "points": 12,
    "estimateMinutes": 105,
    "tags": [
      "Ai Feature",
      "AI",
      "Hands-on"
    ],
    "objectives": [
      "Ship a small AI-backed feature with a bounded contract",
      "Attack it with prompt injection and document what worked",
      "Place the control at the authorisation layer, not the prompt"
    ],
    "concepts": [
      "Treating model output as untrusted input, always",
      "Prompt injection, direct and indirect, including via stored data",
      "Tool and function calling, and scoping what a model may invoke",
      "Failure modes: what your feature does when the model is wrong, slow or down"
    ],
    "steps": [
      "Build the Meridian Ledger expense-categorisation feature backed by a model, with a strict output contract.",
      "Handle the three failure modes explicitly: wrong output, timeout, provider outage.",
      "Attack it with ten injection attempts, including one through a stored expense description.",
      "Add the control that actually stops the dangerous attempt, and prove it."
    ],
    "deliverable": "19-ai-feature/ with the implementation and the injection log",
    "reviewerChecks": "Output is validated before use; all three failure modes are handled; the effective control is authorisation or validation rather than prompt text.",
    "resources": [
      {
        "kind": "read",
        "label": "OWASP: Top 10 for LLM applications",
        "url": "https://owasp.org/www-project-top-10-for-large-language-model-applications/"
      },
      {
        "kind": "use",
        "label": "Anthropic: prompt engineering overview",
        "url": "https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering/overview"
      },
      {
        "kind": "read",
        "label": "OWASP: Top 10 web application security risks",
        "url": "https://owasp.org/www-project-top-ten/"
      }
    ],
    "quiz": [
      "Which injection worked, and what did it reach?",
      "What does your feature do when the provider is down?",
      "Why was hardening the prompt not enough?"
    ]
  },
  {
    "day": 20,
    "week": 3,
    "kind": "build",
    "title": "The review round, on your own code",
    "mission": "Today someone else reviews what you built in Week 2, and you review theirs. This is the closest thing to the job.",
    "points": 12,
    "estimateMinutes": 105,
    "tags": [
      "Review",
      "Hands-on"
    ],
    "objectives": [
      "Receive blocking feedback without defending reflexively",
      "Distinguish a comment you should accept from one you should argue",
      "Leave a review that a peer acts on the same day"
    ],
    "concepts": [
      "Review as collaboration rather than gatekeeping",
      "Separating correctness from preference in both directions",
      "Disagreeing well: evidence, alternatives, and escalating when stuck",
      "Turnaround time as a team-level property"
    ],
    "steps": [
      "Review a peer's Week 2 feature in full, marking each comment blocking or non-blocking.",
      "Receive their review of yours and respond to every comment in writing.",
      "Identify one comment you should accept and one you should argue, and do both.",
      "Merge only after both sides are resolved, and record what changed as a result."
    ],
    "deliverable": "20-review/round.md with both reviews and the resolution log",
    "reviewerChecks": "Every comment received has a written response; at least one is argued rather than accepted; the resolution is reached rather than abandoned.",
    "resources": [
      {
        "kind": "read",
        "label": "Google: engineering practices, the code reviewer's guide",
        "url": "https://google.github.io/eng-practices/review/reviewer/"
      },
      {
        "kind": "read",
        "label": "GitHub: about pull requests",
        "url": "https://docs.github.com/en/pull-requests"
      },
      {
        "kind": "read",
        "label": "Conventional Commits: specification",
        "url": "https://www.conventionalcommits.org/en/v1.0.0/"
      }
    ],
    "quiz": [
      "Which comment did you argue, and how did it resolve?",
      "Which one stung, and was it right?",
      "What did reviewing someone else's code teach you about your own?"
    ]
  },
  {
    "day": 21,
    "week": 3,
    "kind": "assessment",
    "title": "Review, security and machine-output judgement",
    "mission": "Review an unseen pull request containing generated code with three planted defects of different severities, produce the review, then defend your blocking decisions against challenge questions including one arguing a defect you flagged is acceptable.",
    "points": 40,
    "estimateMinutes": 90,
    "tags": [
      "Assessment"
    ],
    "objectives": [
      "The full review, with every comment marked blocking or non-blocking",
      "A written verdict: merge, merge with changes, or refuse",
      "The security finding, with its consequence stated",
      "Five-minute unscripted video defence"
    ],
    "concepts": [],
    "steps": [],
    "deliverable": "Submitted artifacts plus your defence recording",
    "reviewerChecks": "Reviewers who find all three defects and cannot rank them. Knowing which one to block on is the skill being marked.",
    "resources": [
      {
        "kind": "read",
        "label": "Google: engineering practices, the code reviewer's guide",
        "url": "https://google.github.io/eng-practices/review/reviewer/"
      },
      {
        "kind": "read",
        "label": "OWASP: Top 10 web application security risks",
        "url": "https://owasp.org/www-project-top-ten/"
      }
    ],
    "quiz": [
      "You blocked on the error path. The team ships weekly and this is behind a flag. Still blocking?",
      "You missed one of the three. Walk me through why it did not stand out.",
      "The author says a model wrote it and they do not know why it works. What is your response?"
    ]
  },
  {
    "day": 22,
    "week": 4,
    "kind": "build",
    "title": "Shipping it, and knowing when it broke",
    "mission": "Code that is not observable is code you cannot own. Today you deploy and instrument it.",
    "points": 12,
    "estimateMinutes": 105,
    "tags": [
      "Production",
      "Hands-on"
    ],
    "objectives": [
      "Deploy the application with configuration outside the code",
      "Add logging and error reporting that answer real questions",
      "Define what healthy means, numerically"
    ],
    "concepts": [
      "Configuration and secrets as environment, never as commits",
      "Structured logs with a correlation ID, and what to never log",
      "Error reporting versus logging — two different jobs",
      "Service level objectives in plain terms: the number that decides if you are paged"
    ],
    "steps": [
      "Deploy Meridian Ledger, with all configuration supplied by environment.",
      "Add structured request logging with a correlation ID, and error reporting on the server and client.",
      "Trigger a real error and follow it from the browser to the log line.",
      "Define two objectives with numbers and say what you would do when each is breached."
    ],
    "deliverable": "22-production/ with the deploy, the instrumentation and the objectives",
    "reviewerChecks": "No secret is in the repository; the correlation ID genuinely links client to server; objectives have numbers and a response.",
    "resources": [
      {
        "kind": "read",
        "label": "The Twelve-Factor App",
        "url": "https://12factor.net/"
      },
      {
        "kind": "use",
        "label": "Sentry: product documentation",
        "url": "https://docs.sentry.io/"
      },
      {
        "kind": "read",
        "label": "Google: Site Reliability Engineering, the free book",
        "url": "https://sre.google/books/"
      }
    ],
    "quiz": [
      "Paste the deployed URL.",
      "What are you deliberately not logging, and why?",
      "What number tells you this is unhealthy, and what do you do about it?"
    ]
  },
  {
    "day": 23,
    "week": 4,
    "kind": "build",
    "title": "The incident, and the postmortem",
    "mission": "Today your application breaks in production, and you are the one who owns it.",
    "points": 12,
    "estimateMinutes": 105,
    "tags": [
      "Production",
      "Hands-on"
    ],
    "objectives": [
      "Restore service before understanding the cause",
      "Communicate during an incident without speculating",
      "Write a postmortem that produces a change"
    ],
    "concepts": [
      "Mitigate first, diagnose second — and why the order is not negotiable",
      "Rollback as the fastest mitigation you have",
      "Blameless postmortems: systems produced the outcome, people did their best with what they saw",
      "Action items with owners, or it was a diary entry"
    ],
    "steps": [
      "Run the injected Meridian Ledger production incident from detection to resolution, timestamping every action.",
      "Mitigate first, then diagnose, and record the moment you chose each.",
      "Write the three user-facing updates you would have sent.",
      "Write the blameless postmortem with a timeline, contributing factors and owned action items."
    ],
    "deliverable": "23-production/postmortem.md with the full timeline",
    "reviewerChecks": "Mitigation precedes diagnosis in the timeline; the postmortem names systemic factors rather than a person; action items have owners.",
    "resources": [
      {
        "kind": "read",
        "label": "Google: Site Reliability Engineering, the free book",
        "url": "https://sre.google/books/"
      },
      {
        "kind": "read",
        "label": "OpenTelemetry: observability primer",
        "url": "https://opentelemetry.io/docs/concepts/observability-primer/"
      },
      {
        "kind": "use",
        "label": "Sentry: product documentation",
        "url": "https://docs.sentry.io/"
      }
    ],
    "quiz": [
      "How long from detection to mitigation, and what was the delay?",
      "Which contributing factor was a system problem you had built yourself?",
      "Which action item are you actually going to do?"
    ]
  },
  {
    "day": 24,
    "week": 4,
    "kind": "build",
    "title": "Making it fast, and proving it",
    "mission": "Optimisation without measurement is decoration. Today you improve a real number against your Day 11 baseline.",
    "points": 12,
    "estimateMinutes": 105,
    "tags": [
      "Performance",
      "Hands-on"
    ],
    "objectives": [
      "Profile before changing anything",
      "Improve a measured metric and show the delta",
      "Say what you traded away to get it"
    ],
    "concepts": [
      "Measure, change one thing, measure again",
      "Where web performance actually goes: payload, round trips, and the main thread",
      "Caching as a correctness problem before it is a speed problem",
      "The optimisation that is not worth its complexity"
    ],
    "steps": [
      "Profile the Meridian Ledger expense list page and identify the top three costs.",
      "Fix the largest one and measure against your Day 11 baseline on identical data.",
      "Add caching where it is correct to do so, and write down how it is invalidated.",
      "Name one optimisation you could do and decided not to, with the reason."
    ],
    "deliverable": "24-performance/optimisation.md with before, after and the trade-off",
    "reviewerChecks": "The measurement is like-for-like; cache invalidation is described, not assumed; the rejected optimisation is rejected on cost, not difficulty.",
    "resources": [
      {
        "kind": "read",
        "label": "web.dev: Core Web Vitals",
        "url": "https://web.dev/articles/vitals"
      },
      {
        "kind": "read",
        "label": "PostgreSQL: official documentation",
        "url": "https://www.postgresql.org/docs/current/"
      },
      {
        "kind": "read",
        "label": "OpenTelemetry: observability primer",
        "url": "https://opentelemetry.io/docs/concepts/observability-primer/"
      }
    ],
    "quiz": [
      "What was the largest cost, and by how much did you reduce it?",
      "How is your cache invalidated, and what happens if it is not?",
      "What did you make worse in exchange?"
    ]
  },
  {
    "day": 25,
    "week": 4,
    "kind": "build",
    "title": "Publishing the portfolio",
    "mission": "Everything you built is in a repo nobody will read. Today you make it something a hiring manager opens and finishes.",
    "points": 12,
    "estimateMinutes": 105,
    "tags": [
      "Hands-on"
    ],
    "objectives": [
      "Publish the portfolio as a readable site",
      "Write case studies that lead with the outcome",
      "Make the evidence navigable in under two minutes"
    ],
    "concepts": [
      "Repo versus site: a hiring manager will not browse folders",
      "The case study shape: problem, what you did, what changed, what you would do differently",
      "Linking to the commit, the pull request and the test, not describing them",
      "Writing for the reader who gives you ninety seconds"
    ],
    "steps": [
      "Publish the portfolio with GitHub Pages and link the deployed application.",
      "Write four case studies: the feature, the security fix, the incident, the optimisation.",
      "Link each claim to the actual commit or pull request that proves it.",
      "Have someone outside the cohort try to find your security finding in under a minute."
    ],
    "deliverable": "Published site URL committed to the repo README",
    "reviewerChecks": "Site is live; every claim links to real evidence; the outside reader found the finding unaided.",
    "resources": [
      {
        "kind": "use",
        "label": "GitHub Pages: quickstart",
        "url": "https://docs.github.com/en/pages/quickstart"
      },
      {
        "kind": "read",
        "label": "GitHub: basic writing and formatting syntax",
        "url": "https://docs.github.com/en/get-started/writing-on-github/getting-started-with-writing-and-formatting-on-github/basic-writing-and-formatting-syntax"
      },
      {
        "kind": "read",
        "label": "Choose a License: open source licence guide",
        "url": "https://choosealicense.com/"
      }
    ],
    "quiz": [
      "Paste your published URL.",
      "What did your outside reader fail to find?",
      "Which case study has the weakest evidence behind it?"
    ]
  },
  {
    "day": 26,
    "week": 4,
    "kind": "build",
    "title": "The technical interview, and what it is actually testing",
    "mission": "Junior interviews test whether you can think out loud under mild pressure. Today you practise the thinking, not the trivia.",
    "points": 12,
    "estimateMinutes": 105,
    "tags": [
      "Interview",
      "Hands-on"
    ],
    "objectives": [
      "Solve a problem out loud, stating assumptions as you go",
      "Recover from a wrong approach without losing the room",
      "Use your portfolio as evidence without reciting it"
    ],
    "concepts": [
      "What the interviewer is measuring: approach, communication, recovery",
      "Clarifying the question before solving it",
      "Saying 'I do not know, here is how I would find out' as a competent answer",
      "Walking a portfolio artifact in two minutes, outcome first"
    ],
    "steps": [
      "Work three problems out loud, recorded, narrating assumptions and trade-offs.",
      "Deliberately take a wrong approach on one and practise recovering mid-problem.",
      "Prepare and record a two-minute walkthrough of your strongest artifact.",
      "Write answers to the ten most common junior questions, each grounded in something you built."
    ],
    "deliverable": "26-interview/answer-bank.md and the recordings",
    "reviewerChecks": "Assumptions are stated aloud; the recovery is graceful rather than silent; the walkthrough leads with outcome and stays under two minutes.",
    "resources": [
      {
        "kind": "read",
        "label": "MindTools: the STAR interview technique",
        "url": "https://www.mindtools.com/a2bgu1v/star-interview-method"
      },
      {
        "kind": "use",
        "label": "LinkedIn: profile best practices for job seekers",
        "url": "https://www.linkedin.com/help/linkedin/answer/a554351"
      },
      {
        "kind": "read",
        "label": "Google: Software Engineering at Google, the testing chapter",
        "url": "https://abseil.io/resources/swe-book/html/ch11.html"
      }
    ],
    "quiz": [
      "Where did you go quiet while thinking, and what will you say instead?",
      "How did you recover from the wrong approach?",
      "Which artifact do you lead with, and why that one?"
    ]
  },
  {
    "day": 27,
    "week": 4,
    "kind": "build",
    "title": "The trade-off conversation",
    "mission": "Senior engineers are hired for judgement. Today you practise defending a technical decision that has real costs.",
    "points": 12,
    "estimateMinutes": 105,
    "tags": [
      "Decisions",
      "Hands-on"
    ],
    "objectives": [
      "Argue a technical decision from constraints rather than preference",
      "Change your position when given better information",
      "Say what you would need to decide properly"
    ],
    "concepts": [
      "Every technical decision is a trade-off under constraints you should name",
      "Reversible and irreversible decisions deserve different amounts of argument",
      "Disagreeing with someone more senior, usefully",
      "The honest answer: what evidence would change your mind"
    ],
    "steps": [
      "Write the decision record for the three biggest choices you made in this codebase.",
      "For each, state the constraints, the options rejected and the evidence that would change your mind.",
      "Argue one of them with a peer taking the opposite side, recorded.",
      "Revise any record where the argument changed your view, and mark what changed."
    ],
    "deliverable": "27-decisions/records.md with the three decision records",
    "reviewerChecks": "Each record names rejected options; at least one records a change of view; reversibility is considered in how hard each is argued.",
    "resources": [
      {
        "kind": "read",
        "label": "The Twelve-Factor App",
        "url": "https://12factor.net/"
      },
      {
        "kind": "read",
        "label": "Google: engineering practices, the code reviewer's guide",
        "url": "https://google.github.io/eng-practices/review/reviewer/"
      },
      {
        "kind": "read",
        "label": "Semantic Versioning 2.0.0",
        "url": "https://semver.org/"
      }
    ],
    "quiz": [
      "Which decision was irreversible, and did you treat it that way?",
      "Where did your peer change your mind?",
      "What evidence would you need to decide the open one properly?"
    ]
  },
  {
    "day": 28,
    "week": 4,
    "kind": "assessment",
    "title": "Portfolio defence and the engineering case",
    "mission": "Walk a panel through Meridian Ledger: what you built, what you found, what broke and what you changed as a result. Then defend your decisions against a marker playing a sceptical senior engineer.",
    "points": 40,
    "estimateMinutes": 90,
    "tags": [
      "Assessment"
    ],
    "objectives": [
      "The published portfolio and the deployed application",
      "A ten-slide engineering case covering the feature, the incident and the optimisation",
      "Your three decision records",
      "Live panel defence, fifteen minutes"
    ],
    "concepts": [],
    "steps": [],
    "deliverable": "Submitted artifacts plus your defence recording",
    "reviewerChecks": "Candidates who present what they built and cannot say what they would do differently. The panel is listening for judgement, not a tour.",
    "resources": [
      {
        "kind": "read",
        "label": "Google: Site Reliability Engineering, the free book",
        "url": "https://sre.google/books/"
      },
      {
        "kind": "read",
        "label": "Google: engineering practices, the code reviewer's guide",
        "url": "https://google.github.io/eng-practices/review/reviewer/"
      }
    ],
    "quiz": [
      "You say the N+1 fix halved load time. On what data, and does that hold at ten times the rows?",
      "You blocked a colleague's pull request in Week 3. Walk me through that conversation.",
      "Which part of this codebase would you not want to be on call for?"
    ]
  },
  {
    "day": 29,
    "week": 4,
    "kind": "interview",
    "title": "Mock interview: technical and live",
    "mission": "45 minutes. One debugging task in an unfamiliar codebase and one small implementation, both narrated.",
    "points": 50,
    "estimateMinutes": 45,
    "tags": [
      "Mock interview"
    ],
    "objectives": [
      "Approach, communication while stuck, recovery, and whether the code works"
    ],
    "concepts": [],
    "steps": [],
    "deliverable": "Interview recording and written feedback",
    "reviewerChecks": "Scored on the same rubric as the weekly checkpoints.",
    "resources": [
      {
        "kind": "prep",
        "label": "The Muse: STAR method, for the behavioural half",
        "url": "https://www.themuse.com/advice/star-interview-method"
      }
    ],
    "quiz": []
  },
  {
    "day": 30,
    "week": 4,
    "kind": "interview",
    "title": "Mock interview: portfolio and behavioural",
    "mission": "45 minutes. Artifact walkthrough, a review scenario, and one trade-off challenge.",
    "points": 50,
    "estimateMinutes": 45,
    "tags": [
      "Mock interview"
    ],
    "objectives": [
      "Judgement, ownership, review quality, and whether the evidence survives questioning"
    ],
    "concepts": [],
    "steps": [],
    "deliverable": "Interview recording and written feedback",
    "reviewerChecks": "Scored on the same rubric as the weekly checkpoints.",
    "resources": [
      {
        "kind": "prep",
        "label": "The Muse: STAR method, for the behavioural half",
        "url": "https://www.themuse.com/advice/star-interview-method"
      }
    ],
    "quiz": []
  }
];

export const juniorDevModules: CurriculumModule[] = [
  {
    "week": 1,
    "name": "Engineering foundations, and the new stack",
    "days": "Days 1–7",
    "summary": "You can read an unfamiliar codebase, ship a reviewed change, and direct a model against a contract"
  },
  {
    "week": 2,
    "name": "Building features end to end",
    "days": "Days 8–14",
    "summary": "You can take a feature from schema to UI with tests and a pull request that passes review"
  },
  {
    "week": 3,
    "name": "Quality, security and reviewing machine output",
    "days": "Days 15–21",
    "summary": "You can find the bug in generated code, close a real vulnerability, and defend a review"
  },
  {
    "week": 4,
    "name": "Production ownership and interview readiness",
    "days": "Days 22–28",
    "summary": "You can debug live, measure performance, and argue an engineering trade-off with numbers"
  }
];
