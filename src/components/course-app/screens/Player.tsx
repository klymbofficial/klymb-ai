"use client";

import clsx from "clsx";
import { useEffect, useRef, useState, type MouseEvent, type RefObject } from "react";
import { MODULES } from "@/data/system-design/course-app";
import {
  ALL_IDS, addNote, audioTrack, completeNext, dayOf, flowDone, fmt, hasQuickCheck, lesson, lessonDay, lineAt, moduleIds, openLesson, quickCheckAt,
  retryVideo, seekTo, subtitleLines, togglePlay, updateLesson, type CourseState, type PlayerTab,
} from "@/lib/course-app";
import { Icon } from "../icons";
import { DayStart, LangSwitch, LessonPath, Practice, YourCall, goTo } from "../lesson/Practice";
import { Tour } from "../lesson/Tour";
import { track } from "../track";
import { BackButton, Duration, LessonMark, Segmented, lessonView } from "../ui";
import type { Act } from "../useCourseApp";
import { ControlBar, Osd, PlayerSettings, StatusLine, SUB_SIZE_CLASS, canSubtitle, useFullscreen, useOsd, usePlayerKeys } from "./PlayerControls";

/** Placeholder transcript for lessons that don't have a written one yet. */
function transcriptFor(s: CourseState, id: string): [number, string][] {
  const mine = subtitleLines(id, s.subLang);
  if (mine.length) return mine;
  const written = subtitleLines(id, "hinglish");
  if (written.length) return written;
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

/**
 * The lesson video on the dark grid: the 16:9 cut when there is one, else the
 * 9:16 one. Its own controls are hidden; the player's buttons drive it.
 */
function Video({ s, act, subs, box }: { s: CourseState; act: Act; subs?: boolean; box: RefObject<HTMLDivElement | null> }) {
  const day = dayOf(s.cur)!;
  const voice = audioTrack(s)!;
  const wide = !!voice.wide;
  const poster = wide ? day.video.wide?.poster ?? day.video.poster : day.video.poster;
  const ref = useRef<HTMLVideoElement>(null);
  const osd = useOsd(s);
  // Watch-through milestones already reported for this lesson's video.
  const marks = useRef<{ id: string; seen: Set<number> }>({ id: "", seen: new Set() });
  const errOffline = s.offline && !s.vidErr;

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    if (s.playing && v.paused) v.play().catch(() => act((p) => ({ ...p, playing: false })));
    if (!s.playing && !v.paused) v.pause();
  }, [s.playing, act]);
  useEffect(() => { if (ref.current) ref.current.playbackRate = s.speed; }, [s.speed]);
  useEffect(() => { const v = ref.current; if (v) { v.volume = s.volume; v.muted = s.muted; } }, [s.volume, s.muted]);
  // Seeks from the scrubber, the ±10s buttons and notes; the video's own progress stays within a second of `t`.
  useEffect(() => { const v = ref.current; if (v && v.readyState > 0 && Math.abs(v.currentTime - s.t) > 1.5) v.currentTime = s.t; }, [s.t]);
  useEffect(() => { if (!s.vidErr) ref.current?.load(); }, [s.vidErr]);

  const onTime = (v: HTMLVideoElement) => {
    const t = v.currentTime;
    if (v.duration > 0) {
      if (marks.current.id !== s.cur) marks.current = { id: s.cur, seen: new Set() };
      const pct = Math.min(100, Math.floor((t / v.duration) * 4) * 25);
      if (pct > 0 && !marks.current.seen.has(pct)) { marks.current.seen.add(pct); track("video_progress", s.cur, "watch", { pct }); }
    }
    const seen = v.duration > 0 && t / v.duration >= 0.85;
    act((p) => {
      if (Math.floor(p.t) === Math.floor(t) && (!seen || p.lessons[p.cur]?.watched)) return p;
      const n = { ...p, t };
      return seen && !p.lessons[p.cur]?.watched ? updateLesson(n, p.cur, { watched: true }) : n;
    });
  };

  return (
    <div ref={box} id="lesson-watch" className={clsx("sd-grid sd-fs @container relative flex flex-none scroll-mt-16 items-center justify-center overflow-hidden [--grid:23px] lg:[--grid:32px]", !wide && "py-3 lg:py-6")}>
      {(s.vidErr || errOffline) && (
        <div className="sd-a-in absolute inset-0 z-[3] flex flex-col justify-end gap-2 bg-sd-ink p-4 lg:p-7" style={{ animationDuration: ".3s" }}>
          <span className="flex text-sd-accent-400"><Icon name="alert" className="block size-5 flex-none lg:size-10" /></span>
          <span className="text-xl leading-[1.1] font-extrabold lg:text-[32px]">{errOffline ? "You’re offline" : "This video didn’t load"}</span>
          <span className="max-w-[520px] text-[13px] leading-[1.4] lg:text-[15px]">
            {errOffline ? "Lessons need a connection for now. Reconnect and it picks up where you left off." : `It may be your connection or our servers. Your place is saved at ${fmt(s.t)}.`}
          </span>
          <div className="mt-1 flex gap-2">
            <button type="button" onClick={() => act((p) => retryVideo(p))} className="sd-btn sd-btn-primary h-10"><Icon name="rotR" size={16} />Try again</button>
          </div>
        </div>
      )}
      <video
        ref={ref}
        src={voice.wide ?? voice.src}
        poster={poster}
        playsInline
        preload="metadata"
        controlsList="nodownload noplaybackrate"
        disablePictureInPicture
        onContextMenu={(e) => e.preventDefault()}
        onClick={() => act(togglePlay)}
        onLoadedMetadata={(e) => {
          // Also runs after switching voice-over: carry on from the same moment, at the same speed and volume.
          const v = e.currentTarget;
          if (s.t > 0) v.currentTime = s.t;
          Object.assign(v, { playbackRate: s.speed, volume: s.volume, muted: s.muted });
          if (s.playing && v.paused) v.play().catch(() => act((p) => ({ ...p, playing: false })));
        }}
        onTimeUpdate={(e) => onTime(e.currentTarget)}
        onPlay={() => { track("video_play", s.cur, "watch", { at: Math.round(s.t) }); act((p) => (p.playing ? p : { ...p, playing: true })); }}
        onPause={() => act((p) => (p.playing ? { ...p, playing: false } : p))}
        onEnded={() => { act((p) => ({ ...updateLesson(p, p.cur, { watched: true }), playing: false, ended: true })); goTo("reveal", 400); }}
        onError={() => act((p) => ({ ...p, vidErr: true, playing: false }))}
        className={clsx("block cursor-pointer bg-black", wide ? "aspect-video w-full" : "aspect-[9/16] h-[min(68dvh,560px)] max-w-full lg:h-[640px]")}
      />
      {subs && <Subtitles s={s} />}
      <Osd osd={osd} />
    </div>
  );
}

/** The line being spoken, overlaid at the bottom of the video like any player's captions (the clean cut has none burned in). */
function Subtitles({ s }: { s: CourseState }) {
  const cur = lineAt(subtitleLines(s.cur, s.subLang), s.t);
  if (!cur) return null;
  return (
    <div aria-live="off" lang={s.subLang === "en" ? "en" : "hi-Latn"} className="pointer-events-none absolute inset-x-0 bottom-[5%] z-[2] flex justify-center">
      <span className={clsx("max-w-[86%] bg-black/75 px-[0.5em] py-[0.2em] text-center leading-[1.4] font-semibold text-white", SUB_SIZE_CLASS[s.subSize])}>{cur}</span>
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
      {hasQuickCheck(s.cur) && !s.qcDone.includes(s.cur) && (
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
  const tl = transcriptFor(s, s.cur);
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
  const day = dayOf(s.cur);
  const lp = s.lessons[s.cur] ?? {};
  const nextId = ALL_IDS[ALL_IDS.indexOf(s.cur) + 1];
  const pos = `${lessonDay(s.cur)} · Lesson ${c.li + 1} of ${c.m.lessons.length} · Module ${c.mi + 1} of ${MODULES.length}`;
  const qc = hasQuickCheck(s.cur) ? fmt(quickCheckAt(s.cur)) : null;
  const done = flowDone(s, s.cur);
  const completeLabel = nextId ? "Mark complete · next lesson" : "Mark complete";
  const tabs: [PlayerTab, string][] = [
    ["notes", `Notes (${(s.notes[s.cur] ?? []).length})`],
    ["transcript", "Transcript"],
    ["lessons", "Lessons"],
  ];
  const showVideo = !day || !!lp.pre;
  const subsOn = !!day && canSubtitle(s) && s.subs;
  const [settings, setSettings] = useState(false);
  const fs = useFullscreen();
  usePlayerKeys(act, fs.toggle, showVideo && !!day && !s.qcOpen);

  return (
    <div className="sd-a-screen flex flex-1 max-w-[1200px] flex-col lg:flex-none lg:gap-4">
      <div className="flex items-center gap-2 px-3 pt-1 pb-2.5 lg:p-0">
        <BackButton onClick={() => act((p) => ({ ...p, screen: p.tab, playing: false }))} />
        <span className="min-w-0 flex-1 truncate text-xs font-semibold tracking-[0.08em] uppercase">{lessonDay(s.cur)} · {c.m.title}</span>
        {day && lp.pre && (
          <button
            type="button"
            onClick={() => { if (window.confirm("Start this lesson again from the first question?")) { act((p) => ({ ...updateLesson(p, p.cur, null), t: 0, playing: false, ended: false, done: p.done.filter((x) => x !== p.cur) })); goTo("call", 50); } }}
            className="sd-btn sd-btn-secondary h-[34px] flex-none gap-1.5 px-2.5 text-xs"
          >
            <Icon name="rotL" size={14} /><span className="hidden sm:inline">Restart</span>
          </button>
        )}
        {day && <LangSwitch s={s} act={act} />}
      </div>
      {day && <LessonPath s={s} id={s.cur} day={day} />}

      <div className="flex flex-col lg:grid lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start lg:gap-8">
        <div className="flex flex-col">
          {showVideo ? (
            <>
              <Video s={s} act={act} subs={subsOn} box={fs.box} />
              <div className="px-5 lg:px-0">
                <Scrubber s={s} act={act} />
                <ControlBar s={s} act={act} settings={settings} onSettings={() => setSettings((o) => !o)} fs={fs.on} onFs={fs.toggle} />
                <StatusLine s={s} qc={qc} />
                {settings && <PlayerSettings s={s} act={act} onClose={() => setSettings(false)} />}
              </div>
            </>
          ) : (
            <div className="px-5 lg:px-0">{lp.started ? <YourCall s={s} act={act} id={s.cur} day={day!} /> : <DayStart s={s} act={act} id={s.cur} day={day!} />}</div>
          )}
          <div className="px-5 lg:px-0">
            <div className={clsx("lg:hidden", !showVideo && "mt-4")}>
              <h3 className="m-0 mb-0.5 text-[22px] tracking-[-0.02em]">{c.title}</h3>
              <div className="mb-1 text-[13px] text-sd-n-700">{pos} · {c.dur}</div>
            </div>
            <div className="mt-5 hidden flex-wrap items-end justify-between gap-4 border-t-2 border-sd-divider pt-4 lg:flex">
              <div><h2 className="m-0 text-[30px] tracking-[-0.02em]">{c.title}</h2><div className="text-sm text-sd-n-700">{pos} · {c.dur}</div></div>
              {done && <button type="button" onClick={() => act((p) => completeNext(p, false))} className="sd-btn sd-btn-primary h-11 gap-2"><Icon name="check" size={16} />{completeLabel}</button>}
            </div>
            {day && lp.watched && !lp.read && !lp.post && (
              <button type="button" onClick={() => goTo("reveal", 0)} className="sd-a-in mt-4 flex w-full cursor-pointer items-center justify-between gap-3 bg-sd-ink px-4 py-3 text-left text-sd-bg">
                <span className="text-sm font-extrabold">Video done. Next: what really happens</span><Icon name="down" size={18} />
              </button>
            )}
            {day && showVideo && <Practice s={s} act={act} id={s.cur} day={day} />}
          </div>
        </div>

        <div data-tour="tabs" className="mt-4 flex flex-col lg:mt-0 lg:border-2 lg:border-sd-divider">
          <Segmented
            value={s.ptab === "discuss" ? "notes" : s.ptab}
            options={tabs}
            onChange={(v) => act((p) => ({ ...p, ptab: v }))}
            className="mx-5 lg:mx-0 lg:border-0 lg:border-b-2"
            itemClass="px-3 py-[9px] text-[13px] lg:px-2.5 lg:py-[11px] lg:text-xs"
          />
          {s.ptab !== "transcript" && s.ptab !== "lessons" && <Notes s={s} act={act} />}
          {s.ptab === "transcript" && <Transcript s={s} act={act} />}
          {s.ptab === "lessons" && <ModuleLessons s={s} act={act} />}
        </div>
      </div>

      {done && (
        <div className="sticky bottom-0 mt-auto border-t-2 border-sd-divider bg-sd-bg px-5 pt-2 pb-4 lg:hidden">
          <button type="button" onClick={() => act((p) => completeNext(p, false))} className="sd-btn sd-btn-primary sd-btn-block h-12"><Icon name="check" size={16} />{completeLabel}</button>
        </div>
      )}
      {day && !s.toured && <Tour s={s} act={act} />}
    </div>
  );
}
