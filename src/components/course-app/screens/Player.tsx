"use client";

import clsx from "clsx";
import type { MouseEvent } from "react";
import { TRANSCRIPTS } from "@/data/system-design/course-app";
import {
  ALL_IDS, SPEEDS, addNote, completeNext, fmt, isDownloaded, lesson, moduleIds, openLesson, pad, postQuestion, quickCheckAt,
  retryVideo, seekTo, toggleDownload, togglePlay, type CourseState, type PlayerTab,
} from "@/lib/course-app";
import { Icon } from "../icons";
import { BackButton, Duration, LessonMark, Segmented, lessonView, parallax } from "../ui";
import type { Act } from "../useCourseApp";

/** Placeholder transcript for lessons that don't have a written one yet. */
function transcriptFor(id: string): [number, string][] {
  const written = TRANSCRIPTS[id];
  if (written) return written;
  const c = lesson(id);
  const d = c.secs;
  const [a, b, z] = c.m.flow;
  return [
    [0, `What this lesson covers: ${c.title.toLowerCase()}.`],
    [Math.round(d * 0.12), `First, the problem ${c.m.title.toLowerCase()} solves.`],
    [Math.round(d * 0.25), `How ${a} hands work to ${b}.`],
    [Math.round(d * 0.4), `Where ${b} becomes the bottleneck.`],
    [Math.round(d * 0.55), `Scaling ${z} without losing correctness.`],
    [Math.round(d * 0.7), "Trade-offs to say out loud in an interview."],
    [Math.round(d * 0.88), "Recap and what comes next."],
  ];
}

const stop = (e: MouseEvent) => e.stopPropagation();

function Video({ s, act }: { s: CourseState; act: Act }) {
  const c = lesson(s.cur);
  const fi = Math.floor(s.t / 4) % 3;
  const nextId = ALL_IDS[ALL_IDS.indexOf(s.cur) + 1];
  const errOffline = s.offline && !isDownloaded(s, s.cur) && !s.vidErr;
  const showUpNext = s.ended && s.upNext > 0 && !!nextId;
  return (
    <div
      onClick={() => act(togglePlay)}
      {...parallax}
      role="button"
      tabIndex={-1}
      aria-label={s.playing ? "Pause" : "Play"}
      className="sd-grid relative flex h-[218px] flex-none cursor-pointer flex-col justify-between overflow-hidden px-4 py-3.5 [--grid:23px] lg:aspect-video lg:h-auto lg:p-6 lg:[--grid:32px]"
    >
      {(s.vidErr || errOffline) && (
        <div onClick={stop} className="sd-a-in absolute inset-0 z-[3] flex cursor-default flex-col justify-end gap-2 bg-sd-ink p-4 lg:p-7" style={{ animationDuration: ".3s" }}>
          <span className="flex text-sd-accent-400"><Icon name="alert" className="block size-5 flex-none lg:size-10" /></span>
          <span className="text-xl leading-[1.1] font-extrabold lg:text-[32px]">{errOffline ? "You’re offline" : "This video didn’t load"}</span>
          <span className="max-w-[520px] text-[13px] leading-[1.4] lg:text-[15px]">
            {errOffline ? "This lesson isn’t downloaded. Reconnect, or watch one of your downloaded lessons." : `It may be your connection or our servers. Your place is saved at ${fmt(s.t)}.`}
          </span>
          <div className="mt-1 flex gap-2">
            <button type="button" onClick={() => act((p) => retryVideo(p))} className="sd-btn sd-btn-primary h-10"><Icon name="rotR" size={16} />Try again</button>
            {errOffline && <button type="button" onClick={() => act((p) => ({ ...p, screen: "downloads" }))} className="sd-btn sd-btn-on-dark h-10">Open downloads</button>}
          </div>
        </div>
      )}
      {showUpNext && (
        <div onClick={stop} className="sd-a-in absolute inset-0 z-[2] flex cursor-default flex-col justify-end gap-2.5 bg-sd-ink/90 p-4 lg:p-7" style={{ animationDuration: ".3s" }}>
          <span className="text-[11px] font-extrabold tracking-[0.1em] text-sd-accent-400 uppercase lg:text-[13px]">Up next in {s.upNext}s</span>
          <span className="text-[22px] leading-[1.1] font-extrabold tracking-[-0.02em] lg:text-4xl">{lesson(nextId).title}</span>
          <div className="flex gap-2">
            <button type="button" onClick={() => act((p) => completeNext(p, true))} className="sd-btn sd-btn-primary h-10"><Icon name="play" size={16} />Play now</button>
            <button type="button" onClick={() => act((p) => ({ ...p, upNext: 0 }))} className="sd-btn sd-btn-on-dark h-10">Cancel</button>
          </div>
        </div>
      )}
      <div className="sd-far text-[56px] leading-none font-extrabold tracking-[-0.04em] text-white/22 lg:text-8xl">{c.code}</div>
      <div className="sd-near flex items-center gap-1.5 lg:gap-2.5">
        {c.m.flow.map((f, i) => {
          const on = s.playing && i === fi;
          return (
            <div key={f} className="flex items-center gap-1.5 lg:gap-2.5">
              <div className={clsx("border-[1.5px] px-2.5 py-[7px] text-xs font-extrabold transition-colors duration-300 lg:border-2 lg:px-[18px] lg:py-3 lg:text-base", on ? "border-sd-accent bg-sd-accent" : "border-white/55 bg-transparent")}>{f}</div>
              {i < 2 && <span className="flex opacity-60"><Icon name="arrowR" className="block size-4 flex-none lg:size-5" /></span>}
            </div>
          );
        })}
      </div>
      <div className="flex items-end justify-between">
        <div className="sd-mid flex size-[52px] items-center justify-center bg-sd-accent lg:size-[68px]"><Icon name={s.playing ? "pause" : "play"} size={22} /></div>
        <span className="text-xs font-extrabold lg:text-sm">{s.speed}×</span>
      </div>
    </div>
  );
}

function Scrubber({ s, act }: { s: CourseState; act: Act }) {
  const d = lesson(s.cur).secs;
  const cur = `${((s.t / d) * 100).toFixed(2)}%`;
  const cp = quickCheckAt(s.cur);
  const notes = (s.notes[s.cur] ?? []).filter((n) => n.t <= d);
  const seek = (e: MouseEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const f = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
    act((p) => seekTo(p, f * d));
  };
  return (
    <div
      onClick={seek}
      role="slider"
      tabIndex={0}
      aria-label="Seek"
      aria-valuemin={0}
      aria-valuemax={d}
      aria-valuenow={Math.round(s.t)}
      aria-valuetext={`${fmt(s.t)} of ${fmt(d)}`}
      onKeyDown={(e) => {
        if (e.key === "ArrowLeft") act((p) => seekTo(p, p.t - 5));
        else if (e.key === "ArrowRight") act((p) => seekTo(p, p.t + 5));
        else return;
        e.preventDefault();
      }}
      className="relative flex h-[22px] cursor-pointer items-center lg:mt-1.5 lg:h-6"
    >
      <div className="absolute inset-x-0 h-1 bg-sd-n-300" />
      <div className="absolute left-0 h-1 bg-sd-accent" style={{ width: cur }} />
      {notes.map((n, i) => <div key={i} className="absolute top-[3px] -ml-px h-4 w-[3px] bg-sd-ink lg:h-[18px]" style={{ left: `${((n.t / d) * 100).toFixed(2)}%` }} />)}
      {!s.qcDone.includes(s.cur) && (
        <div className="absolute top-1 -ml-1.5 size-3 rotate-45 border-[2.5px] border-sd-accent bg-sd-bg lg:top-[5px] lg:-ml-[7px] lg:size-3.5" style={{ left: `${((cp / d) * 100).toFixed(2)}%` }} />
      )}
      <div className="absolute -ml-1.5 size-3 border-2 border-sd-bg bg-sd-accent lg:-ml-[7px] lg:size-3.5" style={{ left: cur }} />
    </div>
  );
}

function Notes({ s, act }: { s: CourseState; act: Act }) {
  const notes = [...(s.notes[s.cur] ?? [])].sort((a, b) => a.t - b.t);
  return (
    <div className="flex flex-col gap-3 px-5 py-3.5 lg:p-3.5">
      <div className="flex gap-2">
        <input
          className="sd-input min-h-11 lg:min-h-10"
          value={s.draft}
          aria-label="Note"
          onChange={(e) => act((p) => ({ ...p, draft: e.target.value }))}
          onKeyDown={(e) => { if (e.key === "Enter") act((p) => addNote(p)); }}
          placeholder={`Add a note at ${fmt(s.t)}`}
        />
        <button type="button" onClick={() => act((p) => addNote(p))} disabled={!s.draft.trim()} className="sd-btn sd-btn-primary h-11 flex-none lg:h-10"><Icon name="plus" size={16} />Add</button>
      </div>
      <div className="flex flex-col border-t-2 border-sd-divider lg:border-t-0">
        {notes.map((n, i) => (
          <div key={i} className="flex items-start gap-3 border-b border-sd-divider py-3">
            <button type="button" onClick={() => act((p) => seekTo(p, n.t))} className="sd-tag sd-tag-accent flex-none cursor-pointer font-extrabold">{fmt(n.t)}</button>
            <span className="text-sm leading-[1.4]">{n.text}</span>
          </div>
        ))}
        {!notes.length && <div className="py-3 text-[13px] text-sd-n-700">Notes you add are pinned to the moment in the video.</div>}
      </div>
    </div>
  );
}

function Transcript({ s, act }: { s: CourseState; act: Act }) {
  const tl = transcriptFor(s.cur);
  let ai = 0;
  tl.forEach(([t], i) => { if (s.t >= t) ai = i; });
  return (
    <div className="flex flex-col px-5 pt-2 pb-3.5 lg:max-h-[440px] lg:overflow-y-auto lg:px-3.5">
      {tl.map(([t, text], i) => (
        <button
          key={t}
          type="button"
          onClick={() => act((p) => seekTo(p, t))}
          aria-current={i === ai ? "true" : undefined}
          className={clsx("grid cursor-pointer grid-cols-[48px_1fr] gap-2.5 border-l-[3px] px-2 py-[9px] text-left text-sm leading-[1.45] transition-colors duration-300 hover:bg-sd-accent-100", i === ai ? "border-sd-accent bg-sd-accent-100" : "border-transparent")}
        >
          <span className="pt-0.5 text-xs font-extrabold text-sd-accent-700">{fmt(t)}</span>
          <span className={clsx(i < ai && "opacity-60", i === ai && "font-semibold")}>{text}</span>
        </button>
      ))}
    </div>
  );
}

function Discussion({ s, act }: { s: CourseState; act: Act }) {
  const threads = [...(s.threads[s.cur] ?? [])].sort((a, b) => b.votes + (s.voted[b.id] ? 1 : 0) - (a.votes + (s.voted[a.id] ? 1 : 0)));
  return (
    <div className="flex flex-col gap-3 px-5 py-3.5 lg:max-h-[460px] lg:overflow-y-auto lg:p-3.5">
      <div className="flex gap-2">
        <input className="sd-input min-h-10" value={s.qDraft} aria-label="Question" onChange={(e) => act((p) => ({ ...p, qDraft: e.target.value }))} placeholder={`Ask about ${fmt(s.t)}`} />
        <button type="button" onClick={() => act((p) => postQuestion(p))} disabled={!s.qDraft.trim()} className="sd-btn sd-btn-primary h-10 flex-none">Ask</button>
      </div>
      <div className="flex flex-col">
        {threads.map((th) => {
          const voted = !!s.voted[th.id];
          const open = s.openThread === th.id;
          const n = th.replies.length;
          const mine = th.name === "You";
          return (
            <div key={th.id} className="sd-a-in grid grid-cols-[32px_minmax(0,1fr)] gap-2.5 border-b border-sd-divider py-3" style={{ animationDuration: ".4s" }}>
              <span className={clsx("flex size-8 items-center justify-center text-[11px] font-extrabold", mine ? "bg-sd-ink text-sd-bg" : "bg-sd-n-300")}>{th.ini}</span>
              <div className="flex min-w-0 flex-col gap-1.5">
                <div className="flex flex-wrap items-center gap-1.5 text-xs">
                  <b className="text-[13px]">{th.name}</b>
                  <span className="text-sd-n-700">{th.ago}</span>
                  <button type="button" onClick={() => act((p) => seekTo(p, th.t))} className="sd-tag sd-tag-accent cursor-pointer font-extrabold">{fmt(th.t)}</button>
                </div>
                <span className="text-sm leading-[1.4]">{th.text}</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    aria-label="Upvote"
                    aria-pressed={voted}
                    onClick={() => act((p) => ({ ...p, voted: { ...p.voted, [th.id]: !p.voted[th.id] } }))}
                    className={clsx("flex cursor-pointer items-center gap-1 border-[1.5px] px-2 py-1 text-xs font-extrabold transition-colors duration-200", voted ? "border-sd-accent bg-sd-accent text-sd-bg" : "border-sd-divider")}
                  >
                    <Icon name="up" size={16} />{th.votes + (voted ? 1 : 0)}
                  </button>
                  <button type="button" onClick={() => act((p) => ({ ...p, openThread: open ? null : th.id }))} className="sd-btn sd-btn-ghost px-1.5 py-1 text-xs">
                    {n ? (open ? "Hide replies" : `${n} ${n > 1 ? "replies" : "reply"}`) : "No replies yet"}
                  </button>
                </div>
                {open && (
                  <div className="sd-a-in flex flex-col gap-2.5 border-l-2 border-sd-divider pt-2.5 pl-3" style={{ animationDuration: ".3s" }}>
                    {th.replies.map((rp, i) => (
                      <div key={i} className="flex flex-col gap-1">
                        <div className="flex items-center gap-1.5 text-xs">
                          <b className="text-[13px]">{rp.name}</b>
                          {rp.inst && <span className="sd-tag bg-sd-ink font-semibold text-sd-bg">Instructor</span>}
                          <span className="text-sd-n-700">{rp.ago}</span>
                        </div>
                        <span className="text-sm leading-[1.4]">{rp.text}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
        {!threads.length && (
          <div className="flex flex-col gap-1.5 py-4">
            <span className="flex size-12 items-center justify-center border-2 border-dashed border-sd-n-500 text-sd-n-700"><Icon name="msg" /></span>
            <b className="text-[15px]">No questions on this lesson yet</b>
            <span className="text-[13px] text-sd-n-700">Ask one. It gets pinned to the moment you’re watching.</span>
          </div>
        )}
      </div>
    </div>
  );
}

function ModuleLessons({ s, act }: { s: CourseState; act: Act }) {
  return (
    <div className="flex flex-col px-5 py-3.5 lg:px-3.5 lg:pt-2">
      {moduleIds(lesson(s.cur).mi).map((id) => {
        const v = lessonView(s, id);
        return (
          <button key={id} type="button" onClick={() => act((p) => openLesson(p, id))} className={clsx("grid cursor-pointer grid-cols-[24px_1fr_auto] items-center gap-2.5 border-b border-sd-divider px-2 py-[11px] text-left text-sm", v.cur && "bg-sd-accent-100")}>
            <LessonMark done={v.done} cur={v.cur} />
            <span className={clsx(v.cur && "font-extrabold", v.dim && "opacity-45")}>{v.title}</span>
            <Duration v={v} />
          </button>
        );
      })}
    </div>
  );
}

export function Player({ s, act }: { s: CourseState; act: Act }) {
  const c = lesson(s.cur);
  const nextId = ALL_IDS[ALL_IDS.indexOf(s.cur) + 1];
  const pos = `Lesson ${c.li + 1} of ${c.m.lessons.length} · Module ${c.mi + 1} of 8`;
  const qcTime = fmt(quickCheckAt(s.cur));
  const completeLabel = nextId ? "Mark complete · next lesson" : "Mark complete";
  const dlLabel = isDownloaded(s, s.cur) ? "Saved" : s.cur in s.dlProg ? `${Math.floor(s.dlProg[s.cur])}%` : "Download";
  const playLabel = s.playing ? "Pause" : s.t > 0 ? "Resume" : "Play";
  const cycleSpeed = () => act((p) => ({ ...p, speed: SPEEDS[(SPEEDS.indexOf(p.speed) + 1) % SPEEDS.length] }));
  const back10 = () => act((p) => ({ ...p, t: Math.max(0, p.t - 10), ended: false, upNext: 0 }));
  const fwd10 = () => act((p) => ({ ...p, t: Math.min(lesson(p.cur).secs, p.t + 10) }));
  const tabs: [PlayerTab, string][] = [
    ["notes", `Notes (${(s.notes[s.cur] ?? []).length})`],
    ["transcript", "Transcript"],
    ["discuss", `Q&A (${(s.threads[s.cur] ?? []).length})`],
    ["lessons", "Lessons"],
  ];

  return (
    <div className="sd-a-screen flex flex-1 max-w-[1200px] flex-col lg:flex-none lg:gap-4">
      <div className="flex items-center gap-2 px-3 pt-1 pb-2.5 lg:p-0">
        <BackButton onClick={() => act((p) => ({ ...p, screen: p.tab }))} />
        <span className="min-w-0 flex-1 truncate text-xs font-semibold tracking-[0.08em] uppercase">Module {pad(c.mi + 1)} · {c.m.title}</span>
        <button type="button" onClick={() => act((p) => toggleDownload(p))} className="sd-btn sd-btn-secondary ml-auto h-[34px] flex-none"><Icon name="download" size={16} />{dlLabel}</button>
      </div>

      <div className="flex flex-col lg:grid lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start lg:gap-8">
        <div className="flex flex-col">
          <Video s={s} act={act} />
          <div className="px-5 lg:px-0">
            <Scrubber s={s} act={act} />
            <div className="flex justify-between text-xs font-semibold lg:hidden">
              <span>{fmt(s.t)}</span><span className="text-sd-accent-700">Quick check at {qcTime}</span><span>{c.dur}</span>
            </div>
            <div className="mt-2 mb-3.5 flex items-center gap-2 lg:hidden">
              <button type="button" onClick={back10} aria-label="Back 10 seconds" className="sd-btn sd-btn-secondary sd-btn-icon size-11"><Icon name="rotL" /></button>
              <button type="button" onClick={() => act(togglePlay)} className="sd-btn sd-btn-primary h-11 flex-1 justify-start gap-2"><Icon name={s.playing ? "pause" : "play"} size={16} />{playLabel}</button>
              <button type="button" onClick={fwd10} aria-label="Forward 10 seconds" className="sd-btn sd-btn-secondary sd-btn-icon size-11"><Icon name="rotR" /></button>
              <button type="button" onClick={cycleSpeed} aria-label="Playback speed" className="sd-btn sd-btn-secondary h-11 w-14 justify-start">{s.speed}×</button>
            </div>
            <div className="mt-1.5 hidden items-center gap-2 lg:flex">
              <button type="button" onClick={() => act(togglePlay)} className="sd-btn sd-btn-primary h-10 w-[120px] justify-start gap-2"><Icon name={s.playing ? "pause" : "play"} size={16} />{playLabel}</button>
              <button type="button" onClick={back10} aria-label="Back 10 seconds" className="sd-btn sd-btn-secondary sd-btn-icon size-10"><Icon name="rotL" size={16} /></button>
              <button type="button" onClick={fwd10} aria-label="Forward 10 seconds" className="sd-btn sd-btn-secondary sd-btn-icon size-10"><Icon name="rotR" size={16} /></button>
              <button type="button" onClick={cycleSpeed} aria-label="Playback speed" className="sd-btn sd-btn-secondary h-10 w-14 justify-start">{s.speed}×</button>
              <span className="ml-auto text-[13px] font-semibold text-sd-accent-700">Quick check at {qcTime}</span>
              <span className="pl-3 text-[13px] font-semibold">{fmt(s.t)} / {c.dur}</span>
            </div>
            <div className="lg:hidden">
              <h3 className="m-0 mb-0.5 text-[22px] tracking-[-0.02em]">{c.title}</h3>
              <div className="mb-3.5 text-[13px] text-sd-n-700">{pos} · {c.dur}</div>
            </div>
            <div className="mt-5 hidden flex-wrap items-end justify-between gap-4 border-t-2 border-sd-divider pt-4 lg:flex">
              <div><h2 className="m-0 text-[30px] tracking-[-0.02em]">{c.title}</h2><div className="text-sm text-sd-n-700">{pos} · {c.dur}</div></div>
              <button type="button" onClick={() => act((p) => completeNext(p, false))} className="sd-btn sd-btn-primary h-11 gap-2"><Icon name="check" size={16} />{completeLabel}</button>
            </div>
          </div>
        </div>

        <div className="flex flex-col lg:border-2 lg:border-sd-divider">
          <Segmented
            value={s.ptab}
            options={tabs}
            onChange={(v) => act((p) => ({ ...p, ptab: v }))}
            className="mx-5 lg:mx-0 lg:border-0 lg:border-b-2"
            itemClass="px-3 py-[9px] text-[13px] lg:px-2.5 lg:py-[11px] lg:text-xs"
          />
          {s.ptab === "notes" && <Notes s={s} act={act} />}
          {s.ptab === "transcript" && <Transcript s={s} act={act} />}
          {s.ptab === "discuss" && <Discussion s={s} act={act} />}
          {s.ptab === "lessons" && <ModuleLessons s={s} act={act} />}
        </div>
      </div>

      <div className="sticky bottom-0 mt-auto border-t-2 border-sd-divider bg-sd-bg px-5 pt-2 pb-4 lg:hidden">
        <button type="button" onClick={() => act((p) => completeNext(p, false))} className="sd-btn sd-btn-secondary sd-btn-block h-12"><Icon name="check" size={16} />{completeLabel}</button>
      </div>
    </div>
  );
}
