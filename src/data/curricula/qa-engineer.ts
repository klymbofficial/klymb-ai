/**
 * The qa-engineer curriculum, day by day.
 *
 * Converted from the track's .docx programme document (~/Downloads/30_Day_QA_Engineer_AI_Test_Architect_Cohort.docx),
 * so the app and the document say the same thing. Re-convert rather than hand-edit
 * when the document changes. Resources were checked when the document was written:
 * re-check annually, links rot.
 */
import type { CurriculumDay, CurriculumModule } from "@/types/curriculum";

export const qaCurriculum: CurriculumDay[] = [
  {
    "day": 1,
    "week": 1,
    "kind": "build",
    "title": "The QA operating system, and what changed",
    "mission": "Set up the evidence trail you will be judged on, pick your running product, and be honest about which parts of your current testing a tool already does.",
    "points": 12,
    "estimateMinutes": 105,
    "tags": [
      "Hands-on"
    ],
    "objectives": [
      "Stand up the portfolio repo that holds every artifact",
      "Read a real product brief and enumerate what can break",
      "Name the parts of your current job that tooling already covers"
    ],
    "concepts": [
      "What a test engineer owns: risk, evidence, and the release decision",
      "Manual execution versus test design — which one is being automated away",
      "Why QA work is invisible to hiring managers, and what makes it visible",
      "Repo-as-portfolio: structure, README as index, commit history as proof"
    ],
    "steps": [
      "Create the public repo qa-evidence-portfolio with the folder structure given, each with a placeholder README.",
      "Read the Meridian Support brief: a fintech support assistant with a chat UI, a REST API and an AI answer engine. List everything that could break.",
      "Write the repo README: the product under test, your role, and how the folders map to the 30 days.",
      "Update your LinkedIn headline to name the work you are moving into."
    ],
    "deliverable": "README.md committed, repo public, LinkedIn headline updated",
    "reviewerChecks": "Repo is public and renders; at least 15 distinct failure modes listed; commit dated Day 1.",
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
        "kind": "use",
        "label": "Ministry of Testing: community, clubs and events",
        "url": "https://www.ministryoftesting.com/"
      }
    ],
    "quiz": [
      "Paste the URL of your portfolio repo.",
      "Which three failure modes on your list would be worst for a customer, and why?",
      "Which part of your current testing day could a tool do today, without you?"
    ]
  },
  {
    "day": 2,
    "week": 1,
    "kind": "build",
    "title": "Test design that finds real defects",
    "mission": "Stop writing test cases that restate the requirement. Learn the techniques that make defects fall out of the design itself.",
    "points": 12,
    "estimateMinutes": 105,
    "tags": [
      "Test Design",
      "Hands-on"
    ],
    "objectives": [
      "Derive cases with equivalence, boundary and decision-table techniques",
      "Model a stateful flow and find unspecified transitions",
      "Prioritise by risk, and be able to defend the order"
    ],
    "concepts": [
      "Equivalence partitioning and boundary value analysis",
      "Decision tables for rules with interacting conditions",
      "State transition testing for flows with memory",
      "Risk-based prioritisation: what you would test if you had two hours"
    ],
    "steps": [
      "Take the Meridian refund rules and build a decision table covering every combination.",
      "Write boundary cases for the amount, age-of-transaction and account-status fields.",
      "Model the chat session as a state machine and find the transitions nobody specified.",
      "Rank your cases by risk and mark the eight you would run with two hours before release."
    ],
    "deliverable": "02-test-design/refund-decision-table.md and boundary cases",
    "reviewerChecks": "Decision table is complete rather than illustrative; at least two unspecified transitions found; ranking has a stated basis.",
    "resources": [
      {
        "kind": "read",
        "label": "Martin Fowler: the practical test pyramid",
        "url": "https://martinfowler.com/articles/practical-test-pyramid.html"
      },
      {
        "kind": "read",
        "label": "Google: Software Engineering at Google, the testing chapter",
        "url": "https://abseil.io/resources/swe-book/html/ch11.html"
      },
      {
        "kind": "use",
        "label": "Ministry of Testing: community, clubs and events",
        "url": "https://www.ministryoftesting.com/"
      }
    ],
    "quiz": [
      "Which boundary did you find that the requirements do not mention?",
      "Which unspecified state transition worries you most?",
      "If you had two hours before release, which eight cases would you run, and why those?"
    ]
  },
  {
    "day": 3,
    "week": 1,
    "kind": "build",
    "title": "Defect reports that get fixed",
    "mission": "A bug nobody can reproduce is a bug nobody fixes. Write the report an engineer can act on without asking you a single question.",
    "points": 12,
    "estimateMinutes": 105,
    "tags": [
      "Defects",
      "Hands-on"
    ],
    "objectives": [
      "Reproduce a defect reliably and isolate the variable",
      "Write reports that need no follow-up questions",
      "Separate severity from priority and justify both"
    ],
    "concepts": [
      "Anatomy of a report: environment, steps, expected, actual, evidence",
      "Severity versus priority, and who decides each",
      "Reproducibility: isolating the variable that matters",
      "Reading logs and network traces well enough to attach the right line"
    ],
    "steps": [
      "Reproduce the three seeded defects in the Meridian build.",
      "Write each up with exact steps, evidence and the log line that proves it.",
      "Assign severity and priority separately, with a sentence of reasoning for each.",
      "Rewrite the worst real bug report you can find online, or one of your own."
    ],
    "deliverable": "03-defects/ with three reports",
    "reviewerChecks": "Every report reproduces from its own steps alone; severity and priority are argued separately; each has evidence attached.",
    "resources": [
      {
        "kind": "read",
        "label": "Google Testing Blog",
        "url": "https://testing.googleblog.com/"
      },
      {
        "kind": "read",
        "label": "Google: Software Engineering at Google, the testing chapter",
        "url": "https://abseil.io/resources/swe-book/html/ch11.html"
      },
      {
        "kind": "read",
        "label": "Martin Fowler: test doubles",
        "url": "https://martinfowler.com/bliki/TestDouble.html"
      }
    ],
    "quiz": [
      "Which log line proves your first defect, and what does it say?",
      "Give a defect that is high severity but low priority, from your own list.",
      "What did you change in the bug report you rewrote?"
    ]
  },
  {
    "day": 4,
    "week": 1,
    "kind": "build",
    "title": "Prompting, properly — the tester's version",
    "mission": "The most important AI skill for a tester is not writing prompts, it is specifying behaviour precisely enough to check it. Today you learn the structure that makes output reviewable.",
    "points": 12,
    "estimateMinutes": 105,
    "tags": [
      "Prompting",
      "AI",
      "Hands-on"
    ],
    "objectives": [
      "Write prompts with an explicit output contract",
      "Diagnose a bad output as a prompt defect rather than a model failure",
      "Use examples deliberately, and know how many earned their place"
    ],
    "concepts": [
      "The anatomy of a working prompt: task, context, constraints, examples, output format",
      "Why examples beat adjectives, and how many you need",
      "Asking for structured output you can assert on, instead of prose",
      "Prompting for tests: what the model needs to know about your system to be useful"
    ],
    "steps": [
      "Write a prompt that turns a user story into boundary cases, with a fixed output schema.",
      "Run it on three stories. Record where the output was wrong, not just where it was thin.",
      "Add examples until the failure mode disappears; note how many it took.",
      "Write the prompt's contract: what it guarantees, what it does not."
    ],
    "deliverable": "04-prompting/test-case-prompt.md plus three runs",
    "reviewerChecks": "Prompt specifies an output schema; failure modes are recorded with before-and-after; the contract names what it will not do.",
    "resources": [
      {
        "kind": "read",
        "label": "Anthropic: prompt engineering overview",
        "url": "https://docs.claude.com/en/docs/build-with-claude/prompt-engineering/overview"
      },
      {
        "kind": "read",
        "label": "Anthropic: defining success criteria and developing tests",
        "url": "https://docs.claude.com/en/docs/test-and-evaluate/develop-tests"
      },
      {
        "kind": "read",
        "label": "Anthropic: building effective agents",
        "url": "https://www.anthropic.com/engineering/building-effective-agents"
      }
    ],
    "quiz": [
      "What output schema did you specify, and why that shape?",
      "What did the model get wrong that examples fixed?",
      "What does your prompt explicitly not guarantee?"
    ]
  },
  {
    "day": 5,
    "week": 1,
    "kind": "build",
    "title": "Context engineering: what goes in the window",
    "mission": "Most bad AI output is a context problem, not a model problem. Learn what to include, what to leave out, and what it costs.",
    "points": 12,
    "estimateMinutes": 105,
    "tags": [
      "Context",
      "AI",
      "Hands-on"
    ],
    "objectives": [
      "Assemble context deliberately and measure what it costs",
      "Find the smallest context that still produces a correct answer",
      "Write a reusable context recipe for a class of task"
    ],
    "concepts": [
      "Context is a budget: tokens, latency and money, not an unlimited box",
      "What actually helps — the failing test, the schema, the error, the diff — and what is noise",
      "Retrieval versus stuffing: when to fetch and when to paste",
      "Caching repeated context, and why a timestamp in the prompt destroys it"
    ],
    "steps": [
      "Take a failing test and build three context bundles: minimal, medium, everything.",
      "Run the same diagnosis prompt against each and compare answers, tokens and cost.",
      "Find the smallest bundle that still gets the right answer.",
      "Write the context recipe for your team: what to include for a test-failure diagnosis."
    ],
    "deliverable": "05-context/context-recipe.md with the comparison table",
    "reviewerChecks": "Token counts and costs are recorded; the minimal sufficient bundle is identified; the recipe is specific to artifacts, not generic advice.",
    "resources": [
      {
        "kind": "read",
        "label": "Anthropic: effective context engineering for AI agents",
        "url": "https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents"
      },
      {
        "kind": "read",
        "label": "Anthropic: prompt caching (what makes repeated context cheap)",
        "url": "https://docs.claude.com/en/docs/build-with-claude/prompt-caching"
      },
      {
        "kind": "read",
        "label": "Anthropic: prompt engineering overview",
        "url": "https://docs.claude.com/en/docs/build-with-claude/prompt-engineering/overview"
      }
    ],
    "quiz": [
      "What was the smallest bundle that still worked, and what was in it?",
      "What did the 'everything' bundle cost compared with the minimal one?",
      "What in your context was pure noise?"
    ]
  },
  {
    "day": 6,
    "week": 1,
    "kind": "build",
    "title": "Which model for which job",
    "mission": "Model choice is an engineering decision with a price attached. Today you learn the current lineups and build the routing table your team will actually use.",
    "points": 12,
    "estimateMinutes": 105,
    "tags": [
      "Models",
      "AI",
      "Hands-on"
    ],
    "objectives": [
      "State the current model lineups and what each tier is for",
      "Route real QA jobs to a tier on cost, latency and capability",
      "Estimate what a workload costs before running it"
    ],
    "concepts": [
      "The tiers: frontier reasoning, workhorse, and cheap high-volume — and what each is for",
      "Anthropic's current line: Claude Opus 5, Sonnet 5, Haiku 4.5, and Fable 5.1 at the top",
      "OpenAI's current line: GPT-6 Astra, and the GPT-5.6 tiers Sol, Terra and Luna",
      "Google's ladder: Gemini Pro, Flash and Flash-Lite",
      "Cost, latency and context window as the three axes you actually trade between",
      "Why the cheapest model that passes your eval is the right one — and why that requires an eval"
    ],
    "steps": [
      "Build the comparison table for current models: price in and out, context window, and what you would use each for. Take every number from the provider's own pricing page.",
      "Route five QA jobs to a tier and justify each: bulk test-data generation, flaky-test triage, reviewing a generated suite, summarising 500 support tickets, judging eval outputs.",
      "Estimate the monthly cost of one job at two different tiers, with your real volumes.",
      "Write the routing rule your team would follow, including when to escalate a task to a stronger model."
    ],
    "deliverable": "06-models/model-routing.md",
    "reviewerChecks": "Every price is cited to a provider pricing page with the date checked; at least one job is routed to the cheap tier with reasoning; the escalation rule is concrete.",
    "resources": [
      {
        "kind": "use",
        "label": "OpenAI: current model pricing (check before quoting any number)",
        "url": "https://platform.openai.com/docs/pricing"
      },
      {
        "kind": "use",
        "label": "Google: Gemini API pricing",
        "url": "https://ai.google.dev/gemini-api/docs/pricing"
      },
      {
        "kind": "read",
        "label": "Anthropic: building effective agents",
        "url": "https://www.anthropic.com/engineering/building-effective-agents"
      }
    ],
    "quiz": [
      "Which job did you route to the cheapest tier, and what would go wrong if it were too weak?",
      "What did your cost estimate come to, and what volume assumption drives it?",
      "When does your rule say to escalate to a frontier model?"
    ]
  },
  {
    "day": 7,
    "week": 1,
    "kind": "assessment",
    "title": "Suite audit and test-design defence",
    "mission": "Audit a real regression suite of 120 tests: mark what should be automated, what an agent should generate, what stays manual and what should be deleted. Then defend the calls on camera against three challenge questions released when you press record.",
    "points": 40,
    "estimateMinutes": 90,
    "tags": [
      "Assessment"
    ],
    "objectives": [
      "The audit, with a decision and reason for all 120 tests",
      "Your decision table and risk ranking from Day 2",
      "Five-minute unscripted video defence",
      "Written peer review of two other learners' audits"
    ],
    "concepts": [],
    "steps": [],
    "deliverable": "Submitted artifacts plus your defence recording",
    "reviewerChecks": "Audits that classify everything as 'automate'. The reasoning, not the classification, is what is being marked.",
    "resources": [
      {
        "kind": "read",
        "label": "Martin Fowler: the practical test pyramid",
        "url": "https://martinfowler.com/articles/practical-test-pyramid.html"
      },
      {
        "kind": "read",
        "label": "Google: Software Engineering at Google, the testing chapter",
        "url": "https://abseil.io/resources/swe-book/html/ch11.html"
      }
    ],
    "quiz": [
      "You marked 30 tests for deletion. What happens if one of them would have caught a defect?",
      "Which tests did you keep manual, and what makes them uneconomic to automate?",
      "Your riskiest area has the fewest tests. Why?"
    ]
  },
  {
    "day": 8,
    "week": 2,
    "kind": "build",
    "title": "Playwright from zero: your first real tests",
    "mission": "Write automated tests that fail for the right reasons. Locators and waiting decide whether your suite is trusted or ignored.",
    "points": 12,
    "estimateMinutes": 105,
    "tags": [
      "Hands-on"
    ],
    "objectives": [
      "Stand up a Playwright project and run it locally",
      "Write locators that survive markup changes",
      "Diagnose a failure from a trace rather than by guessing"
    ],
    "concepts": [
      "Test structure, fixtures and the project config",
      "Locators: role, label and test-id, and why CSS chains rot",
      "Auto-waiting and web-first assertions — why explicit sleeps are a smell",
      "Running, debugging and reading a trace"
    ],
    "steps": [
      "Set up Playwright in your repo with TypeScript.",
      "Automate the Meridian login and refund-request flows.",
      "Rewrite every locator you first reached for into a role or test-id locator.",
      "Break a test deliberately and read the trace to diagnose it."
    ],
    "deliverable": "tests/ with two passing specs and a trace",
    "reviewerChecks": "No hard-coded waits; locators are role or test-id based; trace shows the deliberate failure being diagnosed.",
    "resources": [
      {
        "kind": "read",
        "label": "Playwright: getting started",
        "url": "https://playwright.dev/docs/intro"
      },
      {
        "kind": "read",
        "label": "Playwright: locators, the part that decides flakiness",
        "url": "https://playwright.dev/docs/locators"
      },
      {
        "kind": "read",
        "label": "Playwright: assertions and auto-waiting",
        "url": "https://playwright.dev/docs/test-assertions"
      },
      {
        "kind": "watch",
        "label": "Playwright 2026 full course: TypeScript, framework from scratch (playlist)",
        "url": "https://www.youtube.com/playlist?list=PL83cimSRP5ZmwhC6u255huRwSi9tlP-nc"
      }
    ],
    "quiz": [
      "Which locator did you rewrite, and what would have broken the original?",
      "What does auto-waiting remove the need for?",
      "What did the trace show you that the error message did not?"
    ]
  },
  {
    "day": 9,
    "week": 2,
    "kind": "build",
    "title": "Generating tests with AI, and reviewing what comes back",
    "mission": "Generating a hundred tests is easy. Today is about the review skill that decides whether those tests are an asset or a liability.",
    "points": 12,
    "estimateMinutes": 105,
    "tags": [
      "Generated Suite",
      "AI",
      "Hands-on"
    ],
    "objectives": [
      "Generate a suite from a ticket with sufficient context",
      "Spot tests that pass whether or not the feature works",
      "Review generated code at a defensible speed"
    ],
    "concepts": [
      "Turning a ticket into a suite: what the model needs, and in what order",
      "The failure modes of generated tests: fake assertions, happy-path bias, brittle selectors, duplicated coverage",
      "Assertions that would actually fail if the feature broke",
      "Review as the bottleneck — and how to make review fast without making it shallow"
    ],
    "steps": [
      "Generate a suite for the refund flow from the ticket, using your Day 4 prompt.",
      "Review every test and classify each as keep, fix or delete, with a reason.",
      "Fix the three worst and prove they now fail when you break the feature.",
      "Write your generated-test review checklist."
    ],
    "deliverable": "09-generated-suite/ with the review log",
    "reviewerChecks": "Every test is classified with a reason; the fixed tests are shown failing against a deliberately broken build; the checklist is specific.",
    "resources": [
      {
        "kind": "read",
        "label": "Anthropic: prompt engineering overview",
        "url": "https://docs.claude.com/en/docs/build-with-claude/prompt-engineering/overview"
      },
      {
        "kind": "read",
        "label": "Playwright: assertions and auto-waiting",
        "url": "https://playwright.dev/docs/test-assertions"
      },
      {
        "kind": "read",
        "label": "Martin Fowler: test doubles",
        "url": "https://martinfowler.com/bliki/TestDouble.html"
      }
    ],
    "quiz": [
      "Which generated test passed even when you broke the feature?",
      "What fraction did you delete, and why?",
      "What is the first thing on your review checklist?"
    ]
  },
  {
    "day": 10,
    "week": 2,
    "kind": "build",
    "title": "Flaky tests: the root cause, not the retry",
    "mission": "A retry hides a defect. Today you find out what your flaky tests are actually telling you.",
    "points": 12,
    "estimateMinutes": 105,
    "tags": [
      "Flake",
      "Hands-on"
    ],
    "objectives": [
      "Measure flake rate rather than describing tests as flaky",
      "Diagnose flakiness to a specific cause",
      "Fix without retries, and quarantine with an expiry"
    ],
    "concepts": [
      "The four common causes: timing, shared state, test data, environment",
      "Why retries make a suite untrustworthy rather than reliable",
      "Quarantine as a temporary contract, not a graveyard",
      "Measuring flake rate, and the threshold where people stop believing the suite"
    ],
    "steps": [
      "Run the seeded flaky suite twenty times and record which tests fail and how often.",
      "Diagnose each to a root cause with evidence, not a guess.",
      "Fix them without adding a retry or a sleep.",
      "Write the quarantine policy: what gets quarantined, who owns it, when it expires."
    ],
    "deliverable": "10-flake/flake-report.md",
    "reviewerChecks": "Flake rate measured over repeated runs; each cause is evidenced; no fix relies on retries or sleeps; quarantine entries expire.",
    "resources": [
      {
        "kind": "read",
        "label": "Playwright: retries, and why they hide bugs",
        "url": "https://playwright.dev/docs/test-retries"
      },
      {
        "kind": "read",
        "label": "Google Testing Blog",
        "url": "https://testing.googleblog.com/"
      },
      {
        "kind": "read",
        "label": "Google SRE Book: testing for reliability",
        "url": "https://sre.google/sre-book/testing-reliability/"
      }
    ],
    "quiz": [
      "What was your measured flake rate before and after?",
      "Which root cause surprised you?",
      "When does a quarantined test get deleted?"
    ]
  },
  {
    "day": 11,
    "week": 2,
    "kind": "build",
    "title": "API and contract testing",
    "mission": "Most real defects live below the UI, where tests are faster and more stable. Today you go down a layer.",
    "points": 12,
    "estimateMinutes": 105,
    "tags": [
      "Hands-on"
    ],
    "objectives": [
      "Test an API directly, including its failure behaviour",
      "Validate against a contract rather than an example",
      "Decide what belongs at which layer"
    ],
    "concepts": [
      "Testing an API directly: status, schema, error bodies, idempotency",
      "Contracts: what an OpenAPI spec promises, and how to hold it to that",
      "Auth, rate limits and pagination — the parts that break in production",
      "Where API tests belong in the pyramid, and what they replace"
    ],
    "steps": [
      "Write API tests for the Meridian refund endpoints, including failure cases.",
      "Validate responses against the OpenAPI schema rather than by eye.",
      "Add a contract test that fails when the schema changes incompatibly.",
      "Delete the UI tests your API tests have made redundant, and say why."
    ],
    "deliverable": "tests/api/ plus the deletion note",
    "reviewerChecks": "Schema validated programmatically; a deliberate schema change makes the contract test fail; deleted UI tests are justified.",
    "resources": [
      {
        "kind": "read",
        "label": "Playwright: API testing",
        "url": "https://playwright.dev/docs/api-testing"
      },
      {
        "kind": "read",
        "label": "OpenAPI: what a contract actually specifies",
        "url": "https://swagger.io/docs/specification/about/"
      },
      {
        "kind": "read",
        "label": "Postman: API testing fundamentals",
        "url": "https://www.postman.com/api-platform/api-testing/"
      },
      {
        "kind": "watch",
        "label": "Playwright API testing tutorial (playlist)",
        "url": "https://www.youtube.com/playlist?list=PLUeDIlio4THEvZ6mygfkOwSFncrVtd8Hk"
      }
    ],
    "quiz": [
      "Which UI test did you delete, and what now covers it?",
      "What incompatible change does your contract test catch?",
      "What error case did the API get wrong?"
    ]
  },
  {
    "day": 12,
    "week": 2,
    "kind": "build",
    "title": "CI, gates and the release decision",
    "mission": "A suite that nobody runs is documentation. Today it runs on every change, and blocks the right things.",
    "points": 12,
    "estimateMinutes": 105,
    "tags": [
      "Hands-on"
    ],
    "objectives": [
      "Run the suite automatically on every change",
      "Define gates that match the cost of each failure",
      "Make a release recommendation you can defend"
    ],
    "concepts": [
      "Running tests on pull requests: parallelism, sharding, artifacts",
      "Quality gates: what blocks a merge, what blocks a release, what only warns",
      "Reporting that a developer will actually read",
      "The release decision: what evidence you present, and what you refuse to sign off"
    ],
    "steps": [
      "Run your suite in GitHub Actions on every pull request.",
      "Publish traces and reports as artifacts on failure.",
      "Define your gates: blocking, warning, and informational, with reasons.",
      "Write the one-page release recommendation for Meridian, based on your own evidence."
    ],
    "deliverable": ".github/workflows/ plus 12-release/recommendation.md",
    "reviewerChecks": "CI run is green and visible; artifacts appear on failure; the recommendation states a decision, not a summary.",
    "resources": [
      {
        "kind": "read",
        "label": "Playwright: running tests in CI",
        "url": "https://playwright.dev/docs/ci-intro"
      },
      {
        "kind": "use",
        "label": "GitHub Actions: workflow quickstart",
        "url": "https://docs.github.com/en/actions/writing-workflows/quickstart"
      },
      {
        "kind": "read",
        "label": "DORA: the four key delivery metrics",
        "url": "https://dora.dev/guides/dora-metrics-four-keys/"
      }
    ],
    "quiz": [
      "What blocks a merge in your setup, and what only warns?",
      "Where does a developer find the trace when CI fails?",
      "What would make you refuse to sign off a release?"
    ]
  },
  {
    "day": 13,
    "week": 2,
    "kind": "build",
    "title": "Test data, synthetic generation and privacy",
    "mission": "Realistic data finds realistic bugs. Today you generate it without ever touching a real customer record.",
    "points": 12,
    "estimateMinutes": 105,
    "tags": [
      "Test Data",
      "AI",
      "Hands-on"
    ],
    "objectives": [
      "Generate targeted, realistic test data without production records",
      "Make data deterministic so failures reproduce",
      "State the privacy rule your team follows"
    ],
    "concepts": [
      "Why production data in test environments is a breach waiting to happen",
      "Generating realistic data with AI: names, addresses, transactions, edge cases",
      "Deterministic seeds, so a failure can be reproduced",
      "Data that targets your boundaries rather than filling space"
    ],
    "steps": [
      "Generate a dataset covering every boundary from your Day 2 design.",
      "Include the nasty cases: unicode names, very long strings, zero and negative amounts, timezone edges.",
      "Make generation deterministic from a seed and prove the same seed reproduces the run.",
      "Write the rule for what may never appear in test data."
    ],
    "deliverable": "13-test-data/ with generator and dataset",
    "reviewerChecks": "Same seed reproduces the dataset; boundaries from Day 2 are covered; the never-list covers real customer data.",
    "resources": [
      {
        "kind": "read",
        "label": "Playwright: parameterised tests and data-driven runs",
        "url": "https://playwright.dev/docs/test-parameterize"
      },
      {
        "kind": "read",
        "label": "OWASP: Top 10 for LLM applications",
        "url": "https://genai.owasp.org/llm-top-10/"
      },
      {
        "kind": "read",
        "label": "Anthropic: effective context engineering for AI agents",
        "url": "https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents"
      }
    ],
    "quiz": [
      "Which nasty case broke something?",
      "How do you reproduce yesterday's failing dataset exactly?",
      "What may never appear in your test data?"
    ]
  },
  {
    "day": 14,
    "week": 2,
    "kind": "assessment",
    "title": "Ticket to suite, live",
    "mission": "You are given a ticket you have not seen and 60 minutes. Produce a working suite — generated, reviewed and fixed — that runs green in CI and fails when the feature is broken.",
    "points": 40,
    "estimateMinutes": 90,
    "tags": [
      "Assessment"
    ],
    "objectives": [
      "A passing suite committed and running in CI",
      "The review log: what you kept, fixed and deleted from the generated output",
      "Proof the suite fails against a deliberately broken build",
      "Ten-minute questioning while the clock runs"
    ],
    "concepts": [],
    "steps": [],
    "deliverable": "Submitted artifacts plus your defence recording",
    "reviewerChecks": "Suites that pass but do not fail — the single most common defect in AI-generated tests.",
    "resources": [
      {
        "kind": "read",
        "label": "Playwright: running tests in CI",
        "url": "https://playwright.dev/docs/ci-intro"
      },
      {
        "kind": "read",
        "label": "Playwright: assertions and auto-waiting",
        "url": "https://playwright.dev/docs/test-assertions"
      }
    ],
    "quiz": [
      "Show me a test that would fail if this feature broke. Now break it.",
      "What did you delete from the generated suite, and why?",
      "Which layer did you test this at, and what did that save you?"
    ]
  },
  {
    "day": 15,
    "week": 3,
    "kind": "build",
    "title": "Why AI features break ordinary testing",
    "mission": "The output is different every time and still correct. Everything you know about assertions needs a second mode.",
    "points": 12,
    "estimateMinutes": 105,
    "tags": [
      "Ai Testing",
      "AI",
      "Hands-on"
    ],
    "objectives": [
      "Separate what can be asserted exactly from what cannot",
      "Express correctness as must-contain and must-never-contain",
      "Provoke and document confident wrong answers"
    ],
    "concepts": [
      "Non-determinism: same input, different valid outputs",
      "What you can still assert exactly — schema, safety, latency, cost, refusals",
      "What you cannot — exact wording — and what replaces it",
      "Where the risk actually sits: wrong answers stated confidently"
    ],
    "steps": [
      "List every assertion you can still make deterministically about the Meridian answer engine.",
      "Take ten real support questions and write what a correct answer must contain, and must never contain.",
      "Try to make the assistant confidently wrong, and record what worked.",
      "Write the one-page brief: how testing this feature differs from testing the refund flow."
    ],
    "deliverable": "15-ai-testing/what-changes.md",
    "reviewerChecks": "Deterministic assertions are separated from behavioural ones; the must-never list includes fabricated specifics; at least two confident-wrong cases are captured.",
    "resources": [
      {
        "kind": "read",
        "label": "Anthropic: defining success criteria and developing tests",
        "url": "https://docs.claude.com/en/docs/test-and-evaluate/develop-tests"
      },
      {
        "kind": "read",
        "label": "Hamel Husain: your AI product needs evals",
        "url": "https://hamel.dev/blog/posts/evals/"
      },
      {
        "kind": "read",
        "label": "Evidently: LLM evaluation guide",
        "url": "https://www.evidentlyai.com/llm-guide/llm-evaluation"
      }
    ],
    "quiz": [
      "What can you still assert exactly about an AI answer?",
      "What made the assistant confidently wrong?",
      "What must an answer never contain, for this product?"
    ]
  },
  {
    "day": 16,
    "week": 3,
    "kind": "build",
    "title": "Building an eval set",
    "mission": "The eval set is the test suite for an AI feature. Build one that would actually catch a regression.",
    "points": 12,
    "estimateMinutes": 105,
    "tags": [
      "Evals",
      "AI",
      "Hands-on"
    ],
    "objectives": [
      "Build an eval set from real traffic",
      "Express expectations as behaviour",
      "Keep a holdout so improvements are real"
    ],
    "concepts": [
      "What an eval is: dataset, task definition, grader, threshold",
      "Sourcing cases from real traffic rather than imagination",
      "Coverage: happy path, edge, adversarial, and the long tail that matters",
      "Holding out data so you cannot tune against your own test"
    ],
    "steps": [
      "Build a 40-case eval set for the Meridian assistant from the supplied ticket log.",
      "Label each with the expected behaviour, not the expected wording.",
      "Hold out 10 cases you will not look at while improving prompts.",
      "Record where the cases came from, so the set can be extended honestly."
    ],
    "deliverable": "16-evals/eval-set.jsonl plus the provenance note",
    "reviewerChecks": "Cases come from real traffic; expected behaviour is behavioural not verbatim; the holdout is genuinely untouched.",
    "resources": [
      {
        "kind": "read",
        "label": "Hamel Husain: your AI product needs evals",
        "url": "https://hamel.dev/blog/posts/evals/"
      },
      {
        "kind": "watch",
        "label": "Constructing domain-specific LLM evaluation systems (AI Engineer)",
        "url": "https://www.youtube.com/watch?v=eLXF0VojuSs"
      },
      {
        "kind": "use",
        "label": "openai/evals: an eval framework to read before writing your own",
        "url": "https://github.com/openai/evals"
      },
      {
        "kind": "read",
        "label": "Anthropic: defining success criteria and developing tests",
        "url": "https://docs.claude.com/en/docs/test-and-evaluate/develop-tests"
      }
    ],
    "quiz": [
      "Where did your cases come from?",
      "Give a case where two very different answers are both correct.",
      "Why does the holdout exist?"
    ]
  },
  {
    "day": 17,
    "week": 3,
    "kind": "build",
    "title": "Graders: how you score an answer",
    "mission": "Someone has to decide whether an output is right. Today you learn the three ways, and what each one gets wrong.",
    "points": 12,
    "estimateMinutes": 105,
    "tags": [
      "Graders",
      "AI",
      "Hands-on"
    ],
    "objectives": [
      "Choose the cheapest grader that can decide the question",
      "Write a rubric a judge can apply consistently",
      "Calibrate a model judge against your own labels"
    ],
    "concepts": [
      "Code graders: exact match, regex, schema, contains — cheap, exact, narrow",
      "Model-as-judge: rubrics, pairwise comparison, and where judges are biased",
      "Human review: when it is the only honest option, and how to make it consistent",
      "Calibration: checking your judge against human labels before trusting it"
    ],
    "steps": [
      "Write code graders for everything checkable without a model.",
      "Build a rubric-based judge for the rest, with the rubric written out.",
      "Label 20 outputs yourself, then measure how often your judge agrees with you.",
      "Report the agreement rate and decide whether the judge can be trusted yet."
    ],
    "deliverable": "17-graders/ with the calibration report",
    "reviewerChecks": "Code graders used wherever possible; the judge's rubric is explicit; agreement with human labels is measured and stated.",
    "resources": [
      {
        "kind": "read",
        "label": "Hamel Husain: AI evals FAQ",
        "url": "https://hamel.dev/blog/posts/evals-faq/"
      },
      {
        "kind": "use",
        "label": "LangSmith: evaluation concepts and graders",
        "url": "https://docs.smith.langchain.com/evaluation"
      },
      {
        "kind": "read",
        "label": "Evidently: LLM evaluation guide",
        "url": "https://www.evidentlyai.com/llm-guide/llm-evaluation"
      },
      {
        "kind": "read",
        "label": "Error analysis and better prompts: a systematic approach",
        "url": "https://www.lennysnewsletter.com/p/evals-error-analysis-and-better-prompts"
      }
    ],
    "quiz": [
      "What is your judge's agreement rate with your labels?",
      "Where did the judge and you disagree, and who was right?",
      "Which checks did you keep in code, and why?"
    ]
  },
  {
    "day": 18,
    "week": 3,
    "kind": "build",
    "title": "Security testing for AI features",
    "mission": "Prompt injection is the SQL injection of this decade, and your assistant reads untrusted text all day.",
    "points": 12,
    "estimateMinutes": 105,
    "tags": [
      "Security",
      "AI",
      "Hands-on"
    ],
    "objectives": [
      "Run direct and indirect injection attacks systematically",
      "Test for leakage and excessive agency",
      "Write AI security findings a developer can act on"
    ],
    "concepts": [
      "Prompt injection, direct and indirect — instructions hidden in the data the model reads",
      "Data leakage: system prompts, other customers' data, internal tools",
      "Excessive agency: what the assistant can do, not just say",
      "The OWASP LLM Top 10 as a test checklist"
    ],
    "steps": [
      "Try to make the Meridian assistant ignore its instructions. Keep every successful attack.",
      "Hide an instruction inside a support ticket the assistant will read, and see what happens.",
      "Test whether it will reveal its system prompt or another customer's details.",
      "Write the findings as security defects with severity and a proposed mitigation."
    ],
    "deliverable": "18-security/injection-findings.md",
    "reviewerChecks": "At least one successful indirect injection; findings carry severity and mitigation; no real customer data used.",
    "resources": [
      {
        "kind": "read",
        "label": "OWASP: Top 10 for LLM applications",
        "url": "https://genai.owasp.org/llm-top-10/"
      },
      {
        "kind": "read",
        "label": "OWASP: LLM application security project",
        "url": "https://owasp.org/www-project-top-10-for-large-language-model-applications/"
      },
      {
        "kind": "read",
        "label": "Anthropic: building effective agents",
        "url": "https://www.anthropic.com/engineering/building-effective-agents"
      }
    ],
    "quiz": [
      "Which injection worked, and what did it make the assistant do?",
      "What did it refuse that you expected it to do?",
      "What mitigation did you propose, and what does it cost?"
    ]
  },
  {
    "day": 19,
    "week": 3,
    "kind": "build",
    "title": "Regression testing when the model changes",
    "mission": "The model updates, the prompt changes, and nothing in your code moved. Today you catch what that breaks.",
    "points": 12,
    "estimateMinutes": 105,
    "tags": [
      "Regression",
      "AI",
      "Hands-on"
    ],
    "objectives": [
      "Compare two versions on the same eval set",
      "Measure run-to-run variance before claiming a regression",
      "Set a ship threshold and apply it"
    ],
    "concepts": [
      "Versioning prompts and models as artifacts you can diff",
      "Running an eval across two versions and reading the difference",
      "Statistical honesty: how much of a change is noise at your sample size",
      "Deciding to ship: what regression you will accept, and where you draw the line"
    ],
    "steps": [
      "Run your eval against two prompt versions and produce the comparison.",
      "Run it twice against the same version to measure your own noise floor.",
      "Identify which cases genuinely regressed rather than wobbled.",
      "Write the ship decision with the threshold you used."
    ],
    "deliverable": "19-regression/comparison.md",
    "reviewerChecks": "Noise floor measured before conclusions drawn; regressions separated from variance; the threshold is stated in advance.",
    "resources": [
      {
        "kind": "read",
        "label": "Hamel Husain: AI evals FAQ",
        "url": "https://hamel.dev/blog/posts/evals-faq/"
      },
      {
        "kind": "read",
        "label": "Anthropic: defining success criteria and developing tests",
        "url": "https://docs.claude.com/en/docs/test-and-evaluate/develop-tests"
      },
      {
        "kind": "use",
        "label": "LangSmith: evaluation concepts and graders",
        "url": "https://docs.smith.langchain.com/evaluation"
      }
    ],
    "quiz": [
      "What is your run-to-run noise floor?",
      "Which case regressed genuinely, and how do you know?",
      "What size of regression would block a release?"
    ]
  },
  {
    "day": 20,
    "week": 3,
    "kind": "build",
    "title": "Grounding, retrieval and hallucination",
    "mission": "Most wrong answers are retrieval failures wearing a model's voice. Test the pipeline, not just the output.",
    "points": 12,
    "estimateMinutes": 105,
    "tags": [
      "Grounding",
      "AI",
      "Hands-on"
    ],
    "objectives": [
      "Test retrieval independently of generation",
      "Detect answers unsupported by their sources",
      "Attribute failures to the right stage"
    ],
    "concepts": [
      "How retrieval-augmented answers are assembled, and where each stage fails",
      "Testing retrieval separately: is the right document even reaching the model?",
      "Faithfulness: does the answer follow from the retrieved text, or from nowhere",
      "Citations as a testable property"
    ],
    "steps": [
      "For 20 questions, check whether the correct source document was retrieved at all.",
      "Split failures into retrieval failures and generation failures.",
      "Test faithfulness: find answers unsupported by their own cited source.",
      "Recommend the fix for the biggest bucket, with evidence."
    ],
    "deliverable": "20-grounding/rag-report.md",
    "reviewerChecks": "Retrieval and generation failures are counted separately; at least one unfaithful-but-plausible answer is documented; the recommendation follows the evidence.",
    "resources": [
      {
        "kind": "read",
        "label": "Evidently: LLM evaluation guide",
        "url": "https://www.evidentlyai.com/llm-guide/llm-evaluation"
      },
      {
        "kind": "read",
        "label": "Anthropic: effective context engineering for AI agents",
        "url": "https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents"
      },
      {
        "kind": "watch",
        "label": "Constructing domain-specific LLM evaluation systems (AI Engineer)",
        "url": "https://www.youtube.com/watch?v=eLXF0VojuSs"
      }
    ],
    "quiz": [
      "What share of failures were retrieval rather than generation?",
      "Give an answer that was fluent, cited, and wrong.",
      "What fix would you make first?"
    ]
  },
  {
    "day": 21,
    "week": 3,
    "kind": "assessment",
    "title": "AI feature evaluation",
    "mission": "The hardest checkpoint. You are given an AI feature and real traffic, and must produce an eval set, graders, a calibrated judge and a ship recommendation — while two injects land: a prompt change mid-run, and a reported customer incident.",
    "points": 40,
    "estimateMinutes": 120,
    "tags": [
      "AI",
      "Assessment"
    ],
    "objectives": [
      "Eval set with provenance and a holdout",
      "Code graders plus a calibrated judge, with the agreement rate",
      "Regression comparison across the two prompt versions",
      "A ship-or-hold recommendation with your threshold stated"
    ],
    "concepts": [],
    "steps": [],
    "deliverable": "Submitted artifacts plus your defence recording",
    "reviewerChecks": "This is the checkpoint most likely to fail someone. Eval sets built from imagination rather than traffic collapse under the injects.",
    "resources": [
      {
        "kind": "read",
        "label": "Hamel Husain: your AI product needs evals",
        "url": "https://hamel.dev/blog/posts/evals/"
      },
      {
        "kind": "read",
        "label": "Hamel Husain: AI evals FAQ",
        "url": "https://hamel.dev/blog/posts/evals-faq/"
      },
      {
        "kind": "watch",
        "label": "Constructing domain-specific LLM evaluation systems (AI Engineer)",
        "url": "https://www.youtube.com/watch?v=eLXF0VojuSs"
      }
    ],
    "quiz": [
      "Your judge agrees with you 78% of the time. Is that good enough to ship on?",
      "The prompt changed mid-run. What of your results is still valid?",
      "You recommended shipping. What is the worst thing a customer sees if you are wrong?"
    ]
  },
  {
    "day": 22,
    "week": 4,
    "kind": "build",
    "title": "Quality metrics that mean something",
    "mission": "Coverage percentage is the most quoted and least useful number in testing. Replace it with metrics that change decisions.",
    "points": 12,
    "estimateMinutes": 105,
    "tags": [
      "Metrics",
      "Hands-on"
    ],
    "objectives": [
      "Choose metrics by the decisions they change",
      "Compute them from your own evidence",
      "Anticipate how each could be gamed"
    ],
    "concepts": [
      "Escaped defects, defect detection percentage, and why they beat coverage",
      "Flake rate, suite runtime and the trust threshold",
      "DORA delivery metrics, and where quality sits inside them",
      "Gaming: every metric's failure mode, including yours"
    ],
    "steps": [
      "Define six metrics with precise definitions and named sources.",
      "Compute what you can from your own suite and CI runs.",
      "For each, write the decision it changes. Delete the two that fail this test.",
      "Show how each of your metrics could be gamed, and what you would watch for."
    ],
    "deliverable": "22-metrics/measurement-plan.md",
    "reviewerChecks": "Each metric names a decision; two are deleted; gaming modes are specific rather than generic.",
    "resources": [
      {
        "kind": "read",
        "label": "DORA: the four key delivery metrics",
        "url": "https://dora.dev/guides/dora-metrics-four-keys/"
      },
      {
        "kind": "read",
        "label": "Google: Software Engineering at Google, the testing chapter",
        "url": "https://abseil.io/resources/swe-book/html/ch11.html"
      },
      {
        "kind": "read",
        "label": "Google SRE Book: testing for reliability",
        "url": "https://sre.google/sre-book/testing-reliability/"
      }
    ],
    "quiz": [
      "Which two metrics did you delete?",
      "How would someone game your flake rate?",
      "What is your suite runtime, and at what point does it stop being run?"
    ]
  },
  {
    "day": 23,
    "week": 4,
    "kind": "build",
    "title": "Cost, latency and performance of AI features",
    "mission": "An assistant that is right, slow and expensive still fails in production. Test the properties that decide whether it can ship.",
    "points": 12,
    "estimateMinutes": 105,
    "tags": [
      "Performance",
      "AI",
      "Hands-on"
    ],
    "objectives": [
      "Measure cost and latency as first-class test results",
      "Apply one optimisation lever and prove the effect",
      "Set a defensible per-request budget"
    ],
    "concepts": [
      "Token accounting: what actually drives the bill",
      "Caching, batching and cheaper tiers as measurable levers",
      "Latency under concurrency, and the difference between p50 and p99",
      "Setting budgets per request, and testing that they hold"
    ],
    "steps": [
      "Measure tokens, cost and latency per request across your eval set.",
      "Apply one lever — caching, a cheaper tier, or shorter context — and measure the change.",
      "Load-test the endpoint and report p50, p95 and p99 under realistic concurrency.",
      "Recommend a per-request budget and show the evidence for it."
    ],
    "deliverable": "23-performance/ with measurements",
    "reviewerChecks": "Numbers are measured rather than estimated; one lever is applied and re-measured; the budget follows from the data.",
    "resources": [
      {
        "kind": "read",
        "label": "Anthropic: prompt caching (what makes repeated context cheap)",
        "url": "https://docs.claude.com/en/docs/build-with-claude/prompt-caching"
      },
      {
        "kind": "use",
        "label": "k6: load and performance testing docs",
        "url": "https://k6.io/docs/"
      },
      {
        "kind": "use",
        "label": "OpenAI: current model pricing (check before quoting any number)",
        "url": "https://platform.openai.com/docs/pricing"
      }
    ],
    "quiz": [
      "What is your cost per request, and what dominates it?",
      "Which lever helped most, and by how much?",
      "What is your p99, and is it acceptable?"
    ]
  },
  {
    "day": 24,
    "week": 4,
    "kind": "build",
    "title": "Accessibility and the rest of non-functional testing",
    "mission": "The defects that reach legal are rarely functional. Cover the ground most QA CVs skip.",
    "points": 12,
    "estimateMinutes": 105,
    "tags": [
      "Accessibility",
      "Hands-on"
    ],
    "objectives": [
      "Run and triage automated accessibility scans",
      "Find what automation cannot, by keyboard and screen reader",
      "Put accessibility into CI proportionately"
    ],
    "concepts": [
      "WCAG in practice: what the criteria actually require",
      "Automated accessibility scanning, and the 60% it cannot see",
      "Keyboard-only and screen-reader passes",
      "Where accessibility belongs in CI, and what should block"
    ],
    "steps": [
      "Run axe across the Meridian UI and triage every finding.",
      "Do a keyboard-only pass of the refund flow and record what is unreachable.",
      "Test the chat interface with a screen reader, including streaming answers.",
      "Add accessibility checks to CI and decide what blocks."
    ],
    "deliverable": "24-accessibility/report.md",
    "reviewerChecks": "Automated and manual findings are separated; the keyboard pass is evidenced; the CI rule states what blocks and why.",
    "resources": [
      {
        "kind": "use",
        "label": "axe: accessibility testing engine",
        "url": "https://www.deque.com/axe/"
      },
      {
        "kind": "read",
        "label": "axe rule descriptions: what each failure means",
        "url": "https://dequeuniversity.com/rules/axe/4.9"
      },
      {
        "kind": "read",
        "label": "WCAG 2.2 quick reference",
        "url": "https://www.w3.org/WAI/WCAG22/quickref/"
      }
    ],
    "quiz": [
      "What did the keyboard pass find that axe missed?",
      "How does a screen reader handle a streaming answer?",
      "What accessibility failure would you block a release for?"
    ]
  },
  {
    "day": 25,
    "week": 4,
    "kind": "build",
    "title": "From repo to portfolio",
    "mission": "Publish the evidence. A hiring manager should understand what you can do in three minutes.",
    "points": 12,
    "estimateMinutes": 105,
    "tags": [
      "AI",
      "Hands-on"
    ],
    "objectives": [
      "Write a case study that leads with risk and decisions",
      "Link every claim to a real artifact",
      "Publish a portfolio that reads in three minutes"
    ],
    "concepts": [
      "Case study structure: context, risk, decision, evidence, outcome",
      "What a hiring manager looks for in a QA repo in the first fifteen seconds",
      "Linking claims to artifacts: the suite, the eval, the findings",
      "Publishing as a readable site, and artifact hygiene"
    ],
    "steps": [
      "Write a 1,200-word case study of testing the Meridian assistant.",
      "Lead with the risk you found, not the tools you used.",
      "Publish the repo as a site with a README index.",
      "Remove anything confidential, invented, or copied from an employer."
    ],
    "deliverable": "Live portfolio URL plus case-study.md",
    "reviewerChecks": "Site is live; every claim links to an artifact; nothing employer-identifying remains.",
    "resources": [
      {
        "kind": "read",
        "label": "Hamel Husain: your AI product needs evals",
        "url": "https://hamel.dev/blog/posts/evals/"
      },
      {
        "kind": "read",
        "label": "Google Testing Blog",
        "url": "https://testing.googleblog.com/"
      },
      {
        "kind": "use",
        "label": "Ministry of Testing: community, clubs and events",
        "url": "https://www.ministryoftesting.com/"
      }
    ],
    "quiz": [
      "Paste your live portfolio URL.",
      "Which claim is backed by which artifact?",
      "What did you remove, and why?"
    ]
  },
  {
    "day": 26,
    "week": 4,
    "kind": "build",
    "title": "The story bank",
    "mission": "Twelve stories covering every competency a QA interview tests, each under two minutes spoken.",
    "points": 12,
    "estimateMinutes": 105,
    "tags": [
      "Interview",
      "AI",
      "Hands-on"
    ],
    "objectives": [
      "Cover every competency with a concrete story",
      "Quantify honestly",
      "Tell a failure story that builds trust"
    ],
    "concepts": [
      "STAR and CARL, and when to lead with the result",
      "The competencies: risk judgement, defect advocacy, automation design, AI testing, conflict, failure",
      "Quantifying without inventing",
      "The story about the bug you missed — and why it builds trust"
    ],
    "steps": [
      "Write twelve stories mapped to the competency list, including two failures.",
      "Quantify each with a real number.",
      "Record three aloud and cut anything over two minutes.",
      "Tailor three to a specific QA job description you actually want."
    ],
    "deliverable": "26-interview/story-bank.md plus recordings",
    "reviewerChecks": "Every story is under two minutes spoken; two are genuine failures; numbers trace to something real.",
    "resources": [
      {
        "kind": "use",
        "label": "Ministry of Testing: community, clubs and events",
        "url": "https://www.ministryoftesting.com/"
      },
      {
        "kind": "read",
        "label": "Google Testing Blog",
        "url": "https://testing.googleblog.com/"
      },
      {
        "kind": "read",
        "label": "Hamel Husain: AI evals FAQ",
        "url": "https://hamel.dev/blog/posts/evals-faq/"
      }
    ],
    "quiz": [
      "Which bug did you miss, and what changed afterwards?",
      "What number anchors your strongest story?",
      "Which story ran long, and what did you cut?"
    ]
  },
  {
    "day": 27,
    "week": 4,
    "kind": "build",
    "title": "Interview drills under time pressure",
    "mission": "Ten questions, six minutes each, no editing. Then score yourself against the rubric you will be graded on.",
    "points": 12,
    "estimateMinutes": 105,
    "tags": [
      "Interview",
      "Hands-on"
    ],
    "objectives": [
      "Answer under time pressure with structure",
      "Self-score against the real rubric",
      "Ask questions that reveal how a team works"
    ],
    "concepts": [
      "The classic openers: how would you test X, and what they are really asking",
      "Live test design: structuring out loud",
      "Debugging questions: reasoning from evidence rather than guessing",
      "Questions to ask them that signal seniority"
    ],
    "steps": [
      "Answer ten timed questions in writing: five method, five scenario. Six minutes each.",
      "Score every answer against the five-criterion rubric.",
      "Rewrite your three weakest answers and note what changed structurally.",
      "Write the six questions you will ask an interviewer, and what each tests."
    ],
    "deliverable": "27-interview/drill-1.md",
    "reviewerChecks": "Timings logged; self-scores honest; rewrites show a structural change rather than new adjectives.",
    "resources": [
      {
        "kind": "use",
        "label": "Ministry of Testing: community, clubs and events",
        "url": "https://www.ministryoftesting.com/"
      },
      {
        "kind": "read",
        "label": "Martin Fowler: the practical test pyramid",
        "url": "https://martinfowler.com/articles/practical-test-pyramid.html"
      },
      {
        "kind": "read",
        "label": "Google: Software Engineering at Google, the testing chapter",
        "url": "https://abseil.io/resources/swe-book/html/ch11.html"
      }
    ],
    "quiz": [
      "Which question scored lowest, and what was missing?",
      "What changed structurally in your rewrite?",
      "What will you ask an interviewer about their flaky tests?"
    ]
  },
  {
    "day": 28,
    "week": 4,
    "kind": "assessment",
    "title": "Quality panel",
    "mission": "Present your testing of the Meridian assistant to two reviewers who have read your repo and will choose which artifact you walk them through.",
    "points": 40,
    "estimateMinutes": 25,
    "tags": [
      "Assessment"
    ],
    "objectives": [
      "Ten-minute presentation: the risk, the decisions, the evidence, and what you cannot prove",
      "Ten minutes of questioning on an artifact of their choosing",
      "Portfolio site, README and LinkedIn checked live",
      "Readiness scoring across the five competencies with a written gap list"
    ],
    "concepts": [],
    "steps": [],
    "deliverable": "Submitted artifacts plus your defence recording",
    "reviewerChecks": "Presentations that walk through tools rather than decisions. The panel asks 'what did you decide?' until it gets an answer.",
    "resources": [
      {
        "kind": "read",
        "label": "Google: Software Engineering at Google, the testing chapter",
        "url": "https://abseil.io/resources/swe-book/html/ch11.html"
      },
      {
        "kind": "use",
        "label": "Ministry of Testing: community, clubs and events",
        "url": "https://www.ministryoftesting.com/"
      }
    ],
    "quiz": [
      "Show me the defect you found that mattered most, and how you found it.",
      "Which of your tests would I delete, and would you defend it?",
      "If we removed the AI feature entirely, what of your work still applies?"
    ]
  },
  {
    "day": 29,
    "week": 4,
    "kind": "interview",
    "title": "Mock interview: technical and scenario",
    "mission": "A practising professional runs a real 45-minute round, timed section by section as below, with an inject partway through so a rehearsed answer breaks.",
    "points": 50,
    "estimateMinutes": 45,
    "tags": [
      "Mock interview"
    ],
    "objectives": [
      "0–5 min: 'Walk me through how you tested something you are proud of.' Scored on structure and risk reasoning.",
      "5–20 min: Method questions: test design techniques, the pyramid, flakiness, API versus UI coverage.",
      "20–38 min: Live scenario: how would you test this feature, with an inject partway through that invalidates the obvious plan.",
      "38–45 min: Their questions for the interviewer, scored as signal."
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
    "title": "Mock interview: AI testing and portfolio",
    "mission": "A different interviewer, a day later: the portfolio walkthrough with the artifact chosen by them, then depth questions and the closing conversation.",
    "points": 50,
    "estimateMinutes": 45,
    "tags": [
      "Mock interview"
    ],
    "objectives": [
      "0–15 min: Portfolio walkthrough from the live site, artifact chosen by the interviewer.",
      "15–35 min: AI testing depth: eval design, judge calibration, injection, and what they would refuse to ship.",
      "35–45 min: Behavioural questions and the compensation conversation."
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

export const qaModules: CurriculumModule[] = [
  {
    "week": 1,
    "name": "Testing foundations, and the new stack",
    "days": "Days 1–7",
    "summary": ""
  },
  {
    "week": 2,
    "name": "Automation with AI in the loop",
    "days": "Days 8–14",
    "summary": ""
  },
  {
    "week": 3,
    "name": "Testing AI systems",
    "days": "Days 15–21",
    "summary": ""
  },
  {
    "week": 4,
    "name": "Quality strategy and interview readiness",
    "days": "Days 22–30",
    "summary": ""
  }
];
