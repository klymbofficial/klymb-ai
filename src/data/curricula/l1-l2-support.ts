/**
 * The l1-l2-support curriculum, day by day.
 *
 * Converted from the track's .docx programme document (~/Downloads/30_Day_L1_L2_Support_AI_Support_Engineer_Cohort.docx),
 * so the app and the document say the same thing. Re-convert rather than hand-edit
 * when the document changes. Resources were checked when the document was written:
 * re-check annually, links rot.
 */
import type { CurriculumDay, CurriculumModule } from "@/types/curriculum";

export const l1l2Curriculum: CurriculumDay[] = [
  {
    "day": 1,
    "week": 1,
    "kind": "build",
    "title": "The support operating system, and what changed",
    "mission": "Set up the evidence trail you will be judged on, take on your running product, and be honest about which parts of your current support day a tool already does.",
    "points": 12,
    "estimateMinutes": 105,
    "tags": [
      "Hands-on"
    ],
    "objectives": [
      "Stand up the portfolio repo that holds every artifact",
      "Read a real product brief and enumerate how it fails customers",
      "Name the parts of your current job that deflection already covers"
    ],
    "concepts": [
      "What a support engineer owns: the customer's outcome, not the ticket's status",
      "Ticket-closing versus problem-removal — which one is being automated away",
      "Why support work is invisible to hiring managers, and what makes it visible",
      "Repo-as-portfolio: structure, README as index, commit history as proof"
    ],
    "steps": [
      "Create the public repo support-evidence-portfolio with the 15 folders from the structure given, each with a placeholder README.",
      "Read the Meridian Pay brief: merchant dashboard, consumer app, public API, AI help assistant. List every way a customer could end up contacting support.",
      "Write the repo README: the product you support, your role, and how the folders map to the 30 days.",
      "Update your LinkedIn headline to name the work you are moving into."
    ],
    "deliverable": "README.md committed, repo public, LinkedIn headline updated",
    "reviewerChecks": "Repo is public and renders; at least 20 distinct contact reasons listed; commit dated Day 1.",
    "resources": [
      {
        "kind": "read",
        "label": "Atlassian: IT service management guides",
        "url": "https://www.atlassian.com/itsm"
      },
      {
        "kind": "read",
        "label": "Google: Site Reliability Engineering, the free book",
        "url": "https://sre.google/books/"
      },
      {
        "kind": "read",
        "label": "GitHub: basic writing and formatting syntax",
        "url": "https://docs.github.com/en/get-started/writing-on-github/getting-started-with-writing-and-formatting-on-github/basic-writing-and-formatting-syntax"
      }
    ],
    "quiz": [
      "Paste the URL of your portfolio repo.",
      "Which three contact reasons on your list are the product's fault rather than the customer's?",
      "Which part of your current support day could a tool do today, without you?"
    ]
  },
  {
    "day": 2,
    "week": 1,
    "kind": "build",
    "title": "Triage and severity that survives an audit",
    "mission": "Stop setting priority by who shouted loudest. Build a severity model you can defend to a manager, an engineer and an angry merchant on the same afternoon.",
    "points": 12,
    "estimateMinutes": 105,
    "tags": [
      "Triage",
      "Hands-on"
    ],
    "objectives": [
      "Separate impact, urgency and priority, and score each independently",
      "Write a severity matrix with worked examples at every level",
      "Defend a downgrade to someone who disagrees with it"
    ],
    "concepts": [
      "Impact versus urgency: blast radius against time pressure",
      "Severity levels that mean something operationally, not just S1 to S4 as decoration",
      "Why 'everything is P1' destroys a queue, and how to stop it",
      "The first-response and resolution clocks, and which one customers actually feel"
    ],
    "steps": [
      "Take the 40 seeded Meridian Pay tickets and score impact and urgency for each, independently.",
      "Write a severity matrix with two worked examples per level, drawn from those tickets.",
      "Find the three tickets your matrix scores lower than the customer did, and write the downgrade explanation you would send.",
      "Commit the matrix as a document an engineer could apply without asking you."
    ],
    "deliverable": "01-triage/severity-matrix.md plus the scored ticket set",
    "reviewerChecks": "Matrix is applicable by someone else without ambiguity; downgrade explanations are specific rather than apologetic.",
    "resources": [
      {
        "kind": "read",
        "label": "Atlassian: IT service management guides",
        "url": "https://www.atlassian.com/itsm"
      },
      {
        "kind": "read",
        "label": "Atlassian: Incident management handbook",
        "url": "https://www.atlassian.com/incident-management/handbook"
      },
      {
        "kind": "read",
        "label": "PagerDuty: Incident response documentation",
        "url": "https://response.pagerduty.com/"
      }
    ],
    "quiz": [
      "Which ticket was hardest to score, and what made it ambiguous?",
      "What does your S1 promise, in hours, and who is woken up by it?",
      "How would you explain a downgrade to a customer paying you money?"
    ]
  },
  {
    "day": 3,
    "week": 1,
    "kind": "build",
    "title": "The reply a customer acts on",
    "mission": "A correct answer that nobody follows is a failed ticket. Today you learn the writing discipline that separates a reply that closes from one that returns.",
    "points": 12,
    "estimateMinutes": 105,
    "tags": [
      "Writing",
      "Hands-on"
    ],
    "objectives": [
      "Write a reply that leads with the outcome, not the apology",
      "Convert a system error into language the customer can act on",
      "Cut a reply by half without losing anything that matters"
    ],
    "concepts": [
      "Answer-first structure: outcome, reason, action, timeline",
      "Why apology-heavy replies read as evasive, and what to do instead",
      "Translating system errors into consequences the customer recognises",
      "Reading level, sentence length, and why support writing is not marketing writing"
    ],
    "steps": [
      "Take five raw Meridian Pay error strings and rewrite each as a customer-facing explanation with a next action.",
      "Rewrite three of the worst seeded replies in the ticket set, answer-first, and halve their length.",
      "Write the KYC rejection reply — the hardest one, where you cannot say why the check failed.",
      "Record what you cut and why, in a short note under each rewrite."
    ],
    "deliverable": "03-writing/reply-rewrites.md with before and after for each",
    "reviewerChecks": "Rewrites lead with outcome; the KYC reply is honest about limits without being evasive; length at least halved.",
    "resources": [
      {
        "kind": "read",
        "label": "Nielsen Norman Group: error message guidelines",
        "url": "https://www.nngroup.com/articles/error-message-guidelines/"
      },
      {
        "kind": "read",
        "label": "Plain Language: federal plain language guidelines",
        "url": "https://www.plainlanguage.gov/guidelines/"
      },
      {
        "kind": "read",
        "label": "Atlassian: knowledge management and KCS",
        "url": "https://www.atlassian.com/itsm/knowledge-management"
      }
    ],
    "quiz": [
      "Which reply did you find impossible to shorten, and why?",
      "How did you handle the rejection you are not allowed to explain?",
      "What is the single sentence a customer most needs in the first line?"
    ]
  },
  {
    "day": 4,
    "week": 1,
    "kind": "build",
    "title": "Prompting as a support specification",
    "mission": "A prompt, a macro and a canned reply are the same artifact: a specification of what good output looks like. Today you write ones that hold under volume.",
    "points": 12,
    "estimateMinutes": 105,
    "tags": [
      "Ai",
      "AI",
      "Hands-on"
    ],
    "objectives": [
      "Write a prompt with an explicit output contract and tone bounds",
      "Make a model refuse gracefully instead of inventing policy",
      "Build a reusable drafting prompt your whole team could run"
    ],
    "concepts": [
      "The anatomy of a working prompt: role, context, task, constraints, output shape",
      "Why unspecified tone produces the wrong register, and how to bound it",
      "Refusal and escalation instructions — teaching a model where its authority stops",
      "Few-shot examples as the cheapest specification you can write"
    ],
    "steps": [
      "Write a drafting prompt that turns a raw ticket into a first-draft reply in the Meridian Pay voice.",
      "Add an output contract: structure, maximum length, and the fields it must never guess.",
      "Add refusal rules for refunds, KYC outcomes and anything touching money, and test that they hold.",
      "Run it against ten tickets and log every output you would not have sent."
    ],
    "deliverable": "04-ai/drafting-prompt.md plus ten logged outputs with a send or no-send verdict",
    "reviewerChecks": "Prompt has an explicit output contract; refusal rules genuinely hold under the adversarial tickets; verdicts have reasons.",
    "resources": [
      {
        "kind": "use",
        "label": "Anthropic: prompt engineering overview",
        "url": "https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering/overview"
      },
      {
        "kind": "read",
        "label": "Anthropic: context windows explained",
        "url": "https://docs.anthropic.com/en/docs/build-with-claude/context-windows"
      },
      {
        "kind": "read",
        "label": "Atlassian: knowledge management and KCS",
        "url": "https://www.atlassian.com/itsm/knowledge-management"
      }
    ],
    "quiz": [
      "Which ticket broke your prompt, and what did you add to fix it?",
      "Where did you draw the line on what the model may decide?",
      "What did you have to specify that you assumed was obvious?"
    ]
  },
  {
    "day": 5,
    "week": 1,
    "kind": "build",
    "title": "Context engineering — the knowledge base is the model",
    "mission": "Most bad assistant answers are a context defect, not a model defect. Today you learn to tell the difference, because that call is yours to make.",
    "points": 12,
    "estimateMinutes": 105,
    "tags": [
      "Ai",
      "AI",
      "Hands-on"
    ],
    "objectives": [
      "Diagnose whether a wrong answer came from the model or the knowledge",
      "Restructure an article so retrieval can actually find it",
      "Measure how much of your knowledge base is stale"
    ],
    "concepts": [
      "Retrieval in plain terms: what the assistant is actually given before it answers",
      "Chunking, headings and why a long article answers worse than three short ones",
      "Stale, contradictory and missing knowledge — three different failures with three different fixes",
      "The context window as a budget you are spending on someone's behalf"
    ],
    "steps": [
      "Take 20 Meridian Pay help articles and classify each as current, stale, contradictory or missing a case.",
      "Pick the five articles the assistant answers worst from and restructure them with real headings and one topic each.",
      "For ten wrong assistant answers, label each as a model defect or a context defect, with reasoning.",
      "Write the rule your team would use to decide which one it is."
    ],
    "deliverable": "05-ai/context-audit.md and the five restructured articles",
    "reviewerChecks": "Every wrong answer has a defect label with reasoning; restructured articles are single-topic; the decision rule is usable by someone else.",
    "resources": [
      {
        "kind": "read",
        "label": "Anthropic: context windows explained",
        "url": "https://docs.anthropic.com/en/docs/build-with-claude/context-windows"
      },
      {
        "kind": "read",
        "label": "Anthropic: retrieval augmented generation guidance",
        "url": "https://docs.anthropic.com/en/docs/build-with-claude/embeddings"
      },
      {
        "kind": "read",
        "label": "Atlassian: knowledge management and KCS",
        "url": "https://www.atlassian.com/itsm/knowledge-management"
      }
    ],
    "quiz": [
      "What proportion of your sample was stale, and how did you tell?",
      "Which wrong answer looked like a model failure and was not?",
      "What would you delete outright rather than fix?"
    ]
  },
  {
    "day": 6,
    "week": 1,
    "kind": "build",
    "title": "Choosing a model, and what it costs at volume",
    "mission": "Support runs at volume and volume has a bill. Today you make the cost, latency and capability trade-off explicitly, with numbers you can defend.",
    "points": 12,
    "estimateMinutes": 105,
    "tags": [
      "Ai",
      "AI",
      "Hands-on"
    ],
    "objectives": [
      "Match model tiers to support tasks with a stated reason",
      "Estimate monthly cost for a real ticket volume",
      "Show where a cheaper model is not just acceptable but better"
    ],
    "concepts": [
      "What actually differs between tiers: reasoning depth, latency, context, price",
      "Classification and routing versus judgement — which tasks need which tier",
      "Latency as a customer-facing property in live chat",
      "Why the provider's pricing page, not a blog post, is the source of truth"
    ],
    "steps": [
      "Define five support tasks, from language detection to refund-dispute drafting, and assign a model tier to each with a reason.",
      "Estimate the monthly bill at 12,000 tickets a month, showing your token assumptions.",
      "Run the same twenty tickets through a small and a large model and diff the outputs.",
      "Write the routing rule: which tickets get the expensive model, and who decides."
    ],
    "deliverable": "06-ai/model-selection.md with the cost model and the diff",
    "reviewerChecks": "Assumptions are stated and arithmetic checks out; the diff shows a case where the cheap model is sufficient and one where it is not.",
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
        "kind": "read",
        "label": "Anthropic: context windows explained",
        "url": "https://docs.anthropic.com/en/docs/build-with-claude/context-windows"
      }
    ],
    "quiz": [
      "Where did the cheap model fail in a way a customer would notice?",
      "What is your cost per ticket, and what drives it?",
      "Which task would you never route to a model at all?"
    ]
  },
  {
    "day": 7,
    "week": 1,
    "kind": "assessment",
    "title": "Triage defence and the reply rewrite",
    "mission": "Re-triage a fresh set of 40 Meridian Pay tickets using your own severity matrix, rewrite the four replies the marker selects, then defend the calls on camera against three challenge questions released when you press record.",
    "points": 40,
    "estimateMinutes": 90,
    "tags": [
      "Assessment"
    ],
    "objectives": [
      "The re-triage, with a severity and reason for all 40 tickets",
      "Your severity matrix from Day 2, revised if you have changed your mind",
      "Four reply rewrites, answer-first, against the marker's selection",
      "Five-minute unscripted video defence"
    ],
    "concepts": [],
    "steps": [],
    "deliverable": "Submitted artifacts plus your defence recording",
    "reviewerChecks": "Matrices that read well and cannot be applied. The reasoning, not the classification, is what is being marked.",
    "resources": [
      {
        "kind": "read",
        "label": "Atlassian: IT service management guides",
        "url": "https://www.atlassian.com/itsm"
      },
      {
        "kind": "read",
        "label": "Nielsen Norman Group: error message guidelines",
        "url": "https://www.nngroup.com/articles/error-message-guidelines/"
      }
    ],
    "quiz": [
      "You downgraded a ticket from a merchant who processes a crore a month. Defend that.",
      "Two tickets have identical symptoms and different severities in your set. Why?",
      "Your rewrite removed the apology entirely. What makes that the right call here?"
    ]
  },
  {
    "day": 8,
    "week": 2,
    "kind": "build",
    "title": "Reading an API response like a support engineer",
    "mission": "The answer to most L2 tickets is in a response body the customer cannot see. Today you learn to go and get it.",
    "points": 12,
    "estimateMinutes": 105,
    "tags": [
      "Diagnosis",
      "Hands-on"
    ],
    "objectives": [
      "Read status codes and error bodies and say what the customer will experience",
      "Reproduce a reported failure against the real API",
      "Tell a client error from a server error, and route accordingly"
    ],
    "concepts": [
      "The status code families, and the four codes support meets every week",
      "Idempotency keys, retries and why a customer sees a double charge",
      "Reading an error envelope: code, message, and the field that actually matters",
      "Authentication failures versus authorisation failures — different teams, different fixes"
    ],
    "steps": [
      "Reproduce five reported Meridian Pay API failures with curl or Postman and capture the full response.",
      "For each, write what the merchant sees in their dashboard versus what the API returned.",
      "Classify each as client error, server error or documentation error, with the evidence line.",
      "Write the reply for the one that turns out to be the customer's own integration bug."
    ],
    "deliverable": "08-diagnosis/api-repros.md with request, response and verdict for each",
    "reviewerChecks": "Each repro includes the actual response body; the client-versus-server call is evidenced rather than asserted.",
    "resources": [
      {
        "kind": "read",
        "label": "MDN: HTTP response status codes",
        "url": "https://developer.mozilla.org/en-US/docs/Web/HTTP/Status"
      },
      {
        "kind": "use",
        "label": "curl: command line documentation",
        "url": "https://curl.se/docs/manpage.html"
      },
      {
        "kind": "use",
        "label": "Postman: Learning Center",
        "url": "https://learning.postman.com/docs/introduction/overview/"
      }
    ],
    "quiz": [
      "Which failure looked like our bug and was not?",
      "What did the error message fail to tell the merchant?",
      "Which of the five would you escalate, and to whom?"
    ]
  },
  {
    "day": 9,
    "week": 2,
    "kind": "build",
    "title": "Logs, traces and finding the one request that failed",
    "mission": "A customer gives you a timestamp and a feeling. Today you turn that into the exact request, in the log, with an ID you can hand to engineering.",
    "points": 12,
    "estimateMinutes": 105,
    "tags": [
      "Diagnosis",
      "Hands-on"
    ],
    "objectives": [
      "Find a single customer's failing request in a day of logs",
      "Follow a request across services using a correlation ID",
      "Say what a log does not tell you, and stop guessing"
    ],
    "concepts": [
      "Structured logs versus text logs, and why the difference decides your week",
      "Correlation and trace IDs: the thread that survives across services",
      "Log levels, sampling, and the events that were never recorded",
      "Observability in one sentence: can you answer a new question without shipping code?"
    ],
    "steps": [
      "Given the Meridian Pay log extract and a customer complaint with a rough time, find the failing request.",
      "Follow its correlation ID across the three services it touched and write the sequence.",
      "Identify the point of failure, and name the event that would have made it obvious sooner.",
      "Write the one-paragraph finding an engineer could act on without re-reading the logs."
    ],
    "deliverable": "09-diagnosis/log-investigation.md with the trace and the finding",
    "reviewerChecks": "The correct request is identified with its ID; the finding names a missing log event rather than only the failure.",
    "resources": [
      {
        "kind": "read",
        "label": "OpenTelemetry: observability primer",
        "url": "https://opentelemetry.io/docs/concepts/observability-primer/"
      },
      {
        "kind": "read",
        "label": "Grafana Loki: documentation",
        "url": "https://grafana.com/docs/loki/latest/"
      },
      {
        "kind": "use",
        "label": "Sentry: product documentation",
        "url": "https://docs.sentry.io/"
      }
    ],
    "quiz": [
      "What was the correlation ID, and how did you find it?",
      "Which service actually failed, and which one reported the error?",
      "What log line would have saved you twenty minutes?"
    ]
  },
  {
    "day": 10,
    "week": 2,
    "kind": "build",
    "title": "Querying the database for an answer support can act on",
    "mission": "Stop asking engineering for numbers you could get yourself. Today you write the read-only queries that answer support questions.",
    "points": 12,
    "estimateMinutes": 105,
    "tags": [
      "Diagnosis",
      "Hands-on"
    ],
    "objectives": [
      "Write a safe read-only query against a production-shaped schema",
      "Answer a support question with a number instead of an impression",
      "Recognise a query you should not run, and say why"
    ],
    "concepts": [
      "SELECT, WHERE, JOIN and GROUP BY — the four things support actually needs",
      "Why you never write to a production database from a support seat",
      "Counting distinct customers affected, which is the number managers ask for",
      "Personal data in query results, and your obligations under the DPDP Act"
    ],
    "steps": [
      "Write the query that answers: how many merchants hit this error in the last seven days?",
      "Write the query that lists affected accounts without exposing any field you do not need.",
      "Take three questions from your Week 1 tickets and answer each with a query and a number.",
      "Write the note explaining which query you refused to run, and on what grounds."
    ],
    "deliverable": "10-diagnosis/support-queries.sql with results and the refusal note",
    "reviewerChecks": "Queries are read-only and minimal in the columns they select; the refusal note cites a real principle, not squeamishness.",
    "resources": [
      {
        "kind": "use",
        "label": "Mode: SQL tutorial",
        "url": "https://mode.com/sql-tutorial/"
      },
      {
        "kind": "read",
        "label": "PostgreSQL: official documentation",
        "url": "https://www.postgresql.org/docs/current/"
      },
      {
        "kind": "read",
        "label": "MeitY: Digital Personal Data Protection Act 2023",
        "url": "https://www.meity.gov.in/data-protection-framework"
      }
    ],
    "quiz": [
      "How many distinct customers were affected, and over what window?",
      "Which column did you deliberately not select, and why?",
      "What question could you not answer with the data available?"
    ]
  },
  {
    "day": 11,
    "week": 2,
    "kind": "build",
    "title": "The escalation engineering actually accepts",
    "mission": "Half of escalations bounce back for missing information. Today you write the one that does not.",
    "points": 12,
    "estimateMinutes": 105,
    "tags": [
      "Escalation",
      "Hands-on"
    ],
    "objectives": [
      "Write an escalation with reproduction steps an engineer can follow",
      "Separate what you observed from what you concluded",
      "State impact in a unit engineering prioritises by"
    ],
    "concepts": [
      "The anatomy of an accepted escalation: expected, actual, steps, evidence, impact",
      "Observation versus inference, and why mixing them wastes an engineer's afternoon",
      "Impact in customers and money, not in adjectives",
      "What to do when you cannot reproduce it, and saying so honestly"
    ],
    "steps": [
      "Take the failure you traced on Day 9 and write the full escalation.",
      "Include the exact reproduction steps, the request ID, the affected-customer count from Day 10 and the customer-facing impact.",
      "Mark every sentence as observation or inference and fix the ones that blur the two.",
      "Write the second escalation for the bug you could not reproduce, and be honest about it."
    ],
    "deliverable": "11-escalation/escalation-pack.md with both escalations",
    "reviewerChecks": "Reproduction steps are followable by someone without context; observations and inferences are visibly separated; impact has a number.",
    "resources": [
      {
        "kind": "read",
        "label": "Atlassian: Incident management handbook",
        "url": "https://www.atlassian.com/incident-management/handbook"
      },
      {
        "kind": "read",
        "label": "PagerDuty: Incident response documentation",
        "url": "https://response.pagerduty.com/"
      },
      {
        "kind": "use",
        "label": "Sentry: product documentation",
        "url": "https://docs.sentry.io/"
      }
    ],
    "quiz": [
      "Which inference were you treating as an observation?",
      "What is the impact number, and where did it come from?",
      "How did you write the one you could not reproduce without wasting their time?"
    ]
  },
  {
    "day": 12,
    "week": 2,
    "kind": "build",
    "title": "Incident response from the support seat",
    "mission": "When it is on fire, support is the company's voice. Today you learn what that seat owns during an incident and what it must never do.",
    "points": 12,
    "estimateMinutes": 105,
    "tags": [
      "Incident",
      "Hands-on"
    ],
    "objectives": [
      "Run the support side of an incident to a written sequence",
      "Write a status page update that reduces contact volume",
      "Hold the line on what is not yet known"
    ],
    "concepts": [
      "Roles in an incident: who commands, who communicates, who investigates",
      "The first update matters more than the accurate one — acknowledge, then correct",
      "Status page writing: what is affected, what is not, when you will next speak",
      "Why speculating about cause during an incident costs you twice"
    ],
    "steps": [
      "Run the seeded Meridian Pay outage timeline and write the support actions at each of the six moments.",
      "Write the three status page updates: first acknowledgement, mid-incident, resolution.",
      "Write the macro for inbound tickets during the incident that does not promise a time you do not have.",
      "Log the moment you would have escalated to a full customer notification, and why."
    ],
    "deliverable": "12-incident/outage-playbook.md with the timeline and the three updates",
    "reviewerChecks": "First update is out fast and says little; no update speculates about cause; the macro avoids a fabricated ETA.",
    "resources": [
      {
        "kind": "read",
        "label": "Atlassian: Statuspage best practice",
        "url": "https://www.atlassian.com/software/statuspage"
      },
      {
        "kind": "read",
        "label": "Atlassian: Incident management handbook",
        "url": "https://www.atlassian.com/incident-management/handbook"
      },
      {
        "kind": "read",
        "label": "PagerDuty: Incident response documentation",
        "url": "https://response.pagerduty.com/"
      }
    ],
    "quiz": [
      "What did your first update say, and how long after detection?",
      "Where were you tempted to guess at the cause?",
      "What would have made you send a direct customer notification?"
    ]
  },
  {
    "day": 13,
    "week": 2,
    "kind": "build",
    "title": "The runbook that lets someone else do your job",
    "mission": "A fix only you can perform is a liability. Today you write the runbook that makes your knowledge transferable.",
    "points": 12,
    "estimateMinutes": 105,
    "tags": [
      "Runbooks",
      "Hands-on"
    ],
    "objectives": [
      "Write a runbook a new starter can execute unaided",
      "Include the checks that catch a wrong turn early",
      "Say explicitly when to stop and escalate"
    ],
    "concepts": [
      "Runbook structure: trigger, preconditions, steps, verification, rollback, escalation",
      "Writing for the reader at 2am who has never seen this before",
      "Verification steps — proving the fix worked rather than assuming",
      "The stop condition: the line past which this runbook no longer applies"
    ],
    "steps": [
      "Pick the three most repeated ticket types in your Week 1 set and write a runbook for each.",
      "Add explicit verification steps and a rollback for any action that changes state.",
      "Add the stop condition and the escalation target for each.",
      "Have the runbook followed literally against the seeded environment and fix every step that was ambiguous."
    ],
    "deliverable": "13-runbooks/ with three runbooks committed",
    "reviewerChecks": "Each has verification, rollback and a stop condition; ambiguity found in the literal walkthrough has been fixed rather than noted.",
    "resources": [
      {
        "kind": "read",
        "label": "Google: The SRE Workbook",
        "url": "https://sre.google/workbook/table-of-contents/"
      },
      {
        "kind": "read",
        "label": "PagerDuty: Incident response documentation",
        "url": "https://response.pagerduty.com/"
      },
      {
        "kind": "read",
        "label": "Atlassian: knowledge management and KCS",
        "url": "https://www.atlassian.com/itsm/knowledge-management"
      }
    ],
    "quiz": [
      "Which step turned out to be ambiguous when followed literally?",
      "What is the stop condition on your riskiest runbook?",
      "Which of these three should be automated instead of documented?"
    ]
  },
  {
    "day": 14,
    "week": 2,
    "kind": "assessment",
    "title": "Diagnosis and escalation under time pressure",
    "mission": "You are given an unseen Meridian Pay failure, a log extract, database access and 60 minutes. Produce the diagnosis, the affected-customer number and the escalation, then defend your reasoning against three challenge questions.",
    "points": 40,
    "estimateMinutes": 90,
    "tags": [
      "Assessment"
    ],
    "objectives": [
      "The investigation notes, showing the path you took including dead ends",
      "The affected-customer query and its result",
      "The written escalation, ready to send to engineering",
      "Five-minute unscripted video defence"
    ],
    "concepts": [],
    "steps": [],
    "deliverable": "Submitted artifacts plus your defence recording",
    "reviewerChecks": "Investigations that present a clean narrative and hide the dead ends. The marker wants the real path, including what you ruled out.",
    "resources": [
      {
        "kind": "read",
        "label": "OpenTelemetry: observability primer",
        "url": "https://opentelemetry.io/docs/concepts/observability-primer/"
      },
      {
        "kind": "read",
        "label": "Atlassian: Incident management handbook",
        "url": "https://www.atlassian.com/incident-management/handbook"
      }
    ],
    "quiz": [
      "You concluded it was a provider-side failure. What evidence would have changed your mind?",
      "Your number counts transactions, not customers. Does that change the priority?",
      "You spent 20 minutes on a dead end. What would have ruled it out sooner?"
    ]
  },
  {
    "day": 15,
    "week": 3,
    "kind": "build",
    "title": "What a deflection bot is actually doing",
    "mission": "Before you can own the assistant you have to know what it does when a customer types. Today you take it apart.",
    "points": 12,
    "estimateMinutes": 105,
    "tags": [
      "Assistant",
      "AI",
      "Hands-on"
    ],
    "objectives": [
      "Describe the retrieval and answer path end to end",
      "Identify every point where it can go wrong",
      "Measure its current deflection rate honestly"
    ],
    "concepts": [
      "The path: question, retrieval, context assembly, generation, handoff",
      "Deflection rate, containment and the difference between them",
      "False deflection — the customer who gave up rather than got an answer",
      "Why a high deflection rate can be a worse outcome than a low one"
    ],
    "steps": [
      "Trace ten real Meridian Pay questions through the assistant and record what it retrieved and what it said.",
      "Mark each answer as correct, incomplete, wrong or should-have-handed-off.",
      "Compute the true deflection rate, separating resolved from abandoned.",
      "Write the failure taxonomy: every distinct way this assistant goes wrong."
    ],
    "deliverable": "15-assistant/teardown.md with the ten traces and the taxonomy",
    "reviewerChecks": "Deflection is separated from abandonment; the taxonomy has distinct categories rather than severity levels.",
    "resources": [
      {
        "kind": "read",
        "label": "Anthropic: retrieval augmented generation guidance",
        "url": "https://docs.anthropic.com/en/docs/build-with-claude/embeddings"
      },
      {
        "kind": "read",
        "label": "Anthropic: context windows explained",
        "url": "https://docs.anthropic.com/en/docs/build-with-claude/context-windows"
      },
      {
        "kind": "read",
        "label": "Atlassian: knowledge management and KCS",
        "url": "https://www.atlassian.com/itsm/knowledge-management"
      }
    ],
    "quiz": [
      "What is the real deflection rate, and how does it differ from the reported one?",
      "Which answer was confidently wrong, and what would the customer have done next?",
      "Which question should it have handed off immediately?"
    ]
  },
  {
    "day": 16,
    "week": 3,
    "kind": "build",
    "title": "Rebuilding the knowledge base the bot answers from",
    "mission": "The assistant is only as good as what it reads. Today you rebuild the worst of it and prove the answers improved.",
    "points": 12,
    "estimateMinutes": 105,
    "tags": [
      "Assistant",
      "Hands-on"
    ],
    "objectives": [
      "Rewrite articles so a retrieval system can use them",
      "Remove contradictions rather than adding another article",
      "Prove an answer improved, with before and after"
    ],
    "concepts": [
      "One article, one job — and why merged articles retrieve badly",
      "Headings, questions-as-titles, and writing for the query not the topic",
      "Deprecation: deleting is a knowledge action, not an admission of failure",
      "Keeping a knowledge base current as a scheduled job, not a heroic effort"
    ],
    "steps": [
      "Rewrite the eight articles behind your worst answers from Day 15, one topic each.",
      "Find and resolve every contradiction between them, deleting rather than duplicating.",
      "Re-run the same ten questions through the assistant and capture the new answers.",
      "Write the before-and-after comparison with a verdict for each question."
    ],
    "deliverable": "16-assistant/kb-rebuild/ with the rewrites and the comparison",
    "reviewerChecks": "Contradictions are resolved by deletion or correction, not by a new article; the comparison shows at least one answer that did not improve.",
    "resources": [
      {
        "kind": "read",
        "label": "Atlassian: knowledge management and KCS",
        "url": "https://www.atlassian.com/itsm/knowledge-management"
      },
      {
        "kind": "read",
        "label": "Anthropic: retrieval augmented generation guidance",
        "url": "https://docs.anthropic.com/en/docs/build-with-claude/embeddings"
      },
      {
        "kind": "read",
        "label": "GitHub: basic writing and formatting syntax",
        "url": "https://docs.github.com/en/get-started/writing-on-github/getting-started-with-writing-and-formatting-on-github/basic-writing-and-formatting-syntax"
      }
    ],
    "quiz": [
      "Which answer did not improve, and what does that tell you?",
      "What did you delete, and who needs to know you deleted it?",
      "How would you keep this current without a heroic effort?"
    ]
  },
  {
    "day": 17,
    "week": 3,
    "kind": "build",
    "title": "Building an eval set for a non-deterministic assistant",
    "mission": "You cannot manage what you cannot measure, and you cannot measure an assistant with spot checks. Today you build the test suite.",
    "points": 12,
    "estimateMinutes": 105,
    "tags": [
      "Assistant",
      "AI",
      "Hands-on"
    ],
    "objectives": [
      "Build an eval set that covers the failure taxonomy",
      "Write graders that another person would apply identically",
      "Set a pass bar and justify where you put it"
    ],
    "concepts": [
      "An eval set is a test suite for a feature with no single correct output",
      "Coverage by failure mode, not by topic",
      "Graders: exact match, rubric, and model-as-judge, and when each is honest",
      "Choosing a pass bar, and why 100% is the wrong target"
    ],
    "steps": [
      "Build a 40-case eval set covering every category in your Day 15 taxonomy, including cases that must hand off.",
      "Write a grading rubric for each category that a second marker could apply.",
      "Run the set, score it, and record the baseline.",
      "Set the pass bar for unsupervised answering and write the justification."
    ],
    "deliverable": "17-assistant/eval-set.md with the 40 cases, rubrics and baseline",
    "reviewerChecks": "Cases cover must-hand-off as well as must-answer; rubrics are applicable by a second person; the pass bar has a stated rationale.",
    "resources": [
      {
        "kind": "use",
        "label": "Anthropic: prompt engineering overview",
        "url": "https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering/overview"
      },
      {
        "kind": "read",
        "label": "Anthropic: context windows explained",
        "url": "https://docs.anthropic.com/en/docs/build-with-claude/context-windows"
      },
      {
        "kind": "read",
        "label": "OWASP: Top 10 for LLM applications",
        "url": "https://owasp.org/www-project-top-10-for-large-language-model-applications/"
      }
    ],
    "quiz": [
      "What is your baseline score, and which category is worst?",
      "Where did two markers disagree, and how did you tighten the rubric?",
      "Why is your pass bar where it is and not ten points higher?"
    ]
  },
  {
    "day": 18,
    "week": 3,
    "kind": "build",
    "title": "Deciding what the assistant may answer alone",
    "mission": "This is the judgement call the job now exists for. Today you write the policy and defend where you drew the line.",
    "points": 12,
    "estimateMinutes": 105,
    "tags": [
      "Assistant",
      "AI",
      "Hands-on"
    ],
    "objectives": [
      "Classify every query type as auto-answer, assisted or human-only",
      "Tie each decision to a consequence, not a preference",
      "Write the handoff that does not make the customer repeat themselves"
    ],
    "concepts": [
      "Reversibility and blast radius as the two axes of the decision",
      "Regulatory and financial categories that never auto-answer",
      "Confidence signals, and why a model's confidence is not one",
      "Handoff design: context transfer so the human starts informed"
    ],
    "steps": [
      "Classify all 25 Meridian Pay query types as auto-answer, assisted draft or human-only.",
      "For each, name the worst realistic outcome of getting it wrong.",
      "Write the handoff payload: what the human receives when the bot gives up.",
      "Write the one-page policy a manager could sign."
    ],
    "deliverable": "18-assistant/answer-policy.md with the classification and handoff design",
    "reviewerChecks": "Every classification is tied to a consequence; financial and KYC categories are human-only; the handoff carries the conversation, not just the question.",
    "resources": [
      {
        "kind": "read",
        "label": "OWASP: Top 10 for LLM applications",
        "url": "https://owasp.org/www-project-top-10-for-large-language-model-applications/"
      },
      {
        "kind": "read",
        "label": "MeitY: Digital Personal Data Protection Act 2023",
        "url": "https://www.meity.gov.in/data-protection-framework"
      },
      {
        "kind": "read",
        "label": "Atlassian: knowledge management and KCS",
        "url": "https://www.atlassian.com/itsm/knowledge-management"
      }
    ],
    "quiz": [
      "Which category was closest to the line, and which way did you go?",
      "What does the human receive at handoff?",
      "What would make you move a category from assisted to auto?"
    ]
  },
  {
    "day": 19,
    "week": 3,
    "kind": "build",
    "title": "Prompt injection and the assistant with tools attached",
    "mission": "An assistant that reads customer text and can touch accounts is an attack surface with money behind it. Nobody else on the team is testing this.",
    "points": 12,
    "estimateMinutes": 105,
    "tags": [
      "Security",
      "AI",
      "Hands-on"
    ],
    "objectives": [
      "Attempt injection against a support assistant and document what worked",
      "Distinguish a jailbreak from a privilege problem",
      "Propose controls that survive a determined customer"
    ],
    "concepts": [
      "Prompt injection in plain terms: untrusted text arriving where instructions are read",
      "Direct and indirect injection, including via an attached file or a ticket history",
      "Why the fix is usually authorisation, not a better system prompt",
      "Data exfiltration through a support channel"
    ],
    "steps": [
      "Run 15 injection attempts against the seeded Meridian Pay assistant and log every outcome.",
      "Separate the ones that changed its tone from the ones that would have changed an account.",
      "Attempt an indirect injection through a pasted document in a ticket.",
      "Write the control recommendations, ordered by what you would fix first."
    ],
    "deliverable": "19-security/injection-report.md with all 15 attempts and outcomes",
    "reviewerChecks": "Tone breaks and authorisation breaks are separated; at least one indirect attempt is documented; controls name authorisation rather than only prompt hardening.",
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
        "label": "MeitY: Digital Personal Data Protection Act 2023",
        "url": "https://www.meity.gov.in/data-protection-framework"
      }
    ],
    "quiz": [
      "Which attempt actually reached a tool, and what stopped it or did not?",
      "Why is a better system prompt not the fix here?",
      "What would you fix first, given one engineering week?"
    ]
  },
  {
    "day": 20,
    "week": 3,
    "kind": "build",
    "title": "Measuring quality the way a customer feels it",
    "mission": "CSAT is a lagging, biased signal. Today you build the measure that tells you something before the customer leaves.",
    "points": 12,
    "estimateMinutes": 105,
    "tags": [
      "Quality",
      "Hands-on"
    ],
    "objectives": [
      "Name the failure modes CSAT cannot see",
      "Build a contact-reason taxonomy that drives product change",
      "Turn repeat contacts into a product argument"
    ],
    "concepts": [
      "Response bias in CSAT, and who actually answers a survey",
      "Contact rate per active customer as the number that matters",
      "Repeat contact and reopened tickets as quality signals",
      "From ticket data to a product change somebody funds"
    ],
    "steps": [
      "Build a contact-reason taxonomy from the full Meridian Pay ticket set, not from the existing categories.",
      "Compute contact rate, repeat-contact rate and reopen rate for the top five reasons.",
      "Identify the single product change that would remove the most contacts, with the arithmetic.",
      "Write the one-page argument for that change, aimed at a product manager."
    ],
    "deliverable": "20-quality/contact-taxonomy.md and the product argument",
    "reviewerChecks": "Taxonomy is derived from the tickets rather than inherited; the argument leads with removed contacts and has working arithmetic.",
    "resources": [
      {
        "kind": "read",
        "label": "Google: The SRE Workbook",
        "url": "https://sre.google/workbook/table-of-contents/"
      },
      {
        "kind": "read",
        "label": "Atlassian: IT service management guides",
        "url": "https://www.atlassian.com/itsm"
      },
      {
        "kind": "use",
        "label": "Mode: SQL tutorial",
        "url": "https://mode.com/sql-tutorial/"
      }
    ],
    "quiz": [
      "Which contact reason is entirely the product's fault?",
      "How many contacts a month does your proposed change remove?",
      "What does CSAT fail to show about that reason?"
    ]
  },
  {
    "day": 21,
    "week": 3,
    "kind": "assessment",
    "title": "Assistant evaluation and the answer policy defence",
    "mission": "Run your eval set against a changed Meridian Pay assistant you have not seen, report the regression, and defend your answer policy against three challenge questions including a live inject: a new query category is added mid-session.",
    "points": 40,
    "estimateMinutes": 90,
    "tags": [
      "AI",
      "Assessment"
    ],
    "objectives": [
      "The eval run and its score against your Day 17 baseline",
      "A written regression report naming what got worse and by how much",
      "Your answer policy, updated for the injected new category",
      "Five-minute unscripted video defence"
    ],
    "concepts": [],
    "steps": [],
    "deliverable": "Submitted artifacts plus your defence recording",
    "reviewerChecks": "Learners who report the headline score and miss the category regression underneath it. The aggregate is the least interesting number you have.",
    "resources": [
      {
        "kind": "use",
        "label": "Anthropic: prompt engineering overview",
        "url": "https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering/overview"
      },
      {
        "kind": "read",
        "label": "OWASP: Top 10 for LLM applications",
        "url": "https://owasp.org/www-project-top-10-for-large-language-model-applications/"
      }
    ],
    "quiz": [
      "Your score went up and your worst category got worse. What do you report to a manager?",
      "The new category involves a refund under a thousand rupees. Auto-answer or not, and why?",
      "You set the pass bar at 85%. The assistant scores 84%. What happens on Monday?"
    ]
  },
  {
    "day": 22,
    "week": 4,
    "kind": "build",
    "title": "Staffing, volume and the maths of a queue",
    "mission": "Support decisions are capacity decisions. Today you learn the arithmetic that turns a staffing argument into a defensible one.",
    "points": 12,
    "estimateMinutes": 105,
    "tags": [
      "Strategy",
      "Hands-on"
    ],
    "objectives": [
      "Model queue volume, handle time and headcount together",
      "Show the effect of deflection on required staffing",
      "Say honestly what a target response time costs"
    ],
    "concepts": [
      "Volume, average handle time and occupancy — the three numbers behind every roster",
      "Why adding people to a queue has diminishing returns",
      "Deflection as capacity, and the failure mode of counting it twice",
      "Peak versus average, and the hour that actually breaks you"
    ],
    "steps": [
      "Model Meridian Pay's monthly volume against handle time to get a baseline headcount.",
      "Show what a 20% deflection improvement does to that number, and what it does not.",
      "Model the peak hour and say what a one-hour first-response target costs in people.",
      "Write the staffing recommendation with the assumptions visible."
    ],
    "deliverable": "22-strategy/capacity-model.md with the working",
    "reviewerChecks": "Assumptions are visible and changeable; deflection is not double-counted; peak is modelled separately from average.",
    "resources": [
      {
        "kind": "read",
        "label": "Google: The SRE Workbook",
        "url": "https://sre.google/workbook/table-of-contents/"
      },
      {
        "kind": "read",
        "label": "Atlassian: IT service management guides",
        "url": "https://www.atlassian.com/itsm"
      },
      {
        "kind": "use",
        "label": "Mode: SQL tutorial",
        "url": "https://mode.com/sql-tutorial/"
      }
    ],
    "quiz": [
      "What does a one-hour target cost compared with four hours?",
      "Where does adding people stop helping?",
      "Which assumption is your model most sensitive to?"
    ]
  },
  {
    "day": 23,
    "week": 4,
    "kind": "build",
    "title": "The cost of the AI layer, measured",
    "mission": "You proposed the assistant. Now you own its bill and its return. Today you produce both.",
    "points": 12,
    "estimateMinutes": 105,
    "tags": [
      "Strategy",
      "AI",
      "Hands-on"
    ],
    "objectives": [
      "Compute the true cost per deflected contact",
      "Compare it honestly against the human cost",
      "Identify where the assistant is losing money"
    ],
    "concepts": [
      "Cost per contact, human and machine, on the same basis",
      "Hidden costs: knowledge maintenance, evaluation, and the failures that come back",
      "The contact that gets handled twice, and who pays for it",
      "When deflection is not worth it, and saying so"
    ],
    "steps": [
      "Compute the assistant's monthly cost at Meridian Pay volume using your Day 6 model.",
      "Compute cost per deflected contact, including the ones that came back to a human.",
      "Compare against the fully loaded human cost per contact.",
      "Identify the query category where deflection costs more than it saves."
    ],
    "deliverable": "23-strategy/ai-cost-model.md with both cost bases",
    "reviewerChecks": "Double-handled contacts are counted against deflection; at least one category is identified as not worth deflecting.",
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
        "kind": "read",
        "label": "Google: The SRE Workbook",
        "url": "https://sre.google/workbook/table-of-contents/"
      }
    ],
    "quiz": [
      "What is your cost per deflected contact, really?",
      "Which category loses money, and would you switch it off?",
      "What cost did you nearly forget to include?"
    ]
  },
  {
    "day": 24,
    "week": 4,
    "kind": "build",
    "title": "The support quality review",
    "mission": "Reviewing other people's tickets is an L2 and lead skill. Today you learn to do it without being either useless or cruel.",
    "points": 12,
    "estimateMinutes": 105,
    "tags": [
      "Quality",
      "Hands-on"
    ],
    "objectives": [
      "Review a ticket against a rubric rather than a preference",
      "Give feedback that changes behaviour",
      "Calibrate with a second reviewer"
    ],
    "concepts": [
      "A quality rubric: accuracy, completeness, tone, efficiency, escalation judgement",
      "Separating a bad outcome from a bad decision",
      "Feedback that names the behaviour and the alternative",
      "Calibration: why two reviewers must agree before either is trusted"
    ],
    "steps": [
      "Write a five-dimension quality rubric with behavioural anchors at each level.",
      "Review ten seeded tickets against it and score each dimension.",
      "Swap with a peer, review the same ten, and compute your agreement.",
      "Revise the anchors wherever you disagreed, and record what changed."
    ],
    "deliverable": "24-quality/review-rubric.md with scores and the calibration note",
    "reviewerChecks": "Anchors are behavioural rather than adjectival; disagreements are resolved by changing the rubric, not by averaging.",
    "resources": [
      {
        "kind": "read",
        "label": "Atlassian: IT service management guides",
        "url": "https://www.atlassian.com/itsm"
      },
      {
        "kind": "read",
        "label": "Atlassian: knowledge management and KCS",
        "url": "https://www.atlassian.com/itsm/knowledge-management"
      },
      {
        "kind": "read",
        "label": "Nielsen Norman Group: error message guidelines",
        "url": "https://www.nngroup.com/articles/error-message-guidelines/"
      }
    ],
    "quiz": [
      "Which dimension did you and your peer disagree on most?",
      "Which ticket had a good outcome from a bad decision?",
      "How would you give that feedback to the person who wrote it?"
    ]
  },
  {
    "day": 25,
    "week": 4,
    "kind": "build",
    "title": "Publishing the portfolio",
    "mission": "Everything you have built is in a repo nobody will read. Today you make it something a hiring manager opens and finishes.",
    "points": 12,
    "estimateMinutes": 105,
    "tags": [
      "Hands-on"
    ],
    "objectives": [
      "Publish the portfolio as a readable site",
      "Write the case study that leads with the outcome",
      "Make the evidence navigable in under two minutes"
    ],
    "concepts": [
      "Repo versus site: why a hiring manager will not browse folders",
      "The case study shape: problem, what you did, what changed, what you would do differently",
      "Leading with outcomes and putting the artifact one click away",
      "Writing for the reader who gives you ninety seconds"
    ],
    "steps": [
      "Publish the portfolio with GitHub Pages from your existing repo.",
      "Write three case studies: the diagnosis, the knowledge base rebuild, the answer policy.",
      "Put a two-minute reading path on the landing page, in order.",
      "Have someone outside the cohort try to find the assistant evaluation in under a minute."
    ],
    "deliverable": "Published site URL committed to the repo README",
    "reviewerChecks": "Site is live and navigable; case studies lead with outcome; the outside reader found the evaluation unaided.",
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
        "kind": "use",
        "label": "LinkedIn: profile best practices for job seekers",
        "url": "https://www.linkedin.com/help/linkedin/answer/a554351"
      }
    ],
    "quiz": [
      "Paste your published URL.",
      "What did your outside reader fail to find?",
      "Which case study leads with the weakest outcome, and can you fix that?"
    ]
  },
  {
    "day": 26,
    "week": 4,
    "kind": "build",
    "title": "The support interview, and what it is actually testing",
    "mission": "Support interviews are scenario interviews. Today you learn what each question is measuring and how to answer the real one.",
    "points": 12,
    "estimateMinutes": 105,
    "tags": [
      "Interview",
      "Hands-on"
    ],
    "objectives": [
      "Map common questions to the competency behind them",
      "Answer a scenario with a structure the interviewer can follow",
      "Use your portfolio as evidence without reciting it"
    ],
    "concepts": [
      "The five competencies: judgement, communication, diagnosis, ownership, escalation",
      "Scenario questions as judgement tests with no correct answer",
      "STAR as a structure, not a script",
      "Bringing evidence: referring to an artifact rather than describing it"
    ],
    "steps": [
      "Take the 20-question bank and label the competency each one is testing.",
      "Write answers for the eight hardest, each grounded in an artifact you built.",
      "Record yourself answering three of them, unscripted, and watch it back.",
      "Cut every answer that runs over two minutes."
    ],
    "deliverable": "26-interview/answer-bank.md and three recordings",
    "reviewerChecks": "Every answer references a real artifact; recordings are unscripted; no answer runs over two minutes.",
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
        "label": "Atlassian: IT service management guides",
        "url": "https://www.atlassian.com/itsm"
      }
    ],
    "quiz": [
      "Which question exposed a gap in your evidence?",
      "What did you notice watching yourself back?",
      "Which artifact do you reach for most, and why?"
    ]
  },
  {
    "day": 27,
    "week": 4,
    "kind": "build",
    "title": "The angry customer, the wrong policy and the escalation to you",
    "mission": "The hardest support moments are the ones where you are right and the customer is furious. Today you practise them.",
    "points": 12,
    "estimateMinutes": 105,
    "tags": [
      "Judgement",
      "Hands-on"
    ],
    "objectives": [
      "Hold a policy position without escalating the emotion",
      "Recognise when the policy is wrong and say so upward",
      "Recover a relationship after your company has erred"
    ],
    "concepts": [
      "De-escalation: acknowledge the impact before defending the decision",
      "The difference between a firm answer and a defensive one",
      "When the right move is to break policy and who you tell",
      "Apology that accepts responsibility without inventing fault"
    ],
    "steps": [
      "Work the three seeded confrontation scenarios in writing, in full, including the second reply.",
      "For one of them, decide the policy is wrong and write the internal case for changing it.",
      "Write the apology for the case where Meridian Pay genuinely caused the loss.",
      "Mark each reply for where you were defensive, and rewrite those lines."
    ],
    "deliverable": "27-judgement/hard-conversations.md with the three scenarios and the policy case",
    "reviewerChecks": "Replies acknowledge impact first; the internal case argues from customer outcome rather than irritation; the apology accepts responsibility specifically.",
    "resources": [
      {
        "kind": "read",
        "label": "Nielsen Norman Group: error message guidelines",
        "url": "https://www.nngroup.com/articles/error-message-guidelines/"
      },
      {
        "kind": "read",
        "label": "Plain Language: federal plain language guidelines",
        "url": "https://www.plainlanguage.gov/guidelines/"
      },
      {
        "kind": "read",
        "label": "Atlassian: IT service management guides",
        "url": "https://www.atlassian.com/itsm"
      }
    ],
    "quiz": [
      "Where were you defensive without noticing?",
      "Which policy would you change, and what does it cost the business?",
      "How did you apologise without inventing a fault you do not know about?"
    ]
  },
  {
    "day": 28,
    "week": 4,
    "kind": "assessment",
    "title": "Portfolio defence and the strategy case",
    "mission": "Present your Meridian Pay support strategy to a panel: what you would change, what it costs, what it removes, and what the assistant may and may not do. Then defend it against questions from a marker playing a sceptical head of support.",
    "points": 40,
    "estimateMinutes": 90,
    "tags": [
      "Assessment"
    ],
    "objectives": [
      "The published portfolio site",
      "A ten-slide strategy case with the capacity and cost models behind it",
      "Your answer policy, final version",
      "Live panel defence, fifteen minutes"
    ],
    "concepts": [],
    "steps": [],
    "deliverable": "Submitted artifacts plus your defence recording",
    "reviewerChecks": "Candidates who present the plan and cannot defend the arithmetic under it. The panel goes straight to the assumptions.",
    "resources": [
      {
        "kind": "read",
        "label": "Google: The SRE Workbook",
        "url": "https://sre.google/workbook/table-of-contents/"
      },
      {
        "kind": "read",
        "label": "Atlassian: IT service management guides",
        "url": "https://www.atlassian.com/itsm"
      }
    ],
    "quiz": [
      "Your model says deflection saves eight headcount. The last three deflection projects here saved none. Why is yours different?",
      "You want to delete a third of the knowledge base. What happens to the answers that depended on it?",
      "You have one engineering week. What do you ask for?"
    ]
  },
  {
    "day": 29,
    "week": 4,
    "kind": "interview",
    "title": "Mock interview: scenario and diagnosis",
    "mission": "45 minutes. A live unseen failure, a log extract, and an interviewer playing an unhelpful engineer.",
    "points": 50,
    "estimateMinutes": 45,
    "tags": [
      "Mock interview"
    ],
    "objectives": [
      "Diagnosis path, evidence discipline, escalation quality, handling of dead ends"
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
    "title": "Mock interview: behavioural and strategic",
    "mission": "45 minutes. Portfolio walkthrough, two scenario questions, one strategy challenge.",
    "points": 50,
    "estimateMinutes": 45,
    "tags": [
      "Mock interview"
    ],
    "objectives": [
      "Judgement, ownership, communication, and whether the evidence holds up under questioning"
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

export const l1l2Modules: CurriculumModule[] = [
  {
    "week": 1,
    "name": "Support foundations, and the new stack",
    "days": "Days 1–7",
    "summary": "You can triage, set severity with a defensible model, and write a reply a customer acts on"
  },
  {
    "week": 2,
    "name": "Diagnosis beyond the script",
    "days": "Days 8–14",
    "summary": "You can read logs and API responses, reproduce a defect, and escalate with evidence engineering accepts"
  },
  {
    "week": 3,
    "name": "Owning the AI answer layer",
    "days": "Days 15–21",
    "summary": "You can rebuild a knowledge base, evaluate a deflection bot, and say what it may answer unsupervised"
  },
  {
    "week": 4,
    "name": "Support strategy and interview readiness",
    "days": "Days 22–30",
    "summary": "You can argue staffing, deflection and CSAT trade-offs with numbers"
  }
];
