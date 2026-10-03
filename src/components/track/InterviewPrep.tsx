import { CalendarDays, MessageSquareText, PenLine } from "lucide-react";
import type { Track } from "@/types/program";
import { mockInterviewPhase } from "@/data/program";
import { Appear } from "@/components/motion/Appear";
import { ButtonLink } from "@/components/ui/Button";
import { Eyebrow } from "@/components/ui/Eyebrow";

/**
 * Interview preparation on the page ground, in the page's own light voice:
 * the format of the mock rounds as three plain facts, then every sample
 * question as a card with what a strong answer shows, readable at a glance.
 * The sixth grid cell holds the topics, so the grid always closes square.
 */
export function InterviewPrep({ track, enrolHref }: { track: Track; enrolHref: string }) {
  const facts = [
    { icon: CalendarDays, label: mockInterviewPhase.days, detail: "Two mock rounds after Week 4" },
    { icon: MessageSquareText, label: "Three kinds of question", detail: "Technical, scenario, behavioural" },
    { icon: PenLine, label: "Written feedback", detail: "On every answer you give" },
  ];

  return (
    <div>
      <div>
        <Appear className="max-w-2xl">
          <Eyebrow>Interview preparation & mock interviews</Eyebrow>
          <h2 id="interview-title" className="display display-soft mt-3 text-[clamp(1.75rem,3.6vw,2.6rem)] text-balance">
            Practise the questions {track.name} interviews actually ask.
          </h2>
          <p className="mt-3 text-[15px] leading-relaxed text-muted">
            Preparation runs through Week 4, then two mock rounds on {mockInterviewPhase.days}. Here is what you will be
            asked, and what a strong answer looks like.
          </p>
        </Appear>

        <ul className="mt-8 grid gap-4 border-y border-line/25 py-5 sm:grid-cols-3 sm:gap-0 sm:divide-x sm:divide-line/25">
          {facts.map(({ icon: Icon, label, detail }, i) => (
            <li key={label} className="sm:px-6 sm:first:pl-0">
              <Appear delay={0.08 * i} y={8} className="flex items-center gap-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-red-tint">
                  <Icon aria-hidden="true" className="size-4.5 text-red-deep" />
                </span>
                <span>
                  <span className="block text-sm font-semibold">{label}</span>
                  <span className="block text-xs text-muted">{detail}</span>
                </span>
              </Appear>
            </li>
          ))}
        </ul>
      </div>

      <ol className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {track.interviewQuestions.map((q, i) => (
          <li key={q.question}>
            <Appear
              delay={0.06 * i}
              y={14}
              className="flex h-full flex-col rounded-card bg-card p-6 shadow-card transition-[transform,box-shadow] duration-300 hover:-translate-y-1 hover:shadow-float"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-bold text-red-deep nums">{String(i + 1).padStart(2, "0")}</span>
                <span className="rounded-full bg-surface px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.1em] text-muted">
                  {q.category}
                </span>
              </div>
              <p className="mt-4 text-lg leading-snug font-semibold text-balance">“{q.question}”</p>
              <div className="mt-5 border-t border-line/20 pt-4">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">A strong answer shows</p>
                <p className="mt-1.5 text-sm leading-relaxed text-ink/80">{q.whatGoodLooksLike}</p>
              </div>
            </Appear>
          </li>
        ))}

        <li>
          <Appear delay={0.06 * track.interviewQuestions.length} y={14} className="flex h-full flex-col rounded-card bg-red-tint p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-red-deep">Topics covered</p>
            <ul className="mt-4 flex flex-wrap gap-2">
              {track.interviewTopics.map((t) => (
                <li key={t} className="rounded-full bg-card/80 px-3 py-1.5 text-sm">{t}</li>
              ))}
            </ul>
            <div className="mt-auto pt-6">
              <ButtonLink href={enrolHref} soft arrow className="rounded-md px-4! py-2! text-xs!">Enroll now</ButtonLink>
            </div>
          </Appear>
        </li>
      </ol>
    </div>
  );
}
