/**
 * Career track content. Each track uses the same layout with different data.
 * Days 7, 14, 21, 28 = weekly assessments. Days 29–30 = mock interviews.
 */
import type { Track, TrackSlug, TrackWeek, WeekNumber } from "@/types/program";

type ChallengeInput = [title: string, problem: string];

function week(
  n: WeekNumber,
  title: string,
  focus: string,
  challenges: ChallengeInput[],
  assessment: { title: string; task: string; format?: string },
): TrackWeek {
  const start = (n - 1) * 7 + 1;
  return {
    week: n,
    title,
    focus,
    challenges: challenges.map(([t, problem], i) => ({ day: start + i, title: t, problem })),
    assessment: {
      afterDay: (n * 7) as 7 | 14 | 21 | 28,
      title: assessment.title,
      task: assessment.task,
      format: assessment.format ?? "Practical task + short written reasoning, scored against a rubric",
    },
  };
}

export const tracks: Track[] = [
  {
    slug: "qa-engineer",
    name: "QA Engineer",
    becomes: "AI Test Architect",
    description: "Testing, automation, defect analysis, API testing and AI-assisted QA.",
    whoItsFor: ["Manual testers moving to automation", "Graduates with testing basics", "Developers moving into quality engineering"],
    skills: ["Test design", "Playwright automation", "Defect analysis", "API testing", "CI pipelines", "AI-assisted testing", "Testing AI features"],
    whatsChanging:
      "Agents now draft and maintain test suites from tickets. Teams need fewer people executing tests and more people directing, reviewing and designing quality.",
    carryOver: ["Product and edge-case intuition", "Risk thinking: what must never break", "Release discipline"],
    weeks: [
      week(1, "The new test stack", "Where agentic testing sits in a modern pipeline, and which parts of the job are already automated.", [
        ["Test design from a user story", "Write boundary, negative and edge cases for a checkout story."],
        ["Writing a defect report that gets fixed", "Turn a vague bug complaint into a reproducible report."],
        ["Prompting for test cases", "Use AI to draft test cases and correct what it gets wrong."],
        ["First Playwright test", "Automate a login flow with stable locators."],
        ["API testing basics", "Validate status codes, schemas and error responses for a REST API."],
        ["What should an agent own?", "Mark which tests in a suite should be automated, agent-generated or kept manual."],
      ], { title: "Suite audit", task: "Audit a real regression suite and mark what an agent should own, with reasoning." }),
      week(2, "Directing test agents", "Specs as prompts and acceptance criteria as contracts — generating the suites you used to hand-write.", [
        ["Acceptance criteria as contracts", "Rewrite ambiguous criteria so an agent can generate tests from them."],
        ["Generating a suite from a ticket", "Generate Playwright tests from a raw ticket and fix the failures."],
        ["Reviewing AI-written tests", "Find flaky locators, missing assertions and false passes."],
        ["Test data on demand", "Generate realistic test data sets for edge cases."],
        ["API contract tests", "Automate contract checks for a payments API."],
        ["Flaky test triage", "Diagnose three flaky tests and fix the root cause."],
      ], { title: "Ticket to suite", task: "Generate a test suite from a raw ticket and defend its coverage." }),
      week(3, "Testing AI systems", "Evaluating non-deterministic output: eval sets, regressions in model behaviour and guardrail tests.", [
        ["Why AI features break normal tests", "Identify what cannot be asserted with exact matches."],
        ["Building an eval set", "Create 30 test prompts with expected behaviour for a chatbot."],
        ["Prompt injection checks", "Try to break a support bot's instructions and document findings."],
        ["Scoring with rubrics", "Score model outputs consistently using a rubric."],
        ["Regression on model changes", "Compare two model versions and report what changed."],
        ["Reporting AI quality to stakeholders", "Summarise eval results for a product manager."],
      ], { title: "AI feature eval", task: "Build an eval set for a non-deterministic feature and report pass/fail criteria." }),
      week(4, "Pipelines, gates and portfolio", "Wiring agent-generated coverage into CI with review gates that hold up under audit.", [
        ["Tests in CI", "Run your suite on every pull request with GitHub Actions."],
        ["Quality gates", "Define what blocks a release and why."],
        ["Test strategy document", "Write a one-page test strategy for a new feature."],
        ["Portfolio: architecture", "Document your agentic test architecture."],
        ["Portfolio: walkthrough", "Record a 5-minute walkthrough of your project."],
        ["Interview drill: test design", "Answer live test-design questions under time pressure."],
      ], { title: "Panel review", task: "Present your agentic test architecture to a review panel." }),
    ],
    projects: ["Playwright + API test suite for a demo e-commerce app, running in CI", "Eval set and quality report for an AI chatbot feature"],
    outcomes: ["Design test cases from requirements", "Automate UI and API tests", "Review and correct AI-generated tests", "Test AI features with eval sets", "Explain a test strategy in an interview"],
    interviewTopics: ["Test design techniques", "Automation framework design", "API testing", "Defect lifecycle", "Testing AI features", "CI/CD and quality gates"],
    interviewQuestions: [
      { category: "Technical", question: "How would you test a login page?", whatGoodLooksLike: "Covers functional, negative, security, accessibility and performance angles, and prioritises by risk." },
      { category: "Technical", question: "How do you deal with flaky tests?", whatGoodLooksLike: "Finds root causes (timing, data, environment) instead of adding retries." },
      { category: "Scenario", question: "Release is tomorrow and 20 tests are failing. What do you do?", whatGoodLooksLike: "Triages by risk, communicates clearly, and makes a recommendation." },
      { category: "Scenario", question: "How would you test a chatbot whose answers change every time?", whatGoodLooksLike: "Uses eval sets, rubrics and behaviour checks rather than exact matches." },
      { category: "Behavioural", question: "Tell me about a bug you found that others missed.", whatGoodLooksLike: "Clear situation, the thinking behind it, and the impact." },
    ],
  },
  {
    slug: "l1-l2-support",
    name: "L1/L2 Support",
    becomes: "Conversational AI Operations Specialist",
    description: "Troubleshooting, ticket handling, incident response, escalation and customer communication.",
    whoItsFor: ["Customer support and helpdesk executives", "Graduates targeting IT support roles", "Support staff moving from L1 to L2"],
    skills: ["Troubleshooting", "Ticket handling", "Incident response", "Escalation", "Customer communication", "Knowledge base writing", "AI assistant operations"],
    whatsChanging:
      "Tier-one tickets are increasingly answered by AI assistants. The people who run those assistants — their knowledge, escalation rules and failure cases — come from support.",
    carryOver: ["How customers really describe problems", "Product knowledge that isn't documented", "De-escalation instinct"],
    weeks: [
      week(1, "The automated queue", "How ticket deflection works and which tiers still need people.", [
        ["Anatomy of a good ticket", "Rewrite five poor tickets with correct priority and category."],
        ["Structured troubleshooting", "Diagnose a 'can't log in' issue step by step."],
        ["Customer communication", "Reply to an angry customer without escalating the situation."],
        ["SLAs and priority", "Assign priority to 20 tickets against an SLA matrix."],
        ["Logs for support", "Read application logs to find the error behind a complaint."],
        ["What can a bot close?", "Classify a queue by what an AI assistant can resolve."],
      ], { title: "Queue classification", task: "Classify a month of tickets by what a bot can close, and justify the exceptions." }),
      week(2, "Knowledge engineering", "Turning undocumented support knowledge into content an assistant can answer from.", [
        ["Writing a knowledge article", "Turn a solved ticket thread into a clear help article."],
        ["L2 investigation", "Reproduce a reported issue and collect evidence for engineering."],
        ["Escalation notes", "Write an escalation engineers can act on immediately."],
        ["Knowledge gaps", "Find the top questions your knowledge base cannot answer."],
        ["Macros vs. real answers", "Decide when a template helps and when it harms."],
        ["Retrieval-ready content", "Restructure articles so an AI assistant answers accurately."],
      ], { title: "Knowledge domain", task: "Turn one support domain into usable retrieval content." }),
      week(3, "Incidents, flows and escalation", "Incidents under pressure, plus intents, handover rules and refusal behaviour for assistants.", [
        ["Major incident simulation", "Handle a live outage: triage, updates and escalation."],
        ["Status page updates", "Write customer updates at 15, 60 and 120 minutes into an incident."],
        ["Root cause summary", "Write a post-incident summary for customers and leadership."],
        ["Designing handover to a human", "Define when an assistant must hand over."],
        ["Refusals and safety", "Write rules for what an assistant must never answer."],
        ["Difficult escalations", "Handle a VIP complaint that crosses three teams."],
      ], { title: "Flow design", task: "Design intents, handover and refusals for one product area." }),
      week(4, "Quality, evals and portfolio", "Measuring containment, accuracy and harm; reviewing transcripts.", [
        ["Support metrics", "Interpret FCR, CSAT, AHT and containment for a support team."],
        ["Transcript review", "Review 20 bot conversations and flag failures."],
        ["Improvement plan", "Propose three changes that reduce repeat tickets."],
        ["Portfolio: support playbook", "Package your articles, flows and escalation rules."],
        ["Portfolio: walkthrough", "Present your playbook in 5 minutes."],
        ["Interview drill: troubleshooting", "Talk through a live troubleshooting scenario."],
      ], { title: "Assistant review", task: "Present a working assistant design with its evaluation results." }),
    ],
    projects: ["Support playbook: knowledge articles, escalation matrix and incident templates", "AI assistant flow design with evaluation of real transcripts"],
    outcomes: ["Troubleshoot methodically and document findings", "Handle tickets and escalations within SLA", "Communicate clearly during incidents", "Write knowledge content AI can use", "Evaluate AI assistant quality"],
    interviewTopics: ["Troubleshooting methodology", "Ticket prioritisation and SLAs", "Incident management", "Customer communication", "ITIL basics", "AI in support"],
    interviewQuestions: [
      { category: "Technical", question: "A user says 'the internet is not working'. Walk me through your steps.", whatGoodLooksLike: "Asks clarifying questions and narrows down layer by layer." },
      { category: "Technical", question: "What is the difference between an incident and a problem?", whatGoodLooksLike: "Correct ITIL distinction with an example." },
      { category: "Scenario", question: "Three P1 tickets arrive at once. How do you prioritise?", whatGoodLooksLike: "Uses impact and urgency, communicates, and escalates appropriately." },
      { category: "Scenario", question: "An AI assistant gave a customer wrong refund information. What do you do?", whatGoodLooksLike: "Fixes the customer issue first, then the knowledge source and the rule." },
      { category: "Behavioural", question: "Tell me about calming down a frustrated customer.", whatGoodLooksLike: "Empathy, ownership and a clear resolution." },
    ],
  },
  {
    slug: "project-manager",
    name: "Project Manager",
    becomes: "AI Delivery Lead",
    description: "Planning, requirements, execution, risk management, stakeholder communication and reporting.",
    whoItsFor: ["Coordinators and team leads", "Business analysts moving into delivery", "Professionals switching into project management"],
    skills: ["Planning", "Requirements", "Agile and Scrum", "Risk management", "Stakeholder communication", "Status reporting", "AI-assisted delivery"],
    whatsChanging:
      "Status reports, plan updates and meeting notes are increasingly generated by tools. What remains valuable is scoping, decisions, accountability and designing how AI fits into delivery.",
    carryOver: ["Stakeholder judgment", "Knowing how your organisation actually decides", "Delivery accountability"],
    weeks: [
      week(1, "Delivery foundations", "The core of delivery, and an honest audit of what tools now do without you.", [
        ["Project charter", "Write a one-page charter for a new internal tool."],
        ["Requirements from a messy brief", "Turn a rambling stakeholder email into clear requirements."],
        ["Work breakdown", "Break a project into a WBS and milestones."],
        ["Agile vs. waterfall decision", "Choose a delivery approach for three projects and justify it."],
        ["Stakeholder map", "Map stakeholders by influence and interest."],
        ["What automation already does", "Audit a PM's week against today's tooling."],
      ], { title: "Process audit", task: "Map one real delivery process against today's tooling and identify what should change." }),
      week(2, "Planning and scoping AI-native work", "Estimates, backlogs and review loops when AI drafts the first version.", [
        ["Estimation", "Estimate a backlog using story points and explain your assumptions."],
        ["Sprint planning", "Plan a two-week sprint with a capacity constraint."],
        ["Writing user stories", "Write stories with acceptance criteria for a feature."],
        ["Timeline and dependencies", "Build a timeline and identify the critical path."],
        ["AI in the loop", "Re-estimate work when an agent drafts code or content."],
        ["Status report that gets read", "Write a one-page RAG status update."],
      ], { title: "Re-estimate", task: "Re-estimate a live project with AI in the loop and explain the changes." }),
      week(3, "Risk, change and stakeholders", "The judgment calls: risk, scope change, conflict and human-in-the-loop design.", [
        ["Risk register", "Identify, score and plan responses for ten risks."],
        ["Scope change request", "Handle a late scope change without losing the date."],
        ["Difficult stakeholder", "Prepare for a meeting with a stakeholder who disagrees."],
        ["Project in trouble", "Recover a project that is three weeks behind."],
        ["Review gates for AI work", "Design where humans must review AI-generated output."],
        ["Escalating to leadership", "Write an escalation that asks for a clear decision."],
      ], { title: "Workflow design", task: "Design the review gates for one real workflow." }),
      week(4, "Measurement and portfolio", "Proving delivery impact and packaging your work.", [
        ["Delivery metrics", "Choose metrics for throughput, quality and predictability."],
        ["Dashboard for leadership", "Build a delivery dashboard in a spreadsheet."],
        ["Retrospective", "Run a retrospective and turn it into actions."],
        ["Portfolio: case study", "Write a before-and-after case study of a redesigned process."],
        ["Portfolio: presentation", "Present your case study in 5 minutes."],
        ["Interview drill: situational", "Answer situational PM questions using STAR."],
      ], { title: "Case study presentation", task: "Present a before-and-after of a process you redesigned." }),
    ],
    projects: ["End-to-end project plan: charter, backlog, timeline, risk register and status reports", "Case study of an AI-assisted delivery process"],
    outcomes: ["Plan and scope a project from a messy brief", "Run sprints and track dependencies", "Manage risk and scope change", "Communicate status to stakeholders", "Design where AI fits into delivery"],
    interviewTopics: ["Project lifecycle", "Agile and Scrum", "Estimation", "Risk and change management", "Stakeholder management", "Metrics and reporting"],
    interviewQuestions: [
      { category: "Technical", question: "How do you estimate a project you have never done before?", whatGoodLooksLike: "Uses decomposition, comparable work, ranges and explicit assumptions." },
      { category: "Scenario", question: "Your project is behind by three weeks. What do you do?", whatGoodLooksLike: "Diagnoses the cause, presents options with trade-offs, and communicates early." },
      { category: "Scenario", question: "A senior stakeholder adds scope a week before launch.", whatGoodLooksLike: "Assesses impact, offers options, and gets a documented decision." },
      { category: "Technical", question: "What is the difference between a risk and an issue?", whatGoodLooksLike: "Clear distinction and how each is managed." },
      { category: "Behavioural", question: "Tell me about a project that failed.", whatGoodLooksLike: "Honest ownership and specific lessons applied later." },
    ],
  },
  {
    slug: "junior-developer",
    name: "Junior Developer",
    becomes: "AI Engineering Associate",
    description: "Programming fundamentals, debugging, APIs, Git, frontend/backend basics and code quality.",
    whoItsFor: ["Computer science and IT graduates", "Bootcamp learners who need real practice", "Career switchers with basic coding knowledge"],
    skills: ["JavaScript/TypeScript fundamentals", "Debugging", "REST APIs", "Git and pull requests", "Frontend and backend basics", "Code review", "Working with AI coding assistants"],
    whatsChanging:
      "Well-specified tickets are often first drafted by coding assistants. Teams value juniors who can review, debug and safely ship AI-assisted code.",
    carryOver: ["Reading and reasoning about code", "Fundamentals: data structures and debugging", "Learning fast"],
    weeks: [
      week(1, "Fundamentals that still matter", "Core programming, Git and what junior work looks like after coding assistants.", [
        ["Reading unfamiliar code", "Explain what a 200-line module does and where it could fail."],
        ["Debugging a failing function", "Find and fix a bug using a debugger, not guesswork."],
        ["Git workflow", "Branch, commit, rebase and open a clean pull request."],
        ["Data structures in practice", "Choose the right structure to fix a slow feature."],
        ["Prompting a coding assistant", "Get an assistant to write a function, then verify it."],
        ["Reviewing a generated pull request", "List every flaw in an AI-written PR."],
      ], { title: "PR review", task: "Review a generated pull request and list every flaw you find, with fixes." }),
      week(2, "APIs and reviewing AI code", "Building and consuming APIs, and spotting the failure modes of generated code.", [
        ["Consume a REST API", "Fetch, display and handle errors from a public API."],
        ["Build an API endpoint", "Create a CRUD endpoint with validation."],
        ["Silent bugs in AI code", "Find the logic error that passes all tests."],
        ["Security basics", "Spot injection and auth flaws in generated code."],
        ["Writing tests", "Add unit tests that would have caught yesterday's bug."],
        ["Refactoring", "Improve a messy function without changing behaviour."],
      ], { title: "Planted defects", task: "Catch the planted defects in an agent-written feature." }),
      week(3, "Building features", "Frontend and backend together, task decomposition and multi-step AI workflows.", [
        ["Frontend component", "Build an accessible form component."],
        ["Connecting frontend to backend", "Wire a UI to your API with loading and error states."],
        ["Task decomposition", "Break a feature ticket into small, reviewable steps."],
        ["Agent workflow on a repo", "Ship a small feature using an AI agent, reviewing each step."],
        ["Production bug", "Debug an issue from a user report and logs."],
        ["Code review etiquette", "Give and respond to review comments professionally."],
      ], { title: "Feature delivery", task: "Decompose and ship a feature through an AI-assisted workflow." }),
      week(4, "Shipping safely and portfolio", "Tests, CI, deployment and the practices seniors expect.", [
        ["CI pipeline", "Run lint and tests automatically on pull requests."],
        ["Deploying an app", "Deploy your project and verify it works in production."],
        ["Logging and monitoring", "Add logs that make a production bug easy to find."],
        ["Portfolio: README and decisions", "Document how your project works and why."],
        ["Portfolio: walkthrough", "Present your project and code in 5 minutes."],
        ["Interview drill: live coding", "Solve a coding problem while explaining your thinking."],
      ], { title: "Ship review", task: "Put your feature through tests, CI and deployment, then present it." }),
    ],
    projects: ["Full-stack app with API, tests and CI, deployed", "Documented review of AI-generated code with fixes"],
    outcomes: ["Debug systematically", "Build and consume APIs", "Use Git and pull requests professionally", "Review AI-generated code for bugs and security issues", "Explain your code in an interview"],
    interviewTopics: ["Programming fundamentals", "Data structures", "Debugging", "APIs and HTTP", "Git", "Code quality and testing"],
    interviewQuestions: [
      { category: "Technical", question: "What happens when you type a URL into a browser?", whatGoodLooksLike: "DNS, TCP/TLS, HTTP request/response and rendering, at a sensible depth." },
      { category: "Technical", question: "How would you find the cause of a bug you cannot reproduce?", whatGoodLooksLike: "Logs, hypotheses, narrowing down environment and data." },
      { category: "Scenario", question: "An AI assistant wrote code that passes tests but you are unsure it is correct.", whatGoodLooksLike: "Reads it critically, adds edge-case tests, checks security." },
      { category: "Technical", question: "Explain the difference between PUT and PATCH.", whatGoodLooksLike: "Accurate definitions with an example." },
      { category: "Behavioural", question: "Tell me about something you built and what you would change now.", whatGoodLooksLike: "Specific decisions, trade-offs and honest reflection." },
    ],
  },
  {
    slug: "reporting-analyst",
    name: "Reporting Analyst",
    becomes: "Analytics Automation Lead",
    description: "Excel or spreadsheet analysis, SQL basics, dashboards, data interpretation and business reporting.",
    whoItsFor: ["MIS and reporting executives", "Graduates targeting analyst roles", "Operations and finance staff who work with data"],
    skills: ["Spreadsheet analysis", "SQL basics", "Dashboards", "Data cleaning", "Data interpretation", "Business reporting", "AI-assisted analytics"],
    whatsChanging:
      "Recurring reports and simple data requests are increasingly answered by natural-language tools. Value moves to defining metrics, data quality and explaining what numbers mean.",
    carryOver: ["Knowing where the data is wrong", "Business context behind each metric", "Stakeholder trust"],
    weeks: [
      week(1, "Spreadsheet and data foundations", "Core analysis skills, and what self-serve AI tools now handle.", [
        ["Cleaning a messy dataset", "Fix duplicates, blanks and inconsistent formats in sales data."],
        ["Lookups and pivots", "Answer five business questions with lookups and pivot tables."],
        ["Choosing the right chart", "Visualise the same data three ways and pick the clearest."],
        ["Metric definitions", "Define 'active customer' so two teams agree."],
        ["Asking AI about data", "Use an AI tool to analyse a sheet and verify its answers."],
        ["What self-serve tools answer", "Audit a report pack for what AI can already produce."],
      ], { title: "Report pack audit", task: "Audit a reporting pack for what a self-serve tool answers, and what still needs an analyst." }),
      week(2, "SQL and metric ownership", "Querying data yourself and owning definitions so answers stay consistent.", [
        ["SELECT, WHERE, GROUP BY", "Query an orders table to answer weekly sales questions."],
        ["JOINs", "Combine customers and orders without double counting."],
        ["Data quality checks", "Write queries that catch missing and invalid records."],
        ["Contested metric", "Resolve two conflicting revenue numbers."],
        ["Semantic layer basics", "Document metrics so AI tools answer consistently."],
        ["Writing the insight", "Turn a table of numbers into three clear sentences."],
      ], { title: "Metric defence", task: "Define a contested metric and defend the definition with SQL evidence." }),
      week(3, "Dashboards and automation", "Building dashboards and replacing manual reporting cycles.", [
        ["KPI dashboard", "Build a one-page dashboard for a sales head."],
        ["Automating a monthly report", "Replace a manual copy-paste process with a repeatable one."],
        ["Anomaly investigation", "Explain a sudden 30% drop in sign-ups."],
        ["Generated narratives", "Draft commentary with AI and correct what it gets wrong."],
        ["Stakeholder request triage", "Handle five conflicting data requests."],
        ["Presenting findings", "Present an analysis to a non-technical audience."],
      ], { title: "Automated cycle", task: "Replace one manual reporting cycle with an automated pipeline." }),
      week(4, "Governance and portfolio", "Data quality, trust and packaging your analysis work.", [
        ["Data lineage", "Document where each dashboard number comes from."],
        ["Guardrails for AI answers", "Decide which questions AI tools may answer."],
        ["Business case", "Use data to recommend a decision."],
        ["Portfolio: dashboard", "Finalise and document your dashboard project."],
        ["Portfolio: walkthrough", "Present your analysis in 5 minutes."],
        ["Interview drill: case study", "Solve a data case study under time pressure."],
      ], { title: "Governed system", task: "Present a governed, automated reporting system." }),
    ],
    projects: ["KPI dashboard built on cleaned data with SQL queries", "Automated monthly report with metric definitions and data-quality checks"],
    outcomes: ["Clean and analyse data in spreadsheets", "Write SQL queries to answer business questions", "Build clear dashboards", "Define and defend metrics", "Communicate insights to stakeholders"],
    interviewTopics: ["Excel/Sheets functions", "SQL", "Dashboards and visualisation", "Data cleaning", "Business case studies", "Communicating insights"],
    interviewQuestions: [
      { category: "Technical", question: "What is the difference between an INNER JOIN and a LEFT JOIN?", whatGoodLooksLike: "Correct explanation with an example of when each matters." },
      { category: "Technical", question: "How would you find duplicate records in a table?", whatGoodLooksLike: "GROUP BY with HAVING, or window functions, plus how to decide which to keep." },
      { category: "Scenario", question: "Sales dropped 20% last month. How do you investigate?", whatGoodLooksLike: "Checks data quality first, then segments by product, region and channel." },
      { category: "Scenario", question: "Two teams report different revenue numbers. What do you do?", whatGoodLooksLike: "Traces definitions and sources, then agrees one documented definition." },
      { category: "Behavioural", question: "Tell me about an insight that changed a decision.", whatGoodLooksLike: "Clear context, analysis and business impact." },
    ],
  },
];

export function getTrack(slug: string): Track | undefined {
  return tracks.find((t) => t.slug === slug);
}

export const trackSlugs: TrackSlug[] = tracks.map((t) => t.slug);
