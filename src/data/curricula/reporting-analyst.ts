/**
 * The reporting-analyst curriculum, day by day.
 *
 * Converted from the track's .docx programme document (~/Downloads/30_Day_Reporting_Analyst_Decision_Analyst_Cohort.docx),
 * so the app and the document say the same thing. Re-convert rather than hand-edit
 * when the document changes. Resources were checked when the document was written:
 * re-check annually, links rot.
 */
import type { CurriculumDay, CurriculumModule } from "@/types/curriculum";

export const reportingAnalystCurriculum: CurriculumDay[] = [
  {
    "day": 1,
    "week": 1,
    "kind": "build",
    "title": "The analyst operating system, and what changed",
    "mission": "Set up the evidence trail you will be judged on, meet your running dataset, and be honest about which parts of your current week a tool already does.",
    "points": 12,
    "estimateMinutes": 105,
    "tags": [
      "Hands-on"
    ],
    "objectives": [
      "Stand up the portfolio repo that holds every artifact",
      "Profile an unfamiliar dataset before trusting any of it",
      "Name the parts of your current job that self-service already covers"
    ],
    "concepts": [
      "What an analyst owns: the definition, the caveat, and the recommendation",
      "Reporting versus analysis — which one is being automated away",
      "Why dashboards are a poor portfolio, and what a hiring manager reads instead",
      "Repo-as-portfolio: structure, README as index, commit history as proof"
    ],
    "steps": [
      "Create the public repo analytics-evidence-portfolio with the folder structure given.",
      "Profile every Meridian Retail table: row counts, date ranges, null rates, distinct counts per key column.",
      "Write down the ten questions you cannot yet answer because of what the profile revealed.",
      "Write the repo README and update your LinkedIn headline to name the work you are moving into."
    ],
    "deliverable": "README.md committed, repo public, 01-profile/data-profile.md committed",
    "reviewerChecks": "Profile covers every table with real numbers; the ten questions are about the data, not about the business; commit dated Day 1.",
    "resources": [
      {
        "kind": "read",
        "label": "Kimball Group: dimensional modelling techniques",
        "url": "https://www.kimballgroup.com/data-warehouse-business-intelligence-resources/kimball-techniques/"
      },
      {
        "kind": "read",
        "label": "Great Expectations: data quality documentation",
        "url": "https://docs.greatexpectations.io/docs/"
      },
      {
        "kind": "read",
        "label": "GitHub: basic writing and formatting syntax",
        "url": "https://docs.github.com/en/get-started/writing-on-github/getting-started-with-writing-and-formatting-on-github/basic-writing-and-formatting-syntax"
      }
    ],
    "quiz": [
      "Paste the URL of your portfolio repo.",
      "Which column has a null rate you did not expect, and what would it break?",
      "Which part of your current week could a tool do today, without you?"
    ]
  },
  {
    "day": 2,
    "week": 1,
    "kind": "build",
    "title": "SQL past the SELECT",
    "mission": "Most analysts stop at GROUP BY. Today you learn the constructs that separate a reporting query from an analytical one.",
    "points": 12,
    "estimateMinutes": 105,
    "tags": [
      "Sql",
      "Hands-on"
    ],
    "objectives": [
      "Write a query with common table expressions instead of nesting",
      "Use window functions for running, ranked and period-over-period results",
      "Explain what each join does to your row count before you run it"
    ],
    "concepts": [
      "CTEs as named steps, and why a readable query is a reviewable one",
      "Window functions: running totals, rank, lag and lead",
      "Join fan-out — the silent cause of overstated revenue",
      "Filtering in WHERE versus in the join condition, and when it changes the answer"
    ],
    "steps": [
      "Write the Meridian Retail monthly revenue query with a running total and a year-on-year comparison, using CTEs.",
      "Deliberately produce the fan-out bug by joining orders to order lines, and show the inflated number.",
      "Fix it, and write the note explaining how to spot fan-out before it reaches a slide.",
      "Rank customers by lifetime value within each acquisition channel using a window function."
    ],
    "deliverable": "02-sql/analytical-queries.sql with the fan-out demonstration",
    "reviewerChecks": "CTEs are named meaningfully; the fan-out is shown both wrong and right; the window function is used rather than emulated by a self-join.",
    "resources": [
      {
        "kind": "use",
        "label": "Mode: SQL tutorial",
        "url": "https://mode.com/sql-tutorial/"
      },
      {
        "kind": "read",
        "label": "PostgreSQL: window functions tutorial",
        "url": "https://www.postgresql.org/docs/current/tutorial-window.html"
      },
      {
        "kind": "read",
        "label": "PostgreSQL: official documentation",
        "url": "https://www.postgresql.org/docs/current/"
      }
    ],
    "quiz": [
      "By how much did fan-out overstate revenue?",
      "How would you have caught that before publishing it?",
      "Which window function did you find hardest, and why?"
    ]
  },
  {
    "day": 3,
    "week": 1,
    "kind": "build",
    "title": "The data is wrong, and you have to say so",
    "mission": "Every real dataset lies somewhere. Today you find where, quantify it, and write the caveat that keeps you honest.",
    "points": 12,
    "estimateMinutes": 105,
    "tags": [
      "Quality",
      "Hands-on"
    ],
    "objectives": [
      "Detect duplicates, gaps and impossible values systematically",
      "Quantify the impact of a data problem on a real number",
      "Write a caveat a reader will actually act on"
    ],
    "concepts": [
      "The four failures: missing, duplicated, impossible, and silently changed",
      "Referential integrity checks you can run in SQL",
      "Quantifying impact: not 'the data is messy' but 'revenue is overstated by 4.1%'",
      "Where a caveat belongs — beside the number, not in an appendix"
    ],
    "steps": [
      "Find the duplicated customers in Meridian Retail and write the rule that identifies them.",
      "Find the month with the tracking outage and quantify how much session data is missing.",
      "Find the currency change and show what it does to a naive revenue trend.",
      "Write the data-quality statement that must accompany any Meridian Retail revenue number."
    ],
    "deliverable": "03-quality/data-quality-report.md with each issue quantified",
    "reviewerChecks": "Every issue has a number attached; the deduplication rule is reproducible; the caveat is short enough that someone will read it.",
    "resources": [
      {
        "kind": "read",
        "label": "Great Expectations: data quality documentation",
        "url": "https://docs.greatexpectations.io/docs/"
      },
      {
        "kind": "read",
        "label": "PostgreSQL: official documentation",
        "url": "https://www.postgresql.org/docs/current/"
      },
      {
        "kind": "use",
        "label": "Mode: SQL tutorial",
        "url": "https://mode.com/sql-tutorial/"
      }
    ],
    "quiz": [
      "By what percentage is revenue overstated before deduplication?",
      "What happens to the trend if you ignore the currency change?",
      "Which issue would you refuse to publish around?"
    ]
  },
  {
    "day": 4,
    "week": 1,
    "kind": "build",
    "title": "Prompting as a question specification",
    "mission": "An ambiguous question returns a confident, wrong number. Today you learn to ask precisely enough that you can trust the answer.",
    "points": 12,
    "estimateMinutes": 105,
    "tags": [
      "Ai",
      "AI",
      "Hands-on"
    ],
    "objectives": [
      "Write a prompt that produces a query you can verify",
      "Give a model the schema and the definitions it needs",
      "Detect a plausible answer to the wrong question"
    ],
    "concepts": [
      "The anatomy of a working analytical prompt: schema, definitions, task, output shape",
      "Why 'active customers' returns four different numbers without a definition",
      "Asking for the query rather than the answer, so you can check it",
      "Verification as a habit: every generated number gets an independent check"
    ],
    "steps": [
      "Write three business questions about Meridian Retail with deliberate ambiguity, and note what each could mean.",
      "Rewrite them as specifications with the definitions included, and generate SQL for each.",
      "Verify every generated result with an independently written query.",
      "Log the one where the generated query answered a subtly different question."
    ],
    "deliverable": "04-ai/question-specs.md with all three, generated and verified",
    "reviewerChecks": "Each ambiguity is named before it is resolved; verification queries are genuinely independent; the subtle mismatch is found and explained.",
    "resources": [
      {
        "kind": "use",
        "label": "Anthropic: prompt engineering overview",
        "url": "https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering/overview"
      },
      {
        "kind": "use",
        "label": "Mode: SQL tutorial",
        "url": "https://mode.com/sql-tutorial/"
      },
      {
        "kind": "read",
        "label": "Anthropic: context windows explained",
        "url": "https://docs.anthropic.com/en/docs/build-with-claude/context-windows"
      }
    ],
    "quiz": [
      "Which generated query answered the wrong question, and how did you notice?",
      "What definition did you have to supply that you assumed was obvious?",
      "How would you verify a number you could not re-derive?"
    ]
  },
  {
    "day": 5,
    "week": 1,
    "kind": "build",
    "title": "Context engineering — what the model knows about your data",
    "mission": "A text-to-SQL tool with no schema context invents joins. Today you learn to supply what it actually needs.",
    "points": 12,
    "estimateMinutes": 105,
    "tags": [
      "Ai",
      "AI",
      "Hands-on"
    ],
    "objectives": [
      "Diagnose a wrong query as a context failure rather than a model failure",
      "Write schema documentation a model and a human both use",
      "Recognise an invented column before it reaches a slide"
    ],
    "concepts": [
      "What a model needs to see: tables, keys, grain, and the definitions that are not in the schema",
      "Grain as the thing models get wrong most often",
      "Hallucinated columns and joins, and why they look reasonable",
      "Documentation as durable context you write once"
    ],
    "steps": [
      "Run ten Meridian Retail questions through a model with no schema context and log every error.",
      "Write the schema documentation: every table, its grain, its keys and its known quirks.",
      "Re-run the same ten with that context supplied and record which are now correct.",
      "Label each remaining failure as a context or a model failure, with evidence."
    ],
    "deliverable": "05-ai/schema-context.md and the committed schema documentation",
    "reviewerChecks": "Grain is stated for every table; the re-run shows measurable improvement; at least one failure remains genuinely a model failure.",
    "resources": [
      {
        "kind": "read",
        "label": "Anthropic: context windows explained",
        "url": "https://docs.anthropic.com/en/docs/build-with-claude/context-windows"
      },
      {
        "kind": "use",
        "label": "dbt: developer documentation",
        "url": "https://docs.getdbt.com/docs/introduction"
      },
      {
        "kind": "read",
        "label": "Kimball Group: dimensional modelling techniques",
        "url": "https://www.kimballgroup.com/data-warehouse-business-intelligence-resources/kimball-techniques/"
      }
    ],
    "quiz": [
      "Which join did the model invent?",
      "What did documenting grain fix?",
      "Which question stayed wrong, and what does that tell you?"
    ]
  },
  {
    "day": 6,
    "week": 1,
    "kind": "build",
    "title": "Choosing a model, and what it costs at volume",
    "mission": "Classifying ten thousand tickets and reasoning about one contradictory result are different jobs. Today you stop paying the same price for both.",
    "points": 12,
    "estimateMinutes": 105,
    "tags": [
      "Ai",
      "AI",
      "Hands-on"
    ],
    "objectives": [
      "Match model tiers to analytical tasks with a stated reason",
      "Estimate cost for a real classification workload",
      "Show where the cheaper model is sufficient"
    ],
    "concepts": [
      "What differs between tiers: reasoning depth, context, latency, price",
      "Classification at volume versus reasoning on one hard case",
      "Batch processing, and why it changes the arithmetic",
      "Provider documentation as the source of truth over any blog post"
    ],
    "steps": [
      "Define five analytical tasks, from language detection to explaining a contradictory cohort result, and assign a tier with a reason.",
      "Classify 200 Meridian Retail support tickets with a small and a large model and compare agreement with your own labels.",
      "Estimate the monthly cost of classifying the full ticket volume, with assumptions written down.",
      "Write the routing rule you would give a colleague."
    ],
    "deliverable": "06-ai/model-selection.md with the agreement comparison and cost model",
    "reviewerChecks": "Agreement is measured against the learner's own labels, not between models; assumptions are stated and the arithmetic checks out.",
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
      "What was the agreement rate between the small model and you?",
      "Where did the expensive model earn its price?",
      "Which task would you never route to a model at all?"
    ]
  },
  {
    "day": 7,
    "week": 1,
    "kind": "assessment",
    "title": "Data quality defence and the analytical query",
    "mission": "Given an unseen slice of Meridian Retail, produce a data-quality assessment, answer three analytical questions in SQL, and defend both the numbers and the caveats you attached to them.",
    "points": 40,
    "estimateMinutes": 90,
    "tags": [
      "Assessment"
    ],
    "objectives": [
      "The data-quality assessment, with every issue quantified",
      "Three queries with results and the verification for each",
      "The caveat statement you would publish alongside",
      "Five-minute unscripted video defence"
    ],
    "concepts": [],
    "steps": [],
    "deliverable": "Submitted artifacts plus your defence recording",
    "reviewerChecks": "Assessments that describe problems without quantifying them. 'The data is messy' is not a finding.",
    "resources": [
      {
        "kind": "read",
        "label": "Great Expectations: data quality documentation",
        "url": "https://docs.greatexpectations.io/docs/"
      },
      {
        "kind": "use",
        "label": "Mode: SQL tutorial",
        "url": "https://mode.com/sql-tutorial/"
      }
    ],
    "quiz": [
      "Your caveat says revenue may be overstated. By how much, and would you still publish the number?",
      "Two of your three queries share an assumption. Which one, and what if it is wrong?",
      "The finance team's number differs from yours by 6%. What do you do first?"
    ]
  },
  {
    "day": 8,
    "week": 2,
    "kind": "build",
    "title": "Defining a metric that survives an executive",
    "mission": "Most arguments in a business are definition arguments wearing a data costume. Today you write definitions that end them.",
    "points": 12,
    "estimateMinutes": 105,
    "tags": [
      "Metrics",
      "Hands-on"
    ],
    "objectives": [
      "Write a metric definition precise enough to implement twice identically",
      "Name the edge cases the definition must decide",
      "Reconcile two teams who disagree about the same word"
    ],
    "concepts": [
      "The parts of a definition: population, event, window, grain, exclusions",
      "Edge cases as the whole job: refunds, test accounts, staff orders, partial cancellations",
      "Why two dashboards disagree, and how a definition fixes it permanently",
      "Metrics that can be gamed, and designing against it"
    ],
    "steps": [
      "Write the full definition of an active customer for Meridian Retail, including every exclusion.",
      "Implement it, and have a peer implement it independently from your document alone.",
      "Reconcile any difference in the two numbers, and revise the definition until they agree.",
      "Write the definitions for revenue and conversion rate to the same standard."
    ],
    "deliverable": "08-metrics/definitions.md and the reconciliation note",
    "reviewerChecks": "A peer implementing from the document alone reached the same number; exclusions are explicit; the gaming risk is named for at least one metric.",
    "resources": [
      {
        "kind": "read",
        "label": "Kimball Group: dimensional modelling techniques",
        "url": "https://www.kimballgroup.com/data-warehouse-business-intelligence-resources/kimball-techniques/"
      },
      {
        "kind": "read",
        "label": "dbt: best practice guides",
        "url": "https://docs.getdbt.com/best-practices"
      },
      {
        "kind": "read",
        "label": "Plain Language: federal plain language guidelines",
        "url": "https://www.plainlanguage.gov/guidelines/"
      }
    ],
    "quiz": [
      "Where did your peer's implementation differ, and why?",
      "Which exclusion was the hardest call?",
      "How could someone game your conversion rate?"
    ]
  },
  {
    "day": 9,
    "week": 2,
    "kind": "build",
    "title": "Modelling the data so the answer is cheap",
    "mission": "If every question needs a bespoke query, you are the bottleneck. Today you build the model underneath.",
    "points": 12,
    "estimateMinutes": 105,
    "tags": [
      "Model",
      "Hands-on"
    ],
    "objectives": [
      "Design a star schema for the questions actually being asked",
      "Choose a grain and defend it",
      "Separate raw, staged and modelled layers"
    ],
    "concepts": [
      "Facts and dimensions in plain terms, without the warehouse theology",
      "Grain: the single most consequential modelling decision",
      "Slowly changing dimensions, and the customer who moved city",
      "Layering: raw stays raw, staging cleans, marts answer"
    ],
    "steps": [
      "Design the Meridian Retail star schema: the order fact, its grain, and the dimensions around it.",
      "Build the staging layer that cleans and deduplicates, keeping raw untouched.",
      "Build the order fact table and two dimensions.",
      "Answer three Week 1 questions against the model and compare the query length with your originals."
    ],
    "deliverable": "09-model/ with the schema diagram and the built tables",
    "reviewerChecks": "Grain is stated and consistent; raw is genuinely untouched; the model demonstrably shortens the queries.",
    "resources": [
      {
        "kind": "read",
        "label": "Kimball Group: dimensional modelling techniques",
        "url": "https://www.kimballgroup.com/data-warehouse-business-intelligence-resources/kimball-techniques/"
      },
      {
        "kind": "use",
        "label": "dbt: developer documentation",
        "url": "https://docs.getdbt.com/docs/introduction"
      },
      {
        "kind": "read",
        "label": "PostgreSQL: official documentation",
        "url": "https://www.postgresql.org/docs/current/"
      }
    ],
    "quiz": [
      "What is the grain of your order fact, and what did that rule out?",
      "How do you handle a customer who changed address?",
      "Which question is still awkward against your model?"
    ]
  },
  {
    "day": 10,
    "week": 2,
    "kind": "build",
    "title": "Transformations that are tested and reproducible",
    "mission": "A transformation nobody can re-run is a one-off favour. Today you make yours a pipeline.",
    "points": 12,
    "estimateMinutes": 105,
    "tags": [
      "Pipeline",
      "Hands-on"
    ],
    "objectives": [
      "Express transformations as versioned, re-runnable code",
      "Add tests that fail when the data breaks",
      "Document a model so a stranger can trust it"
    ],
    "concepts": [
      "Transformation as code, in version control, reviewed like any code",
      "Data tests: uniqueness, not null, accepted values, referential integrity",
      "Idempotency — running twice must not double anything",
      "Documenting a column: what it means, not what it is called"
    ],
    "steps": [
      "Rebuild your Day 9 model as versioned transformation code with dependencies declared.",
      "Add data tests to every key column and every relationship.",
      "Break the source data deliberately and confirm the right test fails.",
      "Document every column in the fact table with its meaning and its caveats."
    ],
    "deliverable": "10-pipeline/ with the models, tests and documentation",
    "reviewerChecks": "Tests fail for the intended reason when data is broken; the pipeline is idempotent; documentation explains meaning rather than restating the name.",
    "resources": [
      {
        "kind": "use",
        "label": "dbt: developer documentation",
        "url": "https://docs.getdbt.com/docs/introduction"
      },
      {
        "kind": "read",
        "label": "dbt: best practice guides",
        "url": "https://docs.getdbt.com/best-practices"
      },
      {
        "kind": "read",
        "label": "Pro Git: the complete book, free online",
        "url": "https://git-scm.com/book/en/v2"
      }
    ],
    "quiz": [
      "Which test caught the break, and which one should have but did not?",
      "What happens if your pipeline runs twice?",
      "Which column was hardest to document honestly?"
    ]
  },
  {
    "day": 11,
    "week": 2,
    "kind": "build",
    "title": "Cohorts, retention and the shape of a business",
    "mission": "Averages hide everything that matters. Today you learn the analysis that reveals whether a business is actually working.",
    "points": 12,
    "estimateMinutes": 105,
    "tags": [
      "Analysis",
      "Hands-on"
    ],
    "objectives": [
      "Build a cohort retention table from raw events",
      "Read a retention curve and say what it implies",
      "Distinguish a retention problem from an acquisition problem"
    ],
    "concepts": [
      "Cohorts as the antidote to the aggregate that hides a decline",
      "Retention curves: flattening, decaying, and what each means commercially",
      "Why a growing total can hide a worsening product",
      "Survivorship in your own numbers"
    ],
    "steps": [
      "Build the monthly acquisition cohort retention table for Meridian Retail.",
      "Plot the curves and identify the cohort that behaves differently from the rest.",
      "Determine whether Meridian's overall growth is acquisition or retention driven, with the arithmetic.",
      "Write the finding in five sentences for someone who will not look at the table."
    ],
    "deliverable": "11-analysis/cohort-retention.md with the table, the curves and the finding",
    "reviewerChecks": "The anomalous cohort is identified and explained; the growth attribution has working arithmetic; the five-sentence summary stands alone.",
    "resources": [
      {
        "kind": "read",
        "label": "Seeing Theory: a visual introduction to probability and statistics",
        "url": "https://seeing-theory.brown.edu/"
      },
      {
        "kind": "use",
        "label": "Mode: SQL tutorial",
        "url": "https://mode.com/sql-tutorial/"
      },
      {
        "kind": "read",
        "label": "PostgreSQL: window functions tutorial",
        "url": "https://www.postgresql.org/docs/current/tutorial-window.html"
      }
    ],
    "quiz": [
      "Which cohort is different, and what happened that month?",
      "Is growth acquisition or retention driven, and by how much?",
      "What would the aggregate number have told you instead?"
    ]
  },
  {
    "day": 12,
    "week": 2,
    "kind": "build",
    "title": "Verifying a number you did not calculate",
    "mission": "Increasingly the first draft of an analysis is generated. Today you learn to be the person who catches it when it is wrong.",
    "points": 12,
    "estimateMinutes": 105,
    "tags": [
      "Verification",
      "Hands-on"
    ],
    "objectives": [
      "Verify a result independently rather than re-reading the query",
      "Sanity-check with magnitude, direction and known anchors",
      "Refuse a number you cannot verify"
    ],
    "concepts": [
      "Independent verification: a different method, not the same method twice",
      "Order-of-magnitude checks, and the anchors you should carry in your head",
      "Reconciling to a known total that somebody else owns",
      "Saying 'I cannot verify this' as a professional answer"
    ],
    "steps": [
      "Take five generated analyses of Meridian Retail, one of which is subtly wrong, without being told which.",
      "Verify each by an independent method and record the check you used.",
      "Identify the wrong one and diagnose exactly where it went wrong.",
      "Write the verification checklist you would apply to any number before publishing it."
    ],
    "deliverable": "12-verification/checks.md with the method for each and the diagnosis",
    "reviewerChecks": "Verification uses a genuinely different method; the wrong analysis is found and its error located precisely; the checklist is usable by someone else.",
    "resources": [
      {
        "kind": "use",
        "label": "Anthropic: prompt engineering overview",
        "url": "https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering/overview"
      },
      {
        "kind": "read",
        "label": "Seeing Theory: a visual introduction to probability and statistics",
        "url": "https://seeing-theory.brown.edu/"
      },
      {
        "kind": "read",
        "label": "Great Expectations: data quality documentation",
        "url": "https://docs.greatexpectations.io/docs/"
      }
    ],
    "quiz": [
      "Where exactly did the wrong analysis go wrong?",
      "Which of your checks would have caught it fastest?",
      "Which number could you not verify, and what did you do?"
    ]
  },
  {
    "day": 13,
    "week": 2,
    "kind": "build",
    "title": "The dashboard that answers a question",
    "mission": "Most dashboards are a data dump with a filter. Today you build one that a named person uses to make a named decision.",
    "points": 12,
    "estimateMinutes": 105,
    "tags": [
      "Dashboard",
      "Hands-on"
    ],
    "objectives": [
      "Design for one decision and one audience",
      "Choose charts by the comparison being made",
      "Remove everything that does not change a decision"
    ],
    "concepts": [
      "Start from the decision, not from the data that happens to exist",
      "Chart choice as a function of comparison: over time, between parts, against a distribution",
      "Chart junk, dual axes, truncated axes, and the pie chart question",
      "The refresh nobody needed, and the cost of a dashboard that exists"
    ],
    "steps": [
      "Name the decision, the person and the cadence for the Meridian Retail trading dashboard.",
      "Build it, using the model you built in Week 2 rather than raw tables.",
      "Justify every chart in one sentence: which comparison it supports.",
      "Delete a third of it and show the version that is still sufficient."
    ],
    "deliverable": "13-dashboard/ with both versions and the decision brief",
    "reviewerChecks": "Each chart has a justification tied to a comparison; the reduced version is genuinely sufficient; it runs on the model, not raw tables.",
    "resources": [
      {
        "kind": "read",
        "label": "Financial Times: visual vocabulary for chart choice",
        "url": "https://github.com/Financial-Times/chart-doctor/tree/main/visual-vocabulary"
      },
      {
        "kind": "read",
        "label": "Datawrapper: the blog on chart design",
        "url": "https://blog.datawrapper.de/"
      },
      {
        "kind": "use",
        "label": "Looker Studio: help centre",
        "url": "https://support.google.com/looker-studio/"
      }
    ],
    "quiz": [
      "What decision does this dashboard serve, and who makes it?",
      "What did you delete, and what did you lose?",
      "Which chart were you keeping out of habit?"
    ]
  },
  {
    "day": 14,
    "week": 2,
    "kind": "assessment",
    "title": "Metric defence and the model",
    "mission": "Defend your metric definitions against a marker arguing for different ones, and defend the grain and structure of your model, including one live inject: a new business rule is introduced that your definition does not handle.",
    "points": 40,
    "estimateMinutes": 90,
    "tags": [
      "AI",
      "Assessment"
    ],
    "objectives": [
      "The metric definitions, final versions",
      "The model with its tests and documentation",
      "A written response to the injected business rule",
      "Five-minute unscripted video defence"
    ],
    "concepts": [],
    "steps": [],
    "deliverable": "Submitted artifacts plus your defence recording",
    "reviewerChecks": "Learners who defend their definition by repeating it. The marker is testing whether you can hold a position and change it for a good reason.",
    "resources": [
      {
        "kind": "read",
        "label": "Kimball Group: dimensional modelling techniques",
        "url": "https://www.kimballgroup.com/data-warehouse-business-intelligence-resources/kimball-techniques/"
      },
      {
        "kind": "read",
        "label": "dbt: best practice guides",
        "url": "https://docs.getdbt.com/best-practices"
      }
    ],
    "quiz": [
      "Marketing defines an active customer differently and reports to the same board. What happens?",
      "Your order fact is at line grain. Now finance wants order-level discounts. What breaks?",
      "The new rule makes your number drop 8%. How do you communicate that?"
    ]
  },
  {
    "day": 15,
    "week": 3,
    "kind": "build",
    "title": "Why did the number move?",
    "mission": "The most common question you will ever be asked, and the one most analysts answer badly. Today you learn to decompose instead of guess.",
    "points": 12,
    "estimateMinutes": 105,
    "tags": [
      "Analysis",
      "Hands-on"
    ],
    "objectives": [
      "Decompose a change into its contributing components",
      "Rank explanations by how much they actually account for",
      "Say when the data cannot answer the question"
    ],
    "concepts": [
      "Mix effects: the average moves because the mix moved, not the parts",
      "Additive decomposition — attributing a change to components that sum",
      "Simpson's paradox, and the segment that reverses the story",
      "Knowing when the answer is 'we do not have the data to say'"
    ],
    "steps": [
      "Meridian Retail's average order value fell 6% in one month. Decompose the change by category, channel and customer type.",
      "Rank the contributing factors by how much of the 6% each accounts for.",
      "Test for Simpson's paradox in at least one dimension and report what you find.",
      "Write the explanation in five sentences, with the residual you cannot explain stated."
    ],
    "deliverable": "15-analysis/aov-decomposition.md with the components summing",
    "reviewerChecks": "Components sum to the observed change with a stated residual; the paradox check is real; the unexplained portion is admitted.",
    "resources": [
      {
        "kind": "read",
        "label": "Seeing Theory: a visual introduction to probability and statistics",
        "url": "https://seeing-theory.brown.edu/"
      },
      {
        "kind": "use",
        "label": "Mode: SQL tutorial",
        "url": "https://mode.com/sql-tutorial/"
      },
      {
        "kind": "read",
        "label": "PostgreSQL: window functions tutorial",
        "url": "https://www.postgresql.org/docs/current/tutorial-window.html"
      }
    ],
    "quiz": [
      "What explains the largest share, and how much is left over?",
      "Did any segment move in the opposite direction to the total?",
      "What would you need to close the residual?"
    ]
  },
  {
    "day": 16,
    "week": 3,
    "kind": "build",
    "title": "Correlation, causation and the claim you must not make",
    "mission": "Your job includes refusing to say things. Today you learn exactly which things, and how to say no usefully.",
    "points": 12,
    "estimateMinutes": 105,
    "tags": [
      "Analysis",
      "Hands-on"
    ],
    "objectives": [
      "Distinguish a correlational finding from a causal claim",
      "Identify the confounder behind a tempting conclusion",
      "Propose the design that would settle it"
    ],
    "concepts": [
      "Confounding, selection and reverse causality, with examples from this dataset",
      "Why 'customers who use the app spend more' is almost never what it seems",
      "What would have to be true for the causal claim to hold",
      "Offering the experiment instead of the caveat"
    ],
    "steps": [
      "Take three tempting Meridian Retail correlations and write the causal claim someone will make from each.",
      "For each, identify the most plausible confounder and show it in the data.",
      "Rewrite each finding as an honest correlational statement.",
      "Design the experiment that would actually test one of them."
    ],
    "deliverable": "16-analysis/causal-claims.md with the confounders evidenced",
    "reviewerChecks": "Confounders are demonstrated in the data, not merely hypothesised; rewritten statements are still useful rather than defensively vague.",
    "resources": [
      {
        "kind": "read",
        "label": "Spurious Correlations: why correlation is not causation",
        "url": "https://www.tylervigen.com/spurious-correlations"
      },
      {
        "kind": "read",
        "label": "Seeing Theory: a visual introduction to probability and statistics",
        "url": "https://seeing-theory.brown.edu/"
      },
      {
        "kind": "read",
        "label": "Evan Miller: how not to run an A/B test",
        "url": "https://www.evanmiller.org/how-not-to-run-an-ab-test.html"
      }
    ],
    "quiz": [
      "Which correlation is most likely to be reverse causality?",
      "What does your confounder analysis actually show?",
      "What would the experiment cost, and would you run it?"
    ]
  },
  {
    "day": 17,
    "week": 3,
    "kind": "build",
    "title": "Reading an experiment without fooling yourself",
    "mission": "You will be handed test results and asked what they mean. Today you learn the traps that catch most analysts.",
    "points": 12,
    "estimateMinutes": 105,
    "tags": [
      "Experiments",
      "Hands-on"
    ],
    "objectives": [
      "Determine whether a result is distinguishable from noise",
      "Identify peeking, multiple comparisons and underpowered tests",
      "Recommend ship, do not ship, or keep running, and justify it"
    ],
    "concepts": [
      "Sample size and power before the test, not after",
      "Peeking: why stopping when it looks good invents results",
      "Multiple comparisons, and the segment that always shows something",
      "Practical significance: the effect that is real and too small to matter"
    ],
    "steps": [
      "Read the three seeded Meridian Retail experiments and compute what can be concluded from each.",
      "Identify which one was stopped early and what that does to its result.",
      "Find the one with a segment finding produced by multiple comparisons.",
      "Write a ship or no-ship recommendation for each, with the reason and the risk."
    ],
    "deliverable": "17-experiments/readouts.md with a recommendation for each",
    "reviewerChecks": "The peeking problem is identified and its effect explained; the segment finding is correctly attributed to multiple comparisons; recommendations state the risk of being wrong.",
    "resources": [
      {
        "kind": "read",
        "label": "Evan Miller: how not to run an A/B test",
        "url": "https://www.evanmiller.org/how-not-to-run-an-ab-test.html"
      },
      {
        "kind": "read",
        "label": "Seeing Theory: a visual introduction to probability and statistics",
        "url": "https://seeing-theory.brown.edu/"
      },
      {
        "kind": "use",
        "label": "Google Analytics 4: help centre",
        "url": "https://support.google.com/analytics/answer/9304153"
      }
    ],
    "quiz": [
      "Which result would you refuse to act on, and why?",
      "What was the effect of stopping that test early?",
      "Which finding is real but too small to ship for?"
    ]
  },
  {
    "day": 18,
    "week": 3,
    "kind": "build",
    "title": "Web analytics, attribution and the numbers that never match",
    "mission": "Marketing's number never matches yours. Today you learn why, and how to have the conversation.",
    "points": 12,
    "estimateMinutes": 105,
    "tags": [
      "Analytics",
      "Hands-on"
    ],
    "objectives": [
      "Explain why two systems report different conversions",
      "Choose an attribution model and state what it hides",
      "Reconcile to a defensible single source of truth"
    ],
    "concepts": [
      "Sessions, users and events — what each platform actually counts",
      "Attribution models: last click, first click, position-based, and why none is true",
      "Tracking loss: consent, blockers, and the gap you must quantify",
      "Reconciliation as a written agreement, not a reconciliation each month"
    ],
    "steps": [
      "Compare Meridian Retail's web analytics conversions against orders in the database and quantify the gap.",
      "Attribute one month's revenue by channel under two different models and compare the answers.",
      "Identify which channel's apparent performance changes most between models.",
      "Write the reconciliation note that marketing and finance could both sign."
    ],
    "deliverable": "18-analytics/attribution.md with both models and the reconciliation",
    "reviewerChecks": "The gap is quantified with its causes separated; the channel most sensitive to the model is identified; the note is written for both audiences.",
    "resources": [
      {
        "kind": "use",
        "label": "Google Analytics 4: help centre",
        "url": "https://support.google.com/analytics/answer/9304153"
      },
      {
        "kind": "read",
        "label": "Google Analytics 4: dimensions and metrics reference",
        "url": "https://support.google.com/analytics/answer/9143382"
      },
      {
        "kind": "use",
        "label": "Looker Studio: help centre",
        "url": "https://support.google.com/looker-studio/"
      }
    ],
    "quiz": [
      "How large is the tracking gap, and what causes most of it?",
      "Which channel looks best under last click and worst under first?",
      "Which model would you publish, and what does it hide?"
    ]
  },
  {
    "day": 19,
    "week": 3,
    "kind": "build",
    "title": "Working with a text-to-SQL assistant, safely",
    "mission": "Business users now ask the data questions directly. Today you decide what that assistant may answer and prove it.",
    "points": 12,
    "estimateMinutes": 105,
    "tags": [
      "Ai",
      "AI",
      "Hands-on"
    ],
    "objectives": [
      "Evaluate an assistant's answers against known-correct results",
      "Decide which questions it may answer unsupervised",
      "Identify the access and privacy risks it introduces"
    ],
    "concepts": [
      "Evaluating a text-to-SQL tool: correctness, not plausibility",
      "The questions it is reliably wrong about, and why they cluster",
      "Row-level access: the assistant that helpfully answers about another team's data",
      "Personal data in an answer, and your obligations under the DPDP Act"
    ],
    "steps": [
      "Build a 25-question eval set for Meridian Retail with known-correct answers.",
      "Run the assistant against it and score correctness, not plausibility.",
      "Classify each question type as safe to answer unsupervised, needs review, or never.",
      "Test whether the assistant will return personal data or another team's rows, and document what you find."
    ],
    "deliverable": "19-ai/text-to-sql-eval.md with scores and the answer policy",
    "reviewerChecks": "Scoring is against known-correct answers; the access test is actually attempted; the policy ties each class to a consequence.",
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
        "kind": "use",
        "label": "Anthropic: prompt engineering overview",
        "url": "https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering/overview"
      }
    ],
    "quiz": [
      "What is its accuracy, and which question type is worst?",
      "Did it return anything it should not have?",
      "Which question type would you never let it answer alone?"
    ]
  },
  {
    "day": 20,
    "week": 3,
    "kind": "build",
    "title": "The largest dataset nobody analyses",
    "mission": "Support tickets and reviews are unstructured, which is why they sit unused. Today you turn them into a finding.",
    "points": 12,
    "estimateMinutes": 105,
    "tags": [
      "Text",
      "Hands-on"
    ],
    "objectives": [
      "Classify a large volume of text into a useful taxonomy",
      "Validate machine labels against your own",
      "Turn text analysis into a quantified business argument"
    ],
    "concepts": [
      "Building a taxonomy from the data rather than imposing one",
      "Classification at volume, and sampling to check it",
      "Inter-rater agreement in plain terms: would two people label this the same way?",
      "From themes to a number a business will act on"
    ],
    "steps": [
      "Read 100 Meridian Retail tickets by hand and build a taxonomy from what is actually there.",
      "Classify the full ticket volume with a model against that taxonomy.",
      "Validate on a random sample of 100 against your own labels and report agreement.",
      "Quantify the revenue or cost attached to the largest theme, and write the argument."
    ],
    "deliverable": "20-text/ticket-analysis.md with the taxonomy, agreement rate and argument",
    "reviewerChecks": "Taxonomy is derived from reading, not imposed; agreement is measured on a genuinely random sample; the argument has money attached.",
    "resources": [
      {
        "kind": "use",
        "label": "Anthropic: prompt engineering overview",
        "url": "https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering/overview"
      },
      {
        "kind": "use",
        "label": "pandas: user guide",
        "url": "https://pandas.pydata.org/docs/user_guide/index.html"
      },
      {
        "kind": "read",
        "label": "Seeing Theory: a visual introduction to probability and statistics",
        "url": "https://seeing-theory.brown.edu/"
      }
    ],
    "quiz": [
      "What is your agreement rate, and where do you and the model disagree?",
      "What is the largest theme worth, in rupees?",
      "Which theme did the taxonomy miss until you read more?"
    ]
  },
  {
    "day": 21,
    "week": 3,
    "kind": "assessment",
    "title": "The analysis under challenge",
    "mission": "Given an unseen question about Meridian Retail and 60 minutes, produce a finding with a recommendation, then defend it against three challenge questions including one that supplies a contradicting number.",
    "points": 40,
    "estimateMinutes": 90,
    "tags": [
      "Assessment"
    ],
    "objectives": [
      "The analysis, with the queries and the verification for each number",
      "A one-page finding with a recommendation and its risk",
      "Your response to the contradicting number, written during the session",
      "Five-minute unscripted video defence"
    ],
    "concepts": [],
    "steps": [],
    "deliverable": "Submitted artifacts plus your defence recording",
    "reviewerChecks": "Analysts who defend a number instead of investigating a discrepancy. The right first move is almost never to restate your working.",
    "resources": [
      {
        "kind": "read",
        "label": "Seeing Theory: a visual introduction to probability and statistics",
        "url": "https://seeing-theory.brown.edu/"
      },
      {
        "kind": "read",
        "label": "Great Expectations: data quality documentation",
        "url": "https://docs.greatexpectations.io/docs/"
      }
    ],
    "quiz": [
      "Finance says the figure is 12% lower. Which of you is wrong, and how would you find out?",
      "Your recommendation assumes the trend continues. What if it is seasonal?",
      "What is the strongest argument against your own conclusion?"
    ]
  },
  {
    "day": 22,
    "week": 4,
    "kind": "build",
    "title": "The finding, written so it is read",
    "mission": "An analysis nobody reads has not happened. Today you learn the writing discipline that gets a finding acted on.",
    "points": 12,
    "estimateMinutes": 105,
    "tags": [
      "Communication",
      "Hands-on"
    ],
    "objectives": [
      "Lead with the finding, not the method",
      "Write for a reader who will read only the first paragraph",
      "State uncertainty without undermining the recommendation"
    ],
    "concepts": [
      "Conclusion-first writing, and why analysts resist it",
      "The executive summary as the whole document for most readers",
      "Quantified uncertainty beats hedged language",
      "What to cut: the method section nobody needed"
    ],
    "steps": [
      "Write the full Meridian Retail cohort finding as a two-page memo, conclusion first.",
      "Write the 100-word version, then the one-sentence version, and check they agree.",
      "State the uncertainty in each with a number rather than a qualifier.",
      "Have a non-analyst read it and tell you the finding back."
    ],
    "deliverable": "22-communication/finding-memo.md with all three lengths",
    "reviewerChecks": "The three versions agree; uncertainty is quantified rather than hedged; the non-analyst restated the finding correctly.",
    "resources": [
      {
        "kind": "read",
        "label": "Plain Language: federal plain language guidelines",
        "url": "https://www.plainlanguage.gov/guidelines/"
      },
      {
        "kind": "read",
        "label": "Edward Tufte: writings on analytical design",
        "url": "https://www.edwardtufte.com/tufte/books_vdqi"
      },
      {
        "kind": "read",
        "label": "Datawrapper: the blog on chart design",
        "url": "https://blog.datawrapper.de/"
      }
    ],
    "quiz": [
      "What did your non-analyst reader get wrong?",
      "Which hedge did you replace with a number?",
      "What did you cut from the two-page version?"
    ]
  },
  {
    "day": 23,
    "week": 4,
    "kind": "build",
    "title": "The recommendation, and owning it",
    "mission": "Findings inform. Recommendations commit. Today you cross that line, which is what the job actually is.",
    "points": 12,
    "estimateMinutes": 105,
    "tags": [
      "Communication",
      "Hands-on"
    ],
    "objectives": [
      "Turn a finding into a recommendation with a cost and a risk",
      "Present options rather than a single preference",
      "Say what would make you change your mind"
    ],
    "concepts": [
      "The difference between what is true and what should be done",
      "Options with trade-offs rather than one answer, and a stated preference",
      "Quantifying the downside of being wrong",
      "Pre-committing to the evidence that would reverse the decision"
    ],
    "steps": [
      "Turn your strongest Meridian Retail finding into three options with costs and expected effects.",
      "State your preference and the reasoning behind it.",
      "Quantify what it costs if you are wrong about the main assumption.",
      "Write the measurement plan: what you would watch, and what would make you reverse."
    ],
    "deliverable": "23-communication/recommendation.md with options, preference and reversal criteria",
    "reviewerChecks": "Options are genuinely distinct; the cost of being wrong is quantified; the reversal criteria are specific and measurable.",
    "resources": [
      {
        "kind": "read",
        "label": "Evan Miller: how not to run an A/B test",
        "url": "https://www.evanmiller.org/how-not-to-run-an-ab-test.html"
      },
      {
        "kind": "read",
        "label": "Plain Language: federal plain language guidelines",
        "url": "https://www.plainlanguage.gov/guidelines/"
      },
      {
        "kind": "read",
        "label": "Google: Site Reliability Engineering, the free book",
        "url": "https://sre.google/books/"
      }
    ],
    "quiz": [
      "What does it cost if your main assumption is wrong?",
      "What would make you reverse this in six weeks?",
      "Which option would you choose if the budget halved?"
    ]
  },
  {
    "day": 24,
    "week": 4,
    "kind": "build",
    "title": "Charts that do not mislead",
    "mission": "It is easy to mislead with a chart by accident. Today you learn where it happens and audit your own work.",
    "points": 12,
    "estimateMinutes": 105,
    "tags": [
      "Visualisation",
      "Hands-on"
    ],
    "objectives": [
      "Choose an encoding appropriate to the comparison",
      "Identify misleading axes, scales and aggregations",
      "Redesign a chart that overstates its own finding"
    ],
    "concepts": [
      "Position, length, area, colour — the accuracy ranking of visual encodings",
      "Truncated axes, dual axes and the area chart that exaggerates",
      "Colour for the eight percent who will not see it as you do",
      "Showing the distribution behind the average"
    ],
    "steps": [
      "Audit every chart you have produced in this cohort for misleading encoding.",
      "Rebuild the three worst, and write what was misleading about each.",
      "Take one chart and produce a deliberately misleading version, then the honest one.",
      "Check every chart for colour accessibility and fix what fails."
    ],
    "deliverable": "24-visualisation/chart-audit.md with before and after",
    "reviewerChecks": "The misleading version is genuinely persuasive; fixes address encoding rather than styling; colour accessibility is tested rather than assumed.",
    "resources": [
      {
        "kind": "read",
        "label": "Financial Times: visual vocabulary for chart choice",
        "url": "https://github.com/Financial-Times/chart-doctor/tree/main/visual-vocabulary"
      },
      {
        "kind": "read",
        "label": "Datawrapper: the blog on chart design",
        "url": "https://blog.datawrapper.de/"
      },
      {
        "kind": "read",
        "label": "Edward Tufte: writings on analytical design",
        "url": "https://www.edwardtufte.com/tufte/books_vdqi"
      }
    ],
    "quiz": [
      "Which of your own charts was misleading, and did you notice at the time?",
      "What made the deliberately misleading version persuasive?",
      "Which chart still hides its distribution?"
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
      "AI",
      "Hands-on"
    ],
    "objectives": [
      "Publish the portfolio as a readable site",
      "Write case studies that lead with the finding",
      "Make the evidence navigable in under two minutes"
    ],
    "concepts": [
      "Why dashboards make bad portfolio pieces and written analyses make good ones",
      "The case study shape: question, what you found, what you recommended, what happened",
      "Linking to the query and the model, not describing them",
      "Writing for the reader who gives you ninety seconds"
    ],
    "steps": [
      "Publish the portfolio with GitHub Pages from your existing repo.",
      "Write four case studies: the data-quality finding, the metric definition, the decomposition, the recommendation.",
      "Link each number to the query that produced it.",
      "Have someone outside the cohort try to find your recommendation in under a minute."
    ],
    "deliverable": "Published site URL committed to the repo README",
    "reviewerChecks": "Site is live; every headline number links to its query; the outside reader found the recommendation unaided.",
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
      "Which case study has the weakest evidence?"
    ]
  },
  {
    "day": 26,
    "week": 4,
    "kind": "build",
    "title": "The analyst interview, and what it is actually testing",
    "mission": "Analyst interviews are case interviews with a SQL screen attached. Today you practise both halves.",
    "points": 12,
    "estimateMinutes": 105,
    "tags": [
      "Interview",
      "Hands-on"
    ],
    "objectives": [
      "Solve a SQL problem out loud under time pressure",
      "Structure a business case answer before computing anything",
      "Use your portfolio as evidence without reciting it"
    ],
    "concepts": [
      "The SQL screen: what is actually being tested, and the three constructs that appear most",
      "Case questions: clarify, structure, hypothesise, then analyse",
      "Saying 'it depends on how we define that' as the correct opening",
      "Walking an artifact in two minutes, finding first"
    ],
    "steps": [
      "Work three timed SQL problems out loud, recorded, narrating your approach.",
      "Work two case questions, structuring before calculating.",
      "Record a two-minute walkthrough of your strongest analysis.",
      "Write answers to the ten most common analyst questions, each grounded in your own work."
    ],
    "deliverable": "26-interview/answer-bank.md and the recordings",
    "reviewerChecks": "SQL is narrated rather than silent; cases are structured before numbers appear; the walkthrough leads with the finding.",
    "resources": [
      {
        "kind": "read",
        "label": "MindTools: the STAR interview technique",
        "url": "https://www.mindtools.com/a2bgu1v/star-interview-method"
      },
      {
        "kind": "use",
        "label": "Mode: SQL tutorial",
        "url": "https://mode.com/sql-tutorial/"
      },
      {
        "kind": "use",
        "label": "LinkedIn: profile best practices for job seekers",
        "url": "https://www.linkedin.com/help/linkedin/answer/a554351"
      }
    ],
    "quiz": [
      "Where did you go quiet, and what will you say instead?",
      "Which case did you start calculating too early?",
      "Which artifact do you lead with, and why that one?"
    ]
  },
  {
    "day": 27,
    "week": 4,
    "kind": "build",
    "title": "The stakeholder who wants a different answer",
    "mission": "Sooner or later someone will want your number to say something else. Today you practise that conversation.",
    "points": 12,
    "estimateMinutes": 105,
    "tags": [
      "Judgement",
      "Hands-on"
    ],
    "objectives": [
      "Hold a finding under commercial pressure",
      "Separate a legitimate methodological challenge from a push to change the answer",
      "Escalate honestly when the pressure does not stop"
    ],
    "concepts": [
      "Legitimate challenge versus pressure: how to tell them apart",
      "Re-cutting data on request, and where that becomes dishonest",
      "The caveat that gets removed before the board sees it",
      "What to do when the recommendation is overruled, and recording it"
    ],
    "steps": [
      "Work the three seeded pressure scenarios in writing, in full, including the follow-up.",
      "For one, concede: the challenge was right and your analysis changes.",
      "For another, hold, and write the version you would send to their manager.",
      "Write the note you would keep for yourself when overruled."
    ],
    "deliverable": "27-judgement/stakeholder-pressure.md with all three scenarios",
    "reviewerChecks": "The conceded case is genuinely conceded; the held case argues from method rather than pride; the record is factual rather than aggrieved.",
    "resources": [
      {
        "kind": "read",
        "label": "Plain Language: federal plain language guidelines",
        "url": "https://www.plainlanguage.gov/guidelines/"
      },
      {
        "kind": "read",
        "label": "Seeing Theory: a visual introduction to probability and statistics",
        "url": "https://seeing-theory.brown.edu/"
      },
      {
        "kind": "read",
        "label": "Evan Miller: how not to run an A/B test",
        "url": "https://www.evanmiller.org/how-not-to-run-an-ab-test.html"
      }
    ],
    "quiz": [
      "Which challenge was legitimate, and how did you tell?",
      "Where were you tempted to re-cut until it looked better?",
      "What do you do when the caveat is removed without you?"
    ]
  },
  {
    "day": 28,
    "week": 4,
    "kind": "assessment",
    "title": "The board recommendation",
    "mission": "Present a Meridian Retail recommendation to a panel: what you found, what you propose, what it costs, and what would make you reverse it. Then defend it against a marker playing a sceptical commercial director.",
    "points": 40,
    "estimateMinutes": 90,
    "tags": [
      "Assessment"
    ],
    "objectives": [
      "The published portfolio",
      "A ten-slide recommendation with the analysis behind it",
      "Your metric definitions and data-quality caveats",
      "Live panel defence, fifteen minutes"
    ],
    "concepts": [],
    "steps": [],
    "deliverable": "Submitted artifacts plus your defence recording",
    "reviewerChecks": "Candidates who present the analysis and have no recommendation. The panel is buying judgement, not a chart pack.",
    "resources": [
      {
        "kind": "read",
        "label": "Edward Tufte: writings on analytical design",
        "url": "https://www.edwardtufte.com/tufte/books_vdqi"
      },
      {
        "kind": "read",
        "label": "Plain Language: federal plain language guidelines",
        "url": "https://www.plainlanguage.gov/guidelines/"
      }
    ],
    "quiz": [
      "Your finding rests on one month of data with a tracking outage in it. Convince me.",
      "The head of marketing has a number that contradicts yours. What do you do before this meeting?",
      "If we do nothing, what happens?"
    ]
  },
  {
    "day": 29,
    "week": 4,
    "kind": "interview",
    "title": "Mock interview: technical and live",
    "mission": "45 minutes. Two SQL problems on an unfamiliar schema and one data-quality challenge, all narrated.",
    "points": 50,
    "estimateMinutes": 45,
    "tags": [
      "Mock interview"
    ],
    "objectives": [
      "Query construction, verification instinct, and handling an ambiguous question"
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
    "title": "Mock interview: case and behavioural",
    "mission": "45 minutes. One business case, a portfolio walkthrough, and one stakeholder-pressure scenario.",
    "points": 50,
    "estimateMinutes": 45,
    "tags": [
      "Mock interview"
    ],
    "objectives": [
      "Structure, judgement, communication, and whether the evidence survives questioning"
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

export const reportingAnalystModules: CurriculumModule[] = [
  {
    "week": 1,
    "name": "Data foundations, and the new stack",
    "days": "Days 1–7",
    "summary": "You can audit data quality, write real SQL, and direct a model against a schema"
  },
  {
    "week": 2,
    "name": "Modelling and metrics that hold",
    "days": "Days 8–14",
    "summary": "You can define a metric that survives challenge and build the model behind it"
  },
  {
    "week": 3,
    "name": "Analysis, causality and machine output",
    "days": "Days 15–21",
    "summary": "You can read an experiment, refuse a bad causal claim, and verify a generated number"
  },
  {
    "week": 4,
    "name": "Communication, recommendation and interview readiness",
    "days": "Days 22–30",
    "summary": "You can take a finding to a decision-maker and defend it"
  }
];
