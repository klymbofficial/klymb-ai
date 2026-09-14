import type { Metadata } from "next";
import { InterviewPractice } from "@/components/learn/InterviewPractice";
import { TrackSwitcher } from "@/components/learn/TrackSwitcher";
import { DemoNotice } from "@/components/ui/DemoNotice";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { Tag } from "@/components/ui/Tag";
import { mockInterviewPhase } from "@/data/program";
import { resolveTrack } from "@/lib/learn";

export const metadata: Metadata = { title: "Mock Interview Preparation (Demo)", robots: { index: false } };

const rounds = [
  { day: "Day 29", name: "Technical & scenario round", detail: "Role-specific questions and a practical scenario, with written feedback." },
  { day: "Day 30", name: "Project walkthrough & behavioural round", detail: "Present your portfolio project and answer behavioural questions." },
];

export default async function MockInterviewPage({ searchParams }: { searchParams: Promise<{ track?: string }> }) {
  const track = resolveTrack((await searchParams).track);
  return (
    <>
      <DemoNotice>Scheduling opens after Week 4</DemoNotice>
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <TrackSwitcher basePath="/mock-interview" current={track.slug} />
        <div className="mt-10 flex flex-wrap gap-2"><Tag tone="red">{mockInterviewPhase.days}</Tag><Tag>{track.name}</Tag></div>
        <Eyebrow className="mt-6">Mock interview preparation</Eyebrow>
        <h1 className="display mt-3 text-5xl text-balance">Walk in having already answered the hard questions.</h1>

        <ol className="mt-10 grid gap-0.5 border-2 border-line bg-line md:grid-cols-2">
          {rounds.map((r) => (
            <li key={r.day} className="bg-paper p-6">
              <p className="display text-3xl text-red">{r.day}</p>
              <p className="mt-2 text-lg font-extrabold">{r.name}</p>
              <p className="mt-1 text-muted">{r.detail}</p>
            </li>
          ))}
        </ol>

        <section aria-labelledby="topics-title" className="mt-10">
          <h2 id="topics-title" className="display text-2xl">Topics for {track.name}</h2>
          <ul className="mt-4 flex flex-wrap gap-2">
            {track.interviewTopics.map((t) => <li key={t} className="border-2 border-ink px-3 py-1.5 font-bold">{t}</li>)}
          </ul>
        </section>

        <section aria-labelledby="questions-title" className="mt-10">
          <h2 id="questions-title" className="display text-2xl">Practice questions</h2>
          <div className="mt-4"><InterviewPractice questions={track.interviewQuestions} /></div>
        </section>
      </div>
    </>
  );
}
