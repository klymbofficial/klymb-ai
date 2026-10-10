/**
 * The ai-product-manager curriculum, day by day.
 *
 * Converted from the track's .docx programme document (~/Downloads/30_Day_AI_Product_Management_Cohort.docx,
 * curriculum revision 9 October 2026), so the app and the document say the same thing. Re-convert rather
 * than hand-edit when the document changes. Readings are the document's R01–R26 list; re-check links annually.
 */
import type { CurriculumDay, CurriculumModule } from "@/types/curriculum";

export const aiPmCurriculum: CurriculumDay[] = [
  {
    "day": 1,
    "week": 1,
    "kind": "build",
    "title": "Diagnose competence and choose an opportunity",
    "mission": "The user job, non-AI comparator, evidence strength and an investment reversal condition.",
    "points": 12,
    "estimateMinutes": 120,
    "tags": [
      "AI",
      "Hands-on"
    ],
    "objectives": [
      "Select a bounded opportunity and a falsifiable reason AI could help.",
      "Produce placement evidence and the opportunity brief."
    ],
    "concepts": [
      "The user job, non-AI comparator, evidence strength and an investment reversal condition.",
      "The failure to expect: A sponsor presents an impressive saving with incomplete supporting records."
    ],
    "steps": [
      "Transition frames one frequent support job and its baseline.",
      "Advanced compares two opportunities with different buyers and risk, then allocates a fixed discovery budget. Start Artifact 1, verify the supplied offline command runs and schedule the three evidence sessions.",
      "Break it: A sponsor presents an impressive saving with incomplete supporting records.",
      "Debug: Request the denominator, workflow effort and data origin; record at least two explanations and the missing evidence.",
      "Decide: Select a bounded opportunity and a falsifiable reason AI could help.",
      "Defend: Produce placement evidence and the opportunity brief."
    ],
    "deliverable": "Artifact 1 and diagnostic record; version the decision and its evidence.",
    "reviewerChecks": "Transition passes when the baseline and exclusions are testable. Advanced also identifies the rejected investment and evidence that would reverse allocation.",
    "resources": [
      {
        "kind": "use",
        "label": "Course lab pack: Meridian Support Copilot (offline harness, data and briefs)",
        "url": "https://www.klymb.ai/downloads/klymb-ai-pm-labs.zip"
      },
      {
        "kind": "read",
        "label": "R01: Introduction to Machine Learning Problem Framing",
        "url": "https://developers.google.com/machine-learning/problem-framing"
      },
      {
        "kind": "read",
        "label": "R22: Building Trusted AI Products with the PAIR Guidebook",
        "url": "https://codelabs.developers.google.com/codelabs/pair-guidebook"
      }
    ],
    "quiz": [
      "Paste the link to today's work in your portfolio repo.",
      "Today's decision: Select a bounded opportunity and a falsifiable reason AI could help. Give your answer and the evidence behind it.",
      "Which explanation for today's failure did you rule out, and what evidence ruled it out?"
    ]
  },
  {
    "day": 2,
    "week": 1,
    "kind": "build",
    "title": "Discover the job and buyer constraint",
    "mission": "Observation, reported pain, demand and payment are different evidence.",
    "points": 12,
    "estimateMinutes": 120,
    "tags": [
      "AI",
      "Hands-on"
    ],
    "objectives": [
      "Keep, narrow or replace the initial job hypothesis.",
      "Update Artifact 1."
    ],
    "concepts": [
      "Observation, reported pain, demand and payment are different evidence.",
      "The failure to expect: Stakeholders agree AI sounds useful but disagree on the job worth solving."
    ],
    "steps": [
      "Transition maps the user's present workflow and alternative tools.",
      "Advanced contrasts user benefit with the buyer's budget, procurement and operating incentives. Choose and permission-check the workplace or supplied transfer case.",
      "Break it: Stakeholders agree AI sounds useful but disagree on the job worth solving.",
      "Debug: Trace each claim to a source, affected task and existing alternative; seek disconfirming evidence.",
      "Decide: Keep, narrow or replace the initial job hypothesis.",
      "Defend: Update Artifact 1."
    ],
    "deliverable": "Artifact 1 and transfer-case permission record; version the decision and its evidence.",
    "reviewerChecks": "Transition passes with dated evidence and an unresolved assumption. Advanced also states whose economics determine adoption and why expressed enthusiasm does not establish willingness to pay.",
    "resources": [
      {
        "kind": "read",
        "label": "R22: Building Trusted AI Products with the PAIR Guidebook",
        "url": "https://codelabs.developers.google.com/codelabs/pair-guidebook"
      }
    ],
    "quiz": [
      "Paste the link to today's work in your portfolio repo.",
      "Today's decision: Keep, narrow or replace the initial job hypothesis. Give your answer and the evidence behind it.",
      "Which explanation for today's failure did you rule out, and what evidence ruled it out?"
    ]
  },
  {
    "day": 3,
    "week": 1,
    "kind": "build",
    "title": "Specify an auditable product contract",
    "mission": "Instructions, output schemas, evidence contracts and program-enforced limits.",
    "points": 12,
    "estimateMinutes": 120,
    "tags": [
      "AI",
      "Hands-on"
    ],
    "objectives": [
      "Which semantic requirement must be enforced before a draft is useful?",
      "Submit the contract and comparison."
    ],
    "concepts": [
      "Instructions, output schemas, evidence contracts and program-enforced limits.",
      "The failure to expect: A structurally valid response contains a consequential unsupported commitment."
    ],
    "steps": [
      "Transition creates a draft-response contract with sources, missing facts and escalation.",
      "Advanced compares two contracts on conflicting-policy and unsupported-commitment cases, including version and audit requirements. Start Artifact 2.",
      "Break it: A structurally valid response contains a consequential unsupported commitment.",
      "Debug: Inspect the prompt, evidence, response and validator separately; test competing explanations.",
      "Decide: Which semantic requirement must be enforced before a draft is useful?",
      "Defend: Submit the contract and comparison."
    ],
    "deliverable": "Artifact 2; version the decision and its evidence.",
    "reviewerChecks": "Transition passes when an unseen unsupported claim is withheld or clearly escalated. Advanced also demonstrates that a targeted fix preserves valid useful drafts and distinguishes schema validity from product correctness.",
    "resources": [
      {
        "kind": "read",
        "label": "R06: Structured outputs",
        "url": "https://platform.claude.com/docs/en/build-with-claude/structured-outputs"
      }
    ],
    "quiz": [
      "Paste the link to today's work in your portfolio repo.",
      "Today's decision: Which semantic requirement must be enforced before a draft is useful? Give your answer and the evidence behind it.",
      "Which explanation for today's failure did you rule out, and what evidence ruled it out?"
    ]
  },
  {
    "day": 4,
    "week": 1,
    "kind": "build",
    "title": "Design context and authority",
    "mission": "Context relevance, freshness, authority, permission, compression and token budgets.",
    "points": 12,
    "estimateMinutes": 105,
    "tags": [
      "AI",
      "Hands-on"
    ],
    "objectives": [
      "Choose inclusion, precedence and fallback rules.",
      "Add the context contract to Artifact 2."
    ],
    "concepts": [
      "Context relevance, freshness, authority, permission, compression and token budgets.",
      "The failure to expect: Similar requests receive different recommendations even though relevant evidence appears available."
    ],
    "steps": [
      "Transition constructs a minimum sufficient context packet.",
      "Advanced compares context construction under conflicting versions and a reduced token allowance, transferring the rule to the second case.",
      "Break it: Similar requests receive different recommendations even though relevant evidence appears available.",
      "Debug: Inspect what reached the model, authority dates and selection steps; do not infer the root cause from retrieval scores alone.",
      "Decide: Choose inclusion, precedence and fallback rules.",
      "Defend: Add the context contract to Artifact 2."
    ],
    "deliverable": "Artifact 2; version the decision and its evidence.",
    "reviewerChecks": "Transition passes with traceable sources and preserved material conditions. Advanced also quantifies a quality/cost trade-off and identifies which omission would invalidate the recommendation.",
    "resources": [
      {
        "kind": "read",
        "label": "R07: Effective context engineering for AI agents",
        "url": "https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents"
      }
    ],
    "quiz": [
      "Paste the link to today's work in your portfolio repo.",
      "Today's decision: Choose inclusion, precedence and fallback rules. Give your answer and the evidence behind it.",
      "Which explanation for today's failure did you rule out, and what evidence ruled it out?"
    ]
  },
  {
    "day": 5,
    "week": 1,
    "kind": "build",
    "title": "Select a model against product constraints",
    "mission": "Eligibility precedes preference; quality, privacy, availability, latency and cost interact.",
    "points": 12,
    "estimateMinutes": 120,
    "tags": [
      "AI",
      "Hands-on"
    ],
    "objectives": [
      "Select, route, restrict or reject the model configuration.",
      "Record the comparison in Artifact 2."
    ],
    "concepts": [
      "Eligibility precedes preference; quality, privacy, availability, latency and cost interact.",
      "The failure to expect: The configuration preferred in aggregate performs poorly on an important task slice."
    ],
    "steps": [
      "Transition blinds two eligible configurations on the same task pack.",
      "Advanced designs an escalation rule under a changed task mix and a spending limit, with a procurement constraint treated as an eligibility gate.",
      "Break it: The configuration preferred in aggregate performs poorly on an important task slice.",
      "Debug: Review severities, exposure, denominators and traces; distinguish model behavior from context differences.",
      "Decide: Select, route, restrict or reject the model configuration.",
      "Defend: Record the comparison in Artifact 2."
    ],
    "deliverable": "Artifact 2; version the decision and its evidence.",
    "reviewerChecks": "Transition passes with common inputs and a justified choice. Advanced also states uncertainty, the routing failure condition and which constraint cannot be averaged into a quality score.",
    "resources": [
      {
        "kind": "read",
        "label": "R08: Models overview",
        "url": "https://platform.claude.com/docs/en/models/overview"
      },
      {
        "kind": "read",
        "label": "R10: Claude API pricing",
        "url": "https://platform.claude.com/docs/en/about-claude/pricing"
      }
    ],
    "quiz": [
      "Paste the link to today's work in your portfolio repo.",
      "Today's decision: Select, route, restrict or reject the model configuration. Give your answer and the evidence behind it.",
      "Which explanation for today's failure did you rule out, and what evidence ruled it out?"
    ]
  },
  {
    "day": 6,
    "week": 1,
    "kind": "build",
    "title": "Validate the first prototype and repair evidence",
    "mission": "A useful draft must fit actual work and remain inspectable.",
    "points": 12,
    "estimateMinutes": 90,
    "tags": [
      "AI",
      "Hands-on"
    ],
    "objectives": [
      "What should be removed or revised before broader testing?",
      "Update Artifacts 1 and 2."
    ],
    "concepts": [
      "A useful draft must fit actual work and remain inspectable.",
      "The failure to expect: A promising demo encounters a task the intended user cannot complete comfortably."
    ],
    "steps": [
      "Transition configures the narrow prototype and resolves the main reviewer concern.",
      "Advanced tests the prototype against the second user's workflow and revises an adoption or value assumption. Compare a non-AI baseline.",
      "Break it: A promising demo encounters a task the intended user cannot complete comfortably.",
      "Debug: Inspect task steps, dependencies and user interpretation, keeping capability and usability hypotheses separate.",
      "Decide: What should be removed or revised before broader testing?",
      "Defend: Update Artifacts 1 and 2."
    ],
    "deliverable": "Artifacts 1 and 2; version the decision and its evidence.",
    "reviewerChecks": "Transition passes with a replayable bounded task and correction. Advanced also identifies an adoption barrier and its evidence, rather than claiming demand from successful generation.",
    "resources": [],
    "quiz": [
      "Paste the link to today's work in your portfolio repo.",
      "Today's decision: What should be removed or revised before broader testing? Give your answer and the evidence behind it.",
      "Which explanation for today's failure did you rule out, and what evidence ruled it out?"
    ]
  },
  {
    "day": 7,
    "week": 1,
    "kind": "assessment",
    "title": "Checkpoint one opportunity and baseline",
    "mission": "A scope recommendation depends on need, feasibility and authorization.",
    "points": 40,
    "estimateMinutes": 90,
    "tags": [
      "Checkpoint"
    ],
    "objectives": [
      "Continue, narrow, stop or remediate.",
      "Present the recommendation, strongest rejected alternative and evidence that could change the decision."
    ],
    "concepts": [
      "A scope recommendation depends on need, feasibility and authorization.",
      "The failure to expect: Leadership requests greater automation after viewing the prototype."
    ],
    "steps": [
      "Transition handles an unseen ticket category and updates the opportunity.",
      "Advanced receives a buyer objection and competing roadmap request in the second case.",
      "Break it: Leadership requests greater automation after viewing the prototype.",
      "Debug: Identify missing evidence and separate product usefulness from authority to act.",
      "Decide: Continue, narrow, stop or remediate.",
      "Defend: Present the recommendation, strongest rejected alternative and evidence that could change the decision."
    ],
    "deliverable": "Artifacts 1 and 2 plus checkpoint score; version the decision and its evidence.",
    "reviewerChecks": "Transition passes with a testable non-AI comparator, supported scope and appropriate restrictions. Advanced also passes an investment allocation and buyer-value defence. Review the course rubric; no diagnostic score substitutes for this checkpoint. Record evidence limitations and the next corrective case.",
    "resources": [],
    "quiz": [
      "Paste the link to today's work in your portfolio repo.",
      "Today's decision: Continue, narrow, stop or remediate. Give your answer and the evidence behind it.",
      "Which explanation for today's failure did you rule out, and what evidence ruled it out?"
    ]
  },
  {
    "day": 8,
    "week": 2,
    "kind": "build",
    "title": "Audit sources and define procurement gates",
    "mission": "Ownership, lineage, parsing, access, retention and contractual use rights.",
    "points": 12,
    "estimateMinutes": 120,
    "tags": [
      "AI",
      "Hands-on"
    ],
    "objectives": [
      "Admit, restrict or exclude the source and choose a procurement test.",
      "Add source and vendor requirements to Artifact 2."
    ],
    "concepts": [
      "Ownership, lineage, parsing, access, retention and contractual use rights.",
      "The failure to expect: A source is useful in one task but questionable for another group of users."
    ],
    "steps": [
      "Transition audits the synthetic corpus and documents acceptance rules.",
      "Advanced compares a managed ingestion option with a custom path, examining rights, deletion, export and operating ownership.",
      "Break it: A source is useful in one task but questionable for another group of users.",
      "Debug: Examine source origin, metadata, permitted use and the request identity; test alternative explanations.",
      "Decide: Admit, restrict or exclude the source and choose a procurement test.",
      "Defend: Add source and vendor requirements to Artifact 2."
    ],
    "deliverable": "Artifact 2; version the decision and its evidence.",
    "reviewerChecks": "Transition passes with traceable eligibility and denial. Advanced also proposes an enforceable exit requirement and specifies evidence needed before contracting.",
    "resources": [
      {
        "kind": "read",
        "label": "R18: Retrieval Augmented Generation RAG",
        "url": "https://www.deeplearning.ai/alpha/courses/retrieval-augmented-generation-rag"
      }
    ],
    "quiz": [
      "Paste the link to today's work in your portfolio repo.",
      "Today's decision: Admit, restrict or exclude the source and choose a procurement test. Give your answer and the evidence behind it.",
      "Which explanation for today's failure did you rule out, and what evidence ruled it out?"
    ]
  },
  {
    "day": 9,
    "week": 2,
    "kind": "build",
    "title": "Test ingestion and chunking",
    "mission": "Parsing, tables, exceptions, versions and chunk boundaries can change evidence.",
    "points": 12,
    "estimateMinutes": 120,
    "tags": [
      "AI",
      "Hands-on"
    ],
    "objectives": [
      "Change processing, chunking or task scope only where evidence supports it.",
      "Add the ingestion experiment to Artifacts 2 and 3."
    ],
    "concepts": [
      "Parsing, tables, exceptions, versions and chunk boundaries can change evidence.",
      "The failure to expect: A response fails on a document that looks straightforward to a human reader."
    ],
    "steps": [
      "Transition compares two prepared chunk configurations.",
      "Advanced requests a changed-layout trace from the assessor and defines an update/delete acceptance test without increasing hidden-test exposure. The core harness has a fixed corpus; do not report unimplemented document-lifecycle tests as executed.",
      "Break it: A response fails on a document that looks straightforward to a human reader.",
      "Debug: Inspect original, parsed text, chunks, metadata and retrieved passages in order; isolate the earliest divergence.",
      "Decide: Change processing, chunking or task scope only where evidence supports it.",
      "Defend: Add the ingestion experiment to Artifacts 2 and 3."
    ],
    "deliverable": "Artifacts 2 and 3; version the decision and its evidence.",
    "reviewerChecks": "Transition passes on unseen document evidence and source/version links. Advanced also shows a regression check and an operational acceptance rule for future document changes.",
    "resources": [
      {
        "kind": "read",
        "label": "R18: Retrieval Augmented Generation RAG",
        "url": "https://www.deeplearning.ai/alpha/courses/retrieval-augmented-generation-rag"
      }
    ],
    "quiz": [
      "Paste the link to today's work in your portfolio repo.",
      "Today's decision: Change processing, chunking or task scope only where evidence supports it. Give your answer and the evidence behind it.",
      "Which explanation for today's failure did you rule out, and what evidence ruled it out?"
    ]
  },
  {
    "day": 10,
    "week": 2,
    "kind": "build",
    "title": "Compare retrieval and outcome value",
    "mission": "Dense, sparse, hybrid and reranked retrieval have distinct failure and cost profiles.",
    "points": 12,
    "estimateMinutes": 120,
    "tags": [
      "AI",
      "Hands-on"
    ],
    "objectives": [
      "Select a configuration or retain the simpler baseline.",
      "Produce the retrieval decision in Artifacts 2 and 3."
    ],
    "concepts": [
      "Dense, sparse, hybrid and reranked retrieval have distinct failure and cost profiles.",
      "The failure to expect: A retrieval score improves while some important answers become less useful."
    ],
    "steps": [
      "Transition compares supplied retrieval configurations on frozen queries.",
      "Advanced compares product-code, unanswerable and access-sensitive slices, then decides whether the replay improvement earns its assumed cost. Dense and reranked alternatives require a separately specified benchmark; recorded latency is not production inference performance.",
      "Break it: A retrieval score improves while some important answers become less useful.",
      "Debug: Inspect labels, ranks, context assembly and answer behavior; separate retrieval quality from end-task quality.",
      "Decide: Select a configuration or retain the simpler baseline.",
      "Defend: Produce the retrieval decision in Artifacts 2 and 3."
    ],
    "deliverable": "Artifacts 2 and 3; version the decision and its evidence.",
    "reviewerChecks": "Transition passes with held-out relevance and access checks. Advanced also defends a rejected upgrade and identifies the business condition under which that rejection changes.",
    "resources": [
      {
        "kind": "read",
        "label": "R18: Retrieval Augmented Generation RAG",
        "url": "https://www.deeplearning.ai/alpha/courses/retrieval-augmented-generation-rag"
      }
    ],
    "quiz": [
      "Paste the link to today's work in your portfolio repo.",
      "Today's decision: Select a configuration or retain the simpler baseline. Give your answer and the evidence behind it.",
      "Which explanation for today's failure did you rule out, and what evidence ruled it out?"
    ]
  },
  {
    "day": 11,
    "week": 2,
    "kind": "build",
    "title": "Test UX and buying assumptions",
    "mission": "Preview, source inspection, edit, recovery and responsibility must fit the job.",
    "points": 12,
    "estimateMinutes": 105,
    "tags": [
      "AI",
      "Hands-on"
    ],
    "objectives": [
      "Revise the interaction or narrow the use case.",
      "Update Artifacts 1 and 2."
    ],
    "concepts": [
      "Preview, source inspection, edit, recovery and responsibility must fit the job.",
      "The failure to expect: Participants interpret the interface differently from the product team's intent."
    ],
    "steps": [
      "Transition tests ambiguous, denied and unavailable-source states with a relevant participant or a clearly labeled formative role-play.",
      "Advanced also tests workflow switching, review burden and the buyer's value hypothesis.",
      "Break it: Participants interpret the interface differently from the product team's intent.",
      "Debug: Record observed behavior and comprehension, then distinguish a capability defect from an interaction problem.",
      "Decide: Revise the interaction or narrow the use case.",
      "Defend: Update Artifacts 1 and 2."
    ],
    "deliverable": "Artifacts 1 and 2; version the decision and its evidence.",
    "reviewerChecks": "Transition passes with observed findings and inspectable recovery. Advanced also revises the commercial hypothesis using buyer evidence, explicitly preserving uncertainty about payment.",
    "resources": [
      {
        "kind": "read",
        "label": "R23: Human AI Experience Toolkit",
        "url": "https://www.microsoft.com/en-us/haxtoolkit/"
      }
    ],
    "quiz": [
      "Paste the link to today's work in your portfolio repo.",
      "Today's decision: Revise the interaction or narrow the use case. Give your answer and the evidence behind it.",
      "Which explanation for today's failure did you rule out, and what evidence ruled it out?"
    ]
  },
  {
    "day": 12,
    "week": 2,
    "kind": "build",
    "title": "Compare workflow and agent value",
    "mission": "Typed tools, state, deterministic control, permissions and side effects.",
    "points": 12,
    "estimateMinutes": 120,
    "tags": [
      "AI",
      "Hands-on"
    ],
    "objectives": [
      "Keep a workflow, add bounded planning or remove the proposed capability.",
      "Update Artifact 2."
    ],
    "concepts": [
      "Typed tools, state, deterministic control, permissions and side effects.",
      "The failure to expect: The flexible version succeeds on some tasks but behaves unpredictably on another."
    ],
    "steps": [
      "Transition specifies a read-and-draft workflow.",
      "Advanced compares it with a proposed bounded planning-agent design on unfamiliar tasks, using declared replay assumptions for cost and completion and specifying the live-agent test still needed. In the architecture clinic, explain two viable designs, challenge a peer's authority boundary and revise after the reviewer introduces a constraint.",
      "Break it: The flexible version succeeds on some tasks but behaves unpredictably on another.",
      "Debug: Replay states, choices, arguments and server responses; test what program control can enforce independently of the model.",
      "Decide: Keep a workflow, add bounded planning or remove the proposed capability.",
      "Defend: Update Artifact 2."
    ],
    "deliverable": "Artifact 2; version the decision and its evidence.",
    "reviewerChecks": "Transition passes when proposed intent, stored draft and completed action are distinguishable. Advanced also states the incremental-value hypothesis, ties it to a reproducible replay case and specifies the live-agent verification required before adding orchestration. The supplied runner does not benchmark a planning agent.",
    "resources": [
      {
        "kind": "read",
        "label": "R20: Quickstart LangGraph Essentials Python",
        "url": "https://academy.langchain.com/courses/langgraph-essentials-python"
      },
      {
        "kind": "read",
        "label": "R06: Structured outputs",
        "url": "https://platform.claude.com/docs/en/build-with-claude/structured-outputs"
      }
    ],
    "quiz": [
      "Paste the link to today's work in your portfolio repo.",
      "Today's decision: Keep a workflow, add bounded planning or remove the proposed capability. Give your answer and the evidence behind it.",
      "Which explanation for today's failure did you rule out, and what evidence ruled it out?"
    ]
  },
  {
    "day": 13,
    "week": 2,
    "kind": "build",
    "title": "Repair reliability and negotiate ownership",
    "mission": "Retries, budgets, termination and reviewer responsibilities shape reliable delivery.",
    "points": 12,
    "estimateMinutes": 90,
    "tags": [
      "AI",
      "Hands-on"
    ],
    "objectives": [
      "Change limits, recoverability or scope and name an accountable owner.",
      "Update Artifacts 2 and 5."
    ],
    "concepts": [
      "Retries, budgets, termination and reviewer responsibilities shape reliable delivery.",
      "The failure to expect: A task fails to reach a useful terminal state within its available budget."
    ],
    "steps": [
      "Transition resolves a reviewed workflow failure and specifies deterministic fallback.",
      "Advanced negotiates ownership across product, engineering and operations, considering capacity and a conflicting service objective.",
      "Break it: A task fails to reach a useful terminal state within its available budget.",
      "Debug: Inspect the trajectory and state transitions before changing prompts or adding agents.",
      "Decide: Change limits, recoverability or scope and name an accountable owner.",
      "Defend: Update Artifacts 2 and 5."
    ],
    "deliverable": "Artifacts 2 and 5; version the decision and its evidence.",
    "reviewerChecks": "Transition passes with an unseen terminating recovery path. Advanced also defines who decides competing quality, cost and operational priorities, inspects the mock denial/termination evidence, and specifies reconciliation and idempotency tests for a real business effect. The runner does not implement production transaction recovery.",
    "resources": [
      {
        "kind": "read",
        "label": "R19: Introduction to LangGraph Python",
        "url": "https://academy.langchain.com/courses/intro-to-langgraph"
      }
    ],
    "quiz": [
      "Paste the link to today's work in your portfolio repo.",
      "Today's decision: Change limits, recoverability or scope and name an accountable owner. Give your answer and the evidence behind it.",
      "Which explanation for today's failure did you rule out, and what evidence ruled it out?"
    ]
  },
  {
    "day": 14,
    "week": 2,
    "kind": "assessment",
    "title": "Checkpoint two architecture and transfer",
    "mission": "Architecture decisions must transfer when user, data and consequence change.",
    "points": 40,
    "estimateMinutes": 90,
    "tags": [
      "Checkpoint"
    ],
    "objectives": [
      "Accept, restrict, replace or remediate the architecture.",
      "Present the recommendation, strongest rejected alternative and evidence that could change the decision."
    ],
    "concepts": [
      "Architecture decisions must transfer when user, data and consequence change.",
      "The failure to expect: A seemingly reusable design fails an important acceptance condition."
    ],
    "steps": [
      "Transition diagnoses an unseen retrieval/tool failure.",
      "Advanced designs the second case under a fresh procurement or privacy constraint, then explains what cannot be copied from the support lab.",
      "Break it: A seemingly reusable design fails an important acceptance condition.",
      "Debug: Use source, context and execution evidence; name at least one alternative hypothesis.",
      "Decide: Accept, restrict, replace or remediate the architecture.",
      "Defend: Present the recommendation, strongest rejected alternative and evidence that could change the decision."
    ],
    "deliverable": "Artifacts 1, 2 and 3 plus checkpoint score; version the decision and its evidence.",
    "reviewerChecks": "Transition passes with demonstrable access denial and useful failure recovery. Advanced also passes build/buy, exit and transfer-case architecture anchors. Submit the three-source discovery record or clearly labeled access-limited equivalent.",
    "resources": [],
    "quiz": [
      "Paste the link to today's work in your portfolio repo.",
      "Today's decision: Accept, restrict, replace or remediate the architecture. Give your answer and the evidence behind it.",
      "Which explanation for today's failure did you rule out, and what evidence ruled it out?"
    ]
  },
  {
    "day": 15,
    "week": 3,
    "kind": "build",
    "title": "Create a consequential evaluation pack",
    "mission": "Task distribution, severity, denominators, gold evidence and leakage govern an evaluation.",
    "points": 12,
    "estimateMinutes": 120,
    "tags": [
      "AI",
      "Hands-on"
    ],
    "objectives": [
      "Which evidence supports a release gate and which needs further collection?",
      "Develop Artifact 3."
    ],
    "concepts": [
      "Task distribution, severity, denominators, gold evidence and leakage govern an evaluation.",
      "The failure to expect: A good test score is difficult to reconcile with observed failures."
    ],
    "steps": [
      "Transition constructs a stratified development pack and submits separate cases for reviewer-held testing.",
      "Advanced challenges the launch distribution and adds a low-frequency severe slice and second-case coverage.",
      "Break it: A good test score is difficult to reconcile with observed failures.",
      "Debug: Inspect labels, dates, sampling, duplication and test exposure without rewriting the hidden set to make the system pass.",
      "Decide: Which evidence supports a release gate and which needs further collection?",
      "Defend: Develop Artifact 3."
    ],
    "deliverable": "Artifact 3; version the decision and its evidence.",
    "reviewerChecks": "Transition passes with reproducible labels and withheld cases. Advanced also states what the sample cannot estimate and why an average score cannot waive a severe failure.",
    "resources": [
      {
        "kind": "read",
        "label": "R16: Promptfoo Getting started",
        "url": "https://www.promptfoo.dev/docs/getting-started/"
      },
      {
        "kind": "read",
        "label": "R02: Machine Learning Crash Course",
        "url": "https://developers.google.com/machine-learning/crash-course"
      }
    ],
    "quiz": [
      "Paste the link to today's work in your portfolio repo.",
      "Today's decision: Which evidence supports a release gate and which needs further collection? Give your answer and the evidence behind it.",
      "Which explanation for today's failure did you rule out, and what evidence ruled it out?"
    ]
  },
  {
    "day": 16,
    "week": 3,
    "kind": "build",
    "title": "Calibrate evaluation and quantify disagreement",
    "mission": "Exact checks, human judgments, model judges and disagreement measure different things.",
    "points": 12,
    "estimateMinutes": 120,
    "tags": [
      "AI",
      "Hands-on"
    ],
    "objectives": [
      "Which checks can gate release, assist review or remain exploratory?",
      "Add calibration and regressions to Artifact 3."
    ],
    "concepts": [
      "Exact checks, human judgments, model judges and disagreement measure different things.",
      "The failure to expect: A supplied synthetic judge output conflicts with a blinded human rubric review of a commercially important response. Use templates/judge_candidates.json; instructor reference anchors are disclosed only after the learner score is frozen."
    ],
    "steps": [
      "Transition calibrates a grader against independently reviewed examples.",
      "Advanced evaluates error by severity, order sensitivity and the likely decision consequence of judge mistakes.",
      "Break it: A supplied synthetic judge output conflicts with a blinded human rubric review of a commercially important response. Use templates/judge_candidates.json; instructor reference anchors are disclosed only after the learner score is frozen.",
      "Debug: Inspect rubric, input, evidence and grader output; compare position-swapped or repeated scoring where useful.",
      "Decide: Which checks can gate release, assist review or remain exploratory?",
      "Defend: Add calibration and regressions to Artifact 3."
    ],
    "deliverable": "Artifact 3; version the decision and its evidence.",
    "reviewerChecks": "Transition passes when an unseen material error is detected. Advanced also defends the operational cost of human adjudication and an escalation rule for uncertain judge results.",
    "resources": [
      {
        "kind": "read",
        "label": "R21: Evaluating AI Agents",
        "url": "https://www.deeplearning.ai/courses/evaluating-ai-agents"
      },
      {
        "kind": "read",
        "label": "R16: Promptfoo Getting started",
        "url": "https://www.promptfoo.dev/docs/getting-started/"
      }
    ],
    "quiz": [
      "Paste the link to today's work in your portfolio repo.",
      "Today's decision: Which checks can gate release, assist review or remain exploratory? Give your answer and the evidence behind it.",
      "Which explanation for today's failure did you rule out, and what evidence ruled it out?"
    ]
  },
  {
    "day": 17,
    "week": 3,
    "kind": "build",
    "title": "Threat model the usable product",
    "mission": "Untrusted inputs, tool boundaries, leakage, poisoning and excessive agency.",
    "points": 12,
    "estimateMinutes": 120,
    "tags": [
      "AI",
      "Hands-on"
    ],
    "objectives": [
      "Contain, redesign, restrict or stop the pilot.",
      "Update Artifacts 3 and 5."
    ],
    "concepts": [
      "Untrusted inputs, tool boundaries, leakage, poisoning and excessive agency.",
      "The failure to expect: A hostile task produces behavior inconsistent with the approved product scope."
    ],
    "steps": [
      "Transition maps trust boundaries and replays authorized synthetic attacks.",
      "Advanced balances containment, usable task coverage and procurement requirements across the transfer architecture.",
      "Break it: A hostile task produces behavior inconsistent with the approved product scope.",
      "Debug: Follow the evidence through retrieval, model, tools and logs; distinguish deception from an actual unauthorized effect.",
      "Decide: Contain, redesign, restrict or stop the pilot.",
      "Defend: Update Artifacts 3 and 5."
    ],
    "deliverable": "Artifacts 3 and 5; version the decision and its evidence.",
    "reviewerChecks": "Transition passes with external authorization controls and tested denial. Advanced also assigns residual-risk acceptance to the right owner and proposes a commercially usable restricted path without declaring the product safe from a few attacks.",
    "resources": [
      {
        "kind": "read",
        "label": "R17: Agentic AI Capture The Flag FinBot Goal Manipulation",
        "url": "https://genai.owasp.org/learning/agentic-ai-capture-the-flag-ctf-finbot-demo-goal-manipulation/"
      }
    ],
    "quiz": [
      "Paste the link to today's work in your portfolio repo.",
      "Today's decision: Contain, redesign, restrict or stop the pilot. Give your answer and the evidence behind it.",
      "Which explanation for today's failure did you rule out, and what evidence ruled it out?"
    ]
  },
  {
    "day": 18,
    "week": 3,
    "kind": "build",
    "title": "Design memory and the operating policy",
    "mission": "Session and persistent memory need provenance, scope, correction and deletion.",
    "points": 12,
    "estimateMinutes": 105,
    "tags": [
      "AI",
      "Hands-on"
    ],
    "objectives": [
      "Retain, narrow or remove persistence.",
      "Update Artifacts 2 and 3."
    ],
    "concepts": [
      "Session and persistent memory need provenance, scope, correction and deletion.",
      "The failure to expect: A future session behaves differently from the current source-backed policy."
    ],
    "steps": [
      "Transition dry-runs templates/memory_records.json through a learner-authored lifecycle table or argues against persistence.",
      "Advanced compares persistent personalization with retrieval-only state, tracing correction and deletion obligations across records, summaries, caches and indexes. This is a paper state simulation, not a memory implementation.",
      "Break it: A future session behaves differently from the current source-backed policy.",
      "Debug: Inspect remembered records, summaries, source dates and request context, testing competing explanations.",
      "Decide: Retain, narrow or remove persistence.",
      "Defend: Update Artifacts 2 and 3."
    ],
    "deliverable": "Artifacts 2 and 3; version the decision and its evidence.",
    "reviewerChecks": "Transition passes when a second synthetic event produces the correct proposed state and a traceable correction/deletion test specification. Advanced also names the operating owner, identifies downstream copies and evaluates incremental user value against retention and maintenance cost. Do not report this dry run as executed persistent-memory deletion.",
    "resources": [
      {
        "kind": "read",
        "label": "R19: Introduction to LangGraph Python",
        "url": "https://academy.langchain.com/courses/intro-to-langgraph"
      },
      {
        "kind": "read",
        "label": "R07: Effective context engineering for AI agents",
        "url": "https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents"
      }
    ],
    "quiz": [
      "Paste the link to today's work in your portfolio repo.",
      "Today's decision: Retain, narrow or remove persistence. Give your answer and the evidence behind it.",
      "Which explanation for today's failure did you rule out, and what evidence ruled it out?"
    ]
  },
  {
    "day": 19,
    "week": 3,
    "kind": "build",
    "title": "Measure adoption and useful outcomes",
    "mission": "Exposure, acceptance, edit effort, useful completion, return behavior and downstream quality.",
    "points": 12,
    "estimateMinutes": 120,
    "tags": [
      "AI",
      "Hands-on"
    ],
    "objectives": [
      "Improve capability, redesign workflow, change enablement or revise the value hypothesis.",
      "Start Artifact 4 and update Artifact 5."
    ],
    "concepts": [
      "Exposure, acceptance, edit effort, useful completion, return behavior and downstream quality.",
      "The failure to expect: Usage and acceptance rise while a downstream business outcome disappoints."
    ],
    "steps": [
      "Transition defines the event contract and task funnel.",
      "Advanced investigates differential adoption, manager incentives and reviewer capacity, pairing traces with business events.",
      "Break it: Usage and acceptance rise while a downstream business outcome disappoints.",
      "Debug: Inspect task eligibility, assignment, overrides, effort and timing; separate observed correlations from explanations.",
      "Decide: Improve capability, redesign workflow, change enablement or revise the value hypothesis.",
      "Defend: Start Artifact 4 and update Artifact 5."
    ],
    "deliverable": "Artifacts 4 and 5; version the decision and its evidence.",
    "reviewerChecks": "Transition passes with metric denominators and an actionable dashboard. Advanced also prioritizes a falsifiable adoption intervention and shows why a UI conversion event does not establish realized value.",
    "resources": [
      {
        "kind": "read",
        "label": "R26: Create a tracking plan",
        "url": "https://amplitude.com/docs/data/create-tracking-plan"
      },
      {
        "kind": "read",
        "label": "R25: Conversion funnels building analyzing and optimizing",
        "url": "https://posthog.com/docs/product-analytics/funnels"
      },
      {
        "kind": "read",
        "label": "R09: Observability primer",
        "url": "https://opentelemetry.io/docs/concepts/observability-primer/"
      }
    ],
    "quiz": [
      "Paste the link to today's work in your portfolio repo.",
      "Today's decision: Improve capability, redesign workflow, change enablement or revise the value hypothesis. Give your answer and the evidence behind it.",
      "Which explanation for today's failure did you rule out, and what evidence ruled it out?"
    ]
  },
  {
    "day": 20,
    "week": 3,
    "kind": "build",
    "title": "Repair the causal pilot and catch up",
    "mission": "Assignment, interference, sample adequacy, guardrails and stopping rules.",
    "points": 12,
    "estimateMinutes": 90,
    "tags": [
      "AI",
      "Hands-on"
    ],
    "objectives": [
      "Run, redesign or delay the experiment.",
      "Update Artifact 4."
    ],
    "concepts": [
      "Assignment, interference, sample adequacy, guardrails and stopping rules.",
      "The failure to expect: A favorable comparison is challenged by an unexpected difference between groups."
    ],
    "steps": [
      "Transition turns the proposed adoption change into a causal pilot and repairs reviewed evaluation gaps.",
      "Advanced specifies clustered or phased assignment when shared queues or teams interfere and negotiates the operational burden.",
      "Break it: A favorable comparison is challenged by an unexpected difference between groups.",
      "Debug: Inspect exposure, eligibility, task mix and assignment before interpreting lift.",
      "Decide: Run, redesign or delay the experiment.",
      "Defend: Update Artifact 4."
    ],
    "deliverable": "Artifact 4; version the decision and its evidence.",
    "reviewerChecks": "Transition passes with an explicit decision rule and failure guardrails. Advanced also explains uncertainty, a feasible assignment unit and which claims remain observational; feedback time addresses the highest-priority outstanding defect.",
    "resources": [
      {
        "kind": "read",
        "label": "R24: Patterns of trustworthy experimentation Pre experiment stage",
        "url": "https://www.microsoft.com/en-us/research/articles/patterns-of-trustworthy-experimentation-pre-experiment-stage/"
      }
    ],
    "quiz": [
      "Paste the link to today's work in your portfolio repo.",
      "Today's decision: Run, redesign or delay the experiment. Give your answer and the evidence behind it.",
      "Which explanation for today's failure did you rule out, and what evidence ruled it out?"
    ]
  },
  {
    "day": 21,
    "week": 3,
    "kind": "assessment",
    "title": "Checkpoint three quality versus economics",
    "mission": "Severity, exposure and useful outcomes determine the value of a quality change.",
    "points": 40,
    "estimateMinutes": 90,
    "tags": [
      "Checkpoint"
    ],
    "objectives": [
      "Release, route, restrict, remediate or stop.",
      "Present the recommendation, strongest rejected alternative and evidence that could change the decision."
    ],
    "concepts": [
      "Severity, exposure and useful outcomes determine the value of a quality change.",
      "The failure to expect: Different stakeholders reach opposing launch recommendations from the same summary."
    ],
    "steps": [
      "Transition evaluates an unseen model revision.",
      "Advanced receives an aggregate improvement, a severe slice regression and a changed cost or review-capacity constraint.",
      "Break it: Different stakeholders reach opposing launch recommendations from the same summary.",
      "Debug: Reconstruct metrics, error slices, operating costs and evidence limits.",
      "Decide: Release, route, restrict, remediate or stop.",
      "Defend: Present the recommendation, strongest rejected alternative and evidence that could change the decision."
    ],
    "deliverable": "Artifacts 3 and 4 plus checkpoint score; version the decision and its evidence.",
    "reviewerChecks": "Transition passes with a defensible gate and tested restriction. Advanced also passes the quality/economics adjudication anchor, quantifying a reversal condition without trading away mandatory authorization. Update Artifacts 3 and 4 with reviewer feedback.",
    "resources": [],
    "quiz": [
      "Paste the link to today's work in your portfolio repo.",
      "Today's decision: Release, route, restrict, remediate or stop. Give your answer and the evidence behind it.",
      "Which explanation for today's failure did you rule out, and what evidence ruled it out?"
    ]
  },
  {
    "day": 22,
    "week": 4,
    "kind": "build",
    "title": "Build the CFO case and price value test",
    "mission": "Outcome cost includes failed tasks, retries, tools, fixed spend and human operations; price depends on value and buying behavior.",
    "points": 12,
    "estimateMinutes": 120,
    "tags": [
      "AI",
      "Hands-on"
    ],
    "objectives": [
      "Which configuration and commercial test deserve investment?",
      "Complete Artifact 4."
    ],
    "concepts": [
      "Outcome cost includes failed tasks, retries, tools, fixed spend and human operations; price depends on value and buying behavior.",
      "The failure to expect: A lower model bill accompanies a less attractive financial result."
    ],
    "steps": [
      "Transition adapts the supplied economics example into a transparent task-based model.",
      "Advanced compares three strategies with sensitivity to task mix, adoption, human review, billing terms and vendor-price change. In the CFO clinic, defend the cash and effort allocation, recalculate one changed assumption and choose the next buying-evidence test.",
      "Break it: A lower model bill accompanies a less attractive financial result.",
      "Debug: Reconcile quantities, success denominators and accounting treatment; distinguish provider charges from fully loaded operating cost.",
      "Decide: Which configuration and commercial test deserve investment?",
      "Defend: Complete Artifact 4."
    ],
    "deliverable": "Artifact 4; version the decision and its evidence.",
    "reviewerChecks": "Transition passes with recalculable assumptions. Advanced also delivers a CFO recommendation with downside exposure, break-even conditions and a willingness-to-pay test that avoids calling hypothetical revenue validated demand.",
    "resources": [
      {
        "kind": "read",
        "label": "R10: Claude API pricing",
        "url": "https://platform.claude.com/docs/en/about-claude/pricing"
      },
      {
        "kind": "read",
        "label": "R15: Prompt caching",
        "url": "https://platform.claude.com/docs/en/build-with-claude/prompt-caching"
      }
    ],
    "quiz": [
      "Paste the link to today's work in your portfolio repo.",
      "Today's decision: Which configuration and commercial test deserve investment? Give your answer and the evidence behind it.",
      "Which explanation for today's failure did you rule out, and what evidence ruled it out?"
    ]
  },
  {
    "day": 23,
    "week": 4,
    "kind": "build",
    "title": "Allocate the portfolio and negotiate procurement",
    "mission": "Opportunity cost, distribution, build/buy, differentiation, rights and switching costs.",
    "points": 12,
    "estimateMinutes": 120,
    "tags": [
      "AI",
      "Hands-on"
    ],
    "objectives": [
      "Fund, stage, partner or stop each bet.",
      "Update Artifacts 2 and 5."
    ],
    "concepts": [
      "Opportunity cost, distribution, build/buy, differentiation, rights and switching costs.",
      "The failure to expect: A favored proposal loses an assumed advantage during procurement review."
    ],
    "steps": [
      "Transition compares buying with a custom layer for the bounded job.",
      "Advanced allocates a fixed budget across the support opportunity, transfer case and a non-AI option, then negotiates a vendor exit and acceptance test.",
      "Break it: A favored proposal loses an assumed advantage during procurement review.",
      "Debug: Examine evidence, contractual dependency and the underlying business value rather than repeating a moat claim.",
      "Decide: Fund, stage, partner or stop each bet.",
      "Defend: Update Artifacts 2 and 5."
    ],
    "deliverable": "Artifacts 2 and 5; version the decision and its evidence.",
    "reviewerChecks": "Transition passes with an evidence-based procurement choice. Advanced also provides ranked allocation, foregone value and milestones that can release or withdraw investment.",
    "resources": [
      {
        "kind": "read",
        "label": "R01: Introduction to Machine Learning Problem Framing",
        "url": "https://developers.google.com/machine-learning/problem-framing"
      },
      {
        "kind": "read",
        "label": "R08: Models overview",
        "url": "https://platform.claude.com/docs/en/models/overview"
      }
    ],
    "quiz": [
      "Paste the link to today's work in your portfolio repo.",
      "Today's decision: Fund, stage, partner or stop each bet. Give your answer and the evidence behind it.",
      "Which explanation for today's failure did you rule out, and what evidence ruled it out?"
    ]
  },
  {
    "day": 24,
    "week": 4,
    "kind": "build",
    "title": "Stress capacity and the human operating model",
    "mission": "Queues, caches, p95 latency, freshness, outages and reviewer throughput.",
    "points": 12,
    "estimateMinutes": 120,
    "tags": [
      "AI",
      "Hands-on"
    ],
    "objectives": [
      "Degrade, restrict eligibility, add capacity or change the promise.",
      "Update Artifacts 2, 4 and 5."
    ],
    "concepts": [
      "Queues, caches, p95 latency, freshness, outages and reviewer throughput.",
      "The failure to expect: The system meets one technical objective while users wait for useful completion."
    ],
    "steps": [
      "Transition maps the request and manual fallback under a traffic spike.",
      "Advanced reallocates capacity and service promises when demand, review effort and model availability change together.",
      "Break it: The system meets one technical objective while users wait for useful completion.",
      "Debug: Inspect spans, queues, state, event timings and review capacity, distinguishing latency of generation from latency of outcome.",
      "Decide: Degrade, restrict eligibility, add capacity or change the promise.",
      "Defend: Update Artifacts 2, 4 and 5."
    ],
    "deliverable": "Artifacts 2, 4 and 5; version the decision and its evidence.",
    "reviewerChecks": "Transition passes with a feasible fallback and response objective. Advanced also quantifies the bottleneck and explains the economic and user consequence of its chosen service level.",
    "resources": [
      {
        "kind": "read",
        "label": "R14: vLLM Quickstart",
        "url": "https://docs.vllm.ai/en/stable/getting_started/quickstart/"
      },
      {
        "kind": "read",
        "label": "R09: Observability primer",
        "url": "https://opentelemetry.io/docs/concepts/observability-primer/"
      }
    ],
    "quiz": [
      "Paste the link to today's work in your portfolio repo.",
      "Today's decision: Degrade, restrict eligibility, add capacity or change the promise. Give your answer and the evidence behind it.",
      "Which explanation for today's failure did you rule out, and what evidence ruled it out?"
    ]
  },
  {
    "day": 25,
    "week": 4,
    "kind": "build",
    "title": "Diagnose an ambiguous failure and transfer the lesson",
    "mission": "Ablation and targeted intervention isolate causes better than changing every component.",
    "points": 12,
    "estimateMinutes": 105,
    "tags": [
      "AI",
      "Hands-on"
    ],
    "objectives": [
      "Fix the mechanism, narrow the job or collect further evidence.",
      "Update Artifact 3."
    ],
    "concepts": [
      "Ablation and targeted intervention isolate causes better than changing every component.",
      "The failure to expect: End-task quality disappoints despite apparently strong intermediate metrics."
    ],
    "steps": [
      "Transition investigates a good-retrieval, poor-answer trace.",
      "Advanced receives less-labeled evidence and must determine whether the lesson applies to the unfamiliar second case.",
      "Break it: End-task quality disappoints despite apparently strong intermediate metrics.",
      "Debug: Form at least three hypotheses, request the discriminating evidence and change one relevant component. Hidden tests stay with the reviewer.",
      "Decide: Fix the mechanism, narrow the job or collect further evidence.",
      "Defend: Update Artifact 3."
    ],
    "deliverable": "Artifact 3; version the decision and its evidence.",
    "reviewerChecks": "Transition passes with an evidence-supported diagnosis and unseen re-test. Advanced also rejects an attractive but unsupported intervention and explains why the transfer case requires the same control or a different one.",
    "resources": [
      {
        "kind": "read",
        "label": "R21: Evaluating AI Agents",
        "url": "https://www.deeplearning.ai/courses/evaluating-ai-agents"
      },
      {
        "kind": "read",
        "label": "R09: Observability primer",
        "url": "https://opentelemetry.io/docs/concepts/observability-primer/"
      }
    ],
    "quiz": [
      "Paste the link to today's work in your portfolio repo.",
      "Today's decision: Fix the mechanism, narrow the job or collect further evidence. Give your answer and the evidence behind it.",
      "Which explanation for today's failure did you rule out, and what evidence ruled it out?"
    ]
  },
  {
    "day": 26,
    "week": 4,
    "kind": "build",
    "title": "Lead adoption rollout and incident recovery",
    "mission": "Enablement, review incentives, launch authority, incident ownership and rollback.",
    "points": 12,
    "estimateMinutes": 120,
    "tags": [
      "AI",
      "Hands-on"
    ],
    "objectives": [
      "Stop, restrict or continue under accountable gates.",
      "Update Artifact 5."
    ],
    "concepts": [
      "Enablement, review incentives, launch authority, incident ownership and rollback.",
      "The failure to expect: A concerning production-style replay arrives while stakeholders disagree about stopping the launch."
    ],
    "steps": [
      "Transition defines an eligible pilot slice and a worker onboarding plan.",
      "Advanced negotiates staged automation with operations, security and business stakeholders under limited reviewer capacity and a commercial deadline.",
      "Break it: A concerning production-style replay arrives while stakeholders disagree about stopping the launch.",
      "Debug: Identify exposure, authority, containment and evidence needed to resume; keep all actions inside the synthetic exercise.",
      "Decide: Stop, restrict or continue under accountable gates.",
      "Defend: Update Artifact 5."
    ],
    "deliverable": "Artifact 5; version the decision and its evidence.",
    "reviewerChecks": "Transition passes with an actionable incident and recovery plan. Advanced also names decision rights, adoption support and a reversible launch path rather than relying on a generic human-in-the-loop promise.",
    "resources": [
      {
        "kind": "read",
        "label": "R23: Human AI Experience Toolkit",
        "url": "https://www.microsoft.com/en-us/haxtoolkit/"
      },
      {
        "kind": "read",
        "label": "R17: Agentic AI Capture The Flag FinBot Goal Manipulation",
        "url": "https://genai.owasp.org/learning/agentic-ai-capture-the-flag-ctf-finbot-demo-goal-manipulation/"
      }
    ],
    "quiz": [
      "Paste the link to today's work in your portfolio repo.",
      "Today's decision: Stop, restrict or continue under accountable gates. Give your answer and the evidence behind it.",
      "Which explanation for today's failure did you rule out, and what evidence ruled it out?"
    ]
  },
  {
    "day": 27,
    "week": 4,
    "kind": "build",
    "title": "Reproduce repair and prepare the executive case",
    "mission": "A decision is credible when another person can trace and reproduce its supporting evidence.",
    "points": 12,
    "estimateMinutes": 90,
    "tags": [
      "AI",
      "Hands-on"
    ],
    "objectives": [
      "Correct the result, narrow the claim or remove it.",
      "Submit the portfolio index and executive memo."
    ],
    "concepts": [
      "A decision is credible when another person can trace and reproduce its supporting evidence.",
      "The failure to expect: A reviewer cannot reconcile a portfolio claim with the recorded source or result."
    ],
    "steps": [
      "Transition consolidates the five artifacts and corrects the largest reviewer gap.",
      "Advanced conducts a peer replay, challenges its own business case and rewrites unsupported impact claims.",
      "Break it: A reviewer cannot reconcile a portfolio claim with the recorded source or result.",
      "Debug: Follow the evidence chain through versions, inputs, calculation and inference.",
      "Decide: Correct the result, narrow the claim or remove it.",
      "Defend: Submit the portfolio index and executive memo."
    ],
    "deliverable": "Five-artifact index and corrected Artifact 5; version the decision and its evidence.",
    "reviewerChecks": "Transition passes with one independently replayed result. Advanced also shows a complete claim-to-evidence chain and a material change made because of critique.",
    "resources": [
      {
        "kind": "read",
        "label": "R16: Promptfoo Getting started",
        "url": "https://www.promptfoo.dev/docs/getting-started/"
      }
    ],
    "quiz": [
      "Paste the link to today's work in your portfolio repo.",
      "Today's decision: Correct the result, narrow the claim or remove it. Give your answer and the evidence behind it.",
      "Which explanation for today's failure did you rule out, and what evidence ruled it out?"
    ]
  },
  {
    "day": 28,
    "week": 4,
    "kind": "assessment",
    "title": "Checkpoint four executive capstone panel",
    "mission": "A leadership decision integrates customer value, architecture, risk, economics and execution.",
    "points": 40,
    "estimateMinutes": 120,
    "tags": [
      "Checkpoint"
    ],
    "objectives": [
      "Go, narrow, defer or stop with an accountable next action.",
      "Present the recommendation, strongest rejected alternative and evidence that could change the decision."
    ],
    "concepts": [
      "A leadership decision integrates customer value, architecture, risk, economics and execution.",
      "The failure to expect: The panel changes one material business or operating constraint without advance notice."
    ],
    "steps": [
      "Transition presents the bounded product recommendation.",
      "Advanced presents the support and second-case portfolio, including buyer evidence, procurement, adoption and investment allocation.",
      "Break it: The panel changes one material business or operating constraint without advance notice.",
      "Debug: Identify which assumptions, calculations and release conditions change and which evidence remains valid.",
      "Decide: Go, narrow, defer or stop with an accountable next action.",
      "Defend: Present the recommendation, strongest rejected alternative and evidence that could change the decision."
    ],
    "deliverable": "All five artifacts and capstone score; version the decision and its evidence.",
    "reviewerChecks": "Transition passes the core capstone and its scope gates. Advanced also passes all five senior decision anchors. State primary-discovery versus access-limited evidence and report actual prototype results, not imagined production ROI.",
    "resources": [],
    "quiz": [
      "Paste the link to today's work in your portfolio repo.",
      "Today's decision: Go, narrow, defer or stop with an accountable next action. Give your answer and the evidence behind it.",
      "Which explanation for today's failure did you rule out, and what evidence ruled it out?"
    ]
  },
  {
    "day": 29,
    "week": 4,
    "kind": "interview",
    "title": "Technical decision mock interview",
    "mission": "An unfamiliar user decision can require predictive ML, deterministic software, generated explanation or a combination.",
    "points": 50,
    "estimateMinutes": 75,
    "tags": [
      "Mock interview"
    ],
    "objectives": [
      "Choose the minimum justified architecture and the next validation step; a non-AI or manual decision can pass.",
      "Explain where support/RAG lessons transfer and where this different numerical decision requires different methods."
    ],
    "concepts": [
      "An unfamiliar user decision can require predictive ML, deterministic software, generated explanation or a combination.",
      "The failure to expect: A forecast appears accurate even though demand during stockouts is unobserved and automatic ordering authority is unclear."
    ],
    "steps": [
      "Transition whiteboards a retailer's replenishment decision using a simple forecast/reorder baseline and human approval.",
      "Advanced compares that baseline with a predictive-model proposal and an optional LLM explanation under stockout, inventory-capital and supplier constraints. The interviewer supplies a fabricated data-availability brief, asks for evidence limits and changes one constraint.",
      "Break it: A forecast appears accurate even though demand during stockouts is unobserved and automatic ordering authority is unclear.",
      "Debug: Inspect time split, data availability, leakage, missing demand, error consequences and the proposed action boundary before naming a model.",
      "Decide: Choose the minimum justified architecture and the next validation step; a non-AI or manual decision can pass.",
      "Defend: Explain where support/RAG lessons transfer and where this different numerical decision requires different methods."
    ],
    "deliverable": "Technical mock evidence, route feedback and a corrected architecture decision.",
    "reviewerChecks": "Transition passes by separating numerical prediction, explanation and authorized action, defining a testable baseline and refusing unsupported forecasts. Advanced also defends time-based evaluation, business-weighted errors, scarce capital and a material reversal condition. Do not require building a forecast model during the mock. The interviewer grades reasoning against the same diagnostic constructs independently of the course certification rubric.",
    "resources": [],
    "quiz": [
      "Paste the link to your revised decision or memo.",
      "Which interviewer challenge was hardest, and how would you answer it now?",
      "What is the next evidence you would collect, and why that first?"
    ]
  },
  {
    "day": 30,
    "week": 4,
    "kind": "interview",
    "title": "Leadership and commercial decision mock",
    "mission": "Senior leadership requires prioritization, disagreement resolution and honest evidence.",
    "points": 50,
    "estimateMinutes": 75,
    "tags": [
      "Mock interview"
    ],
    "objectives": [
      "Defend a recommendation and specify the next evidence investment.",
      "Submit the revised executive memo and 30-day growth plan."
    ],
    "concepts": [
      "Senior leadership requires prioritization, disagreement resolution and honest evidence.",
      "The failure to expect: The panel requests an impact claim the learner has not measured."
    ],
    "steps": [
      "Transition presents a portfolio artifact and an incident decision.",
      "Advanced handles a CFO objection, an operations adoption conflict and a competing investment request using its five artifacts.",
      "Break it: The panel requests an impact claim the learner has not measured.",
      "Debug: Separate measured lab results, actual discovery, inference and untested commercial assumptions.",
      "Decide: Defend a recommendation and specify the next evidence investment.",
      "Defend: Submit the revised executive memo and 30-day growth plan."
    ],
    "deliverable": "Artifact 5 and growth plan; version the decision and its evidence.",
    "reviewerChecks": "Transition passes with an honest supported product narrative. Advanced also demonstrates coherent allocation, accountable operating ownership and a feasible business decision across the challenge sequence.",
    "resources": [],
    "quiz": [
      "Paste the link to your revised decision or memo.",
      "Which interviewer challenge was hardest, and how would you answer it now?",
      "What is the next evidence you would collect, and why that first?"
    ]
  }
];

export const aiPmModules: CurriculumModule[] = [
  {
    "week": 1,
    "name": "Opportunity, contract and first prototype",
    "days": "Days 1–7",
    "summary": ""
  },
  {
    "week": 2,
    "name": "Retrieval, agents and system reliability",
    "days": "Days 8–14",
    "summary": ""
  },
  {
    "week": 3,
    "name": "Evaluation, safety and adoption evidence",
    "days": "Days 15–21",
    "summary": ""
  },
  {
    "week": 4,
    "name": "Economics, leadership and the executive case",
    "days": "Days 22–30",
    "summary": ""
  }
];
