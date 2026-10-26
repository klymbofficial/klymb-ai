import { ASSESSMENT_SECONDS, SKILL_LEVELS } from "@/lib/coach/assessment";
import type { CoachTopic } from "@/lib/coach/topics";

/**
 * What the coach is told before it speaks, and the two functions it may call.
 *
 * Everything here is spoken aloud, which rules out most of how an LLM is
 * usually prompted: no lists read out, no headings, no markdown, and answers
 * of two or three sentences because a paragraph spoken at conversational
 * speed is forty seconds the learner cannot skim past. One question at a
 * time, for the same reason — two questions in one breath and they answer
 * the second.
 */

export interface CoachContext {
  firstName: string;
  trackName: string;
  /** Their day in the 30-day cohort: it bounds what is fair to ask. */
  day: number;
  topic: CoachTopic;
  /** Skills already recorded for this topic, so a repeat session probes past them. */
  covered: readonly string[];
}

const minutes = Math.round(ASSESSMENT_SECONDS / 60);

export function coachInstructions({ firstName, trackName, day, topic, covered }: CoachContext): string {
  const lines = [
    `You are Klymb's placement coach. You are speaking with ${firstName}, who is on day ${day} of the 30-day ${trackName} track, and you have about ${minutes} minutes.`,
    "",
    `Today's topic is: ${topic.label}. Stay on it. If they ask about something else, answer in one sentence and come back.`,
    `Open with exactly this question: "${topic.opener}"`,
    `A strong answer covers: ${topic.strongAnswer}`,
    `Work through these as the conversation allows: ${topic.skills.join("; ")}.`,
    "",
    "How to speak:",
    "- Two or three sentences, then one question. Never two questions at once.",
    "- You are being heard, not read. No lists, no headings, no spelling things out. Describe code in words rather than reading syntax aloud.",
    "- Plain, warm Indian English. Short words.",
    "- If they interrupt, stop and listen. They are not being rude.",
    "- Never say a score, a level, a mark or a percentage out loud, and never tell them you are recording anything.",
    "- When an answer is vague, ask for the specific case: what they built, what broke, what they changed.",
    "- When they do not know, say so kindly in a few words and move on. Do not teach a lesson mid-answer.",
    "",
    "Recording as you go:",
    `- After each substantive answer, call record_skill_evidence once for that skill. Keep talking; do not wait for it, do not mention it.`,
    `- The level is one of: ${SKILL_LEVELS.join(", ")}. Judge what they said, not how confidently they said it.`,
    "- The evidence is their own words, quoted or closely paraphrased, so a reviewer can check your read.",
    "",
    `Ending: when the ${minutes} minutes are nearly up, or the skills above are covered, call end_assessment. Then say two sentences — the strongest thing you heard and the one thing to work on next — and stop talking.`,
  ];

  if (covered.length) {
    lines.splice(
      6,
      0,
      `Already answered in an earlier session, so do not ask these again from the start — pick up past them and go deeper: ${covered.join("; ")}.`,
    );
  }

  return lines.join("\n");
}

/**
 * The two functions the coach may call.
 *
 * Both are deliberately small. A tool that returned a report would put the
 * whole report on the critical path of the conversation: the learner would
 * hear nothing while it was composed.
 */
export const COACH_TOOLS = [
  {
    type: "function",
    name: "record_skill_evidence",
    description:
      "Record one skill you have just assessed, with the learner's own words as evidence. Call this as you continue talking, once per skill per answer.",
    parameters: {
      type: "object",
      properties: {
        skill: { type: "string", description: "The skill assessed, from the topic's list." },
        level: { type: "string", enum: [...SKILL_LEVELS], description: "What their answer showed." },
        evidence: { type: "string", description: "What they said, quoted or closely paraphrased." },
        nextStep: { type: "string", description: "One concrete thing that would move this on. Optional." },
      },
      required: ["skill", "level", "evidence"],
    },
  },
  {
    type: "function",
    name: "end_assessment",
    description: "Close the session. Call this once, just before your two closing sentences.",
    parameters: {
      type: "object",
      properties: {
        summary: {
          type: "string",
          description: "Two or three sentences for a human reviewer: what was strongest, and the one thing to work on.",
        },
      },
      required: ["summary"],
    },
  },
] as const;

/**
 * The session the WebRTC call is created with.
 *
 * Deliberately only the fields the WebRTC guide itself shows: type, model,
 * instructions, output voice, tools. Turn detection and input transcription
 * go afterwards, as a session.update over the data channel — see
 * SESSION_TUNING. The instructions are here rather than there so the opening
 * question is right without waiting a round trip for it.
 */
export function realtimeSession({ model, voice, instructions }: { model: string; voice: string; instructions: string }) {
  return {
    type: "realtime",
    model,
    output_modalities: ["audio"],
    instructions,
    audio: { output: { voice } },
    tools: COACH_TOOLS,
    tool_choice: "auto",
  };
}

/**
 * Sent once the data channel opens, and the reason it is not in the call
 * above: semantic turn detection has been reported not to take effect when
 * set at creation, and a field the API later rejects arrives here as an
 * `error` event on a working call instead of failing the SDP exchange and
 * the whole session with it. If this update is refused the session keeps the
 * server's default turn detection, which still takes turns — just less
 * readily, and without captions of the learner's own speech.
 *
 * Semantic detection is what makes "has the student finished speaking?" a
 * judgement about the sentence rather than about a length of silence, which
 * is what a learner thinking mid-answer needs.
 */
export const SESSION_TUNING = {
  type: "session.update",
  session: {
    type: "realtime",
    audio: {
      input: {
        turn_detection: { type: "semantic_vad", eagerness: "auto" },
        transcription: { model: "gpt-4o-mini-transcribe" },
      },
    },
  },
} as const;
