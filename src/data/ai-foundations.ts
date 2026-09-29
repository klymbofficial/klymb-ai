/** The AI foundations every track teaches, and the metrics used to judge an LLM's answers. */

export type ConceptGlyph = "rag" | "agents" | "llmops" | "evals" | "safety" | "guardrails";

export interface AiConcept {
  glyph: ConceptGlyph;
  name: string;
  summary: string;
  tags: string[];
}

export const aiConcepts: AiConcept[] = [
  {
    glyph: "rag",
    name: "RAG",
    summary: "Retrieval-augmented generation: the model answers from your company's own documents, fetched at question time.",
    tags: ["retrieval", "embeddings", "citations"],
  },
  {
    glyph: "agents",
    name: "AI agents",
    summary: "Models that plan, call tools and act over several steps, and the ways they go wrong when nobody checks them.",
    tags: ["tools", "planning", "memory"],
  },
  {
    glyph: "llmops",
    name: "LLMOps",
    summary: "Running LLM features day to day: prompt versions, token cost per answer, latency and monitoring in production.",
    tags: ["cost", "latency", "monitoring"],
  },
  {
    glyph: "evals",
    name: "Evals",
    summary: "Test sets and scoring for AI output, by rule, by rubric or by a judge model, so a change can be proven better.",
    tags: ["test sets", "LLM judge", "regression"],
  },
  {
    glyph: "safety",
    name: "AI safety",
    summary: "Hallucination, bias, prompt injection and data leaks: what they look like at work and who is accountable.",
    tags: ["hallucination", "injection", "privacy"],
  },
  {
    glyph: "guardrails",
    name: "Guardrails",
    summary: "Checks around the model: input filters, output validation, refusals and human review before anything ships.",
    tags: ["filters", "validation", "human review"],
  },
];

export interface EvalMetric {
  name: string;
  question: string;
}

export const evalMetrics: EvalMetric[] = [
  { name: "Correctness", question: "Is the answer factually right?" },
  { name: "Groundedness", question: "Is every claim backed by the source it was given?" },
  { name: "Relevance", question: "Does it answer the question that was asked?" },
  { name: "Completeness", question: "Does it cover everything the question needs?" },
  { name: "Conciseness", question: "Does it say it without padding?" },
  { name: "Safety", question: "Is it free of harm, bias and leaked data?" },
];
