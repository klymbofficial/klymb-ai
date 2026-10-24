import {
  LESSON_DAYS,
  MODULES,
  NOTIFICATIONS,
  QUESTIONS,
  QUICK_CHECKS,
  TRANSCRIPTS,
  THREADS,
  TIMED_SECONDS,
  type Notif,
  type Question,
  type Thread,
} from "@/data/system-design/course-app";
import { SUBTITLES_EN } from "@/data/system-design/subtitles-en";
import type { Lang } from "@/data/system-design/types";

/**
 * State and transitions for the System Design course app. Everything here is
 * pure: the component layer owns timers, storage and the DOM. `t` is the
 * lesson video's playhead in seconds, reported by the <video> element.
 */

export type Screen =
  | "splash" | "onboard" | "home" | "course" | "progress" | "profile"
  | "player" | "quiz" | "results" | "notifs" | "downloads" | "recap";
export type Tab = "home" | "course" | "progress" | "profile";
export type PlayerTab = "notes" | "transcript" | "discuss" | "lessons";
export type QuizKind = "pre" | "post";
export type Answer = number | number[] | string;

export interface Note { t: number; text: string }

/** A lesson's own steps: your call, the video, build it, prove it, follow-ups. */
export interface LessonProgress {
  /** Pressed "Start Day N" on the day's opening card. */
  started?: boolean;
  /** Sent the end-of-day feedback. */
  feedback?: boolean;
  pre?: number[]; watched?: boolean; read?: boolean; post?: number[];
  /** Estimate answers, as typed. */
  est?: number[];
  built?: number;
  /** The design attempt, and the self-check ticks after the walkthrough. */
  design?: string; checks?: boolean[];
  follow?: boolean[];
}

export interface CourseState {
  screen: Screen;
  tab: Tab;
  onboarded: boolean;
  onb: number;
  splashUntil: number;
  /** Current lesson id, "module-lesson", zero-based. */
  cur: string;
  t: number;
  playing: boolean;
  speed: number;
  /** The learner has opened a lesson, so the mini player may show. */
  visited: boolean;
  miniHide: string | null;
  ended: boolean;
  upNext: number;
  notes: Record<string, Note[]>;
  draft: string;
  ptab: PlayerTab;
  openMod: number;
  done: string[];
  quiz: { kind: QuizKind; stage: "intro" | "q"; idx: number; answers: Record<number, Answer> };
  timeLeft: number;
  confirmExit: boolean;
  /** 1 = correct, 0 = not, per question. */
  pre: number[];
  post: number[] | null;
  lastKind: QuizKind;
  qcOpen: boolean;
  qcPick: number | null;
  qcDone: string[];
  notifs: Notif[];
  threads: Record<string, Thread[]>;
  voted: Record<string, boolean>;
  openThread: string | null;
  qDraft: string;
  dl: { id: string; size: number }[];
  dlProg: Record<string, number>;
  offline: boolean;
  vidErr: boolean;
  recapMod: number;
  goal: number;
  remind: string;
  autoplay: boolean;
  quality: "auto" | "hd" | "saver";
  wifiOnly: boolean;
  streakRem: boolean;
  replyNotif: boolean;
  todaySec: number;
  /** Local date (YYYY-MM-DD) that `todaySec` counts. */
  today: string;
  toast: string | null;
  toastUntil: number;
  /** Per-lesson practice progress, by lesson id. */
  lessons: Record<string, LessonProgress>;
  /** Language of the lesson content; the app's own labels stay English. */
  lang: Lang;
  /** Subtitles under the lesson video, in `subLang`, at `subSize`. */
  subs: boolean;
  subLang: SubLang;
  subSize: SubSize;
  /** Voice-over language of the lesson video, by its label ("Hinglish"). Falls back to the original when a lesson lacks it. */
  audio: string;
  /** 0–1. */
  volume: number;
  muted: boolean;
  /** Saw (or skipped) Kamran's tour of the lesson screen. */
  toured: boolean;
  /** Local dates (YYYY-MM-DD) with any finished step: the streak. */
  activeDays: string[];
}

export const LESSON_COUNT = MODULES.reduce((n, m) => n + m.lessons.length, 0);
export const ALL_IDS = MODULES.flatMap((m, mi) => m.lessons.map((_, li) => `${mi}-${li}`));
/** Downloads have a 2 GB allowance. */
export const STORAGE_MB = 2048;
/** Playback speed: preset steps, and the range the fine control allows. */
export const SPEED_PRESETS = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];
export const SPEED_MIN = 0.5;
export const SPEED_MAX = 2.5;
export type SubLang = "hinglish" | "en";
export type SubSize = "s" | "m" | "l";
export const SUB_LANGS: [SubLang, string][] = [["hinglish", "Hinglish"], ["en", "English"]];
/** Tabs keep a lesson playing in the mini player. */
export const TAB_SCREENS: Screen[] = ["home", "course", "progress", "profile"];

export const sec = (d: string) => {
  const [m, s] = d.split(":");
  return Number(m) * 60 + Number(s);
};
export const fmt = (s: number) => {
  const v = Math.max(0, Math.floor(s));
  return `${String(Math.floor(v / 60)).padStart(2, "0")}:${String(v % 60).padStart(2, "0")}`;
};
export const pad = (n: number) => String(n).padStart(2, "0");
export const pct = (a: number[]) => (a.length ? `${Math.round((a.reduce((x, y) => x + y, 0) / a.length) * 100)}%` : "—");
export const localDate = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export function lesson(id: string) {
  const [mi, li] = id.split("-").map(Number);
  const m = MODULES[mi];
  return { mi, li, m, title: m.lessons[li][0], dur: m.lessons[li][1], secs: sec(m.lessons[li][1]), code: `${pad(mi + 1)}.${li + 1}` };
}

export const moduleIds = (mi: number) => MODULES[mi].lessons.map((_, li) => `${mi}-${li}`);
export const moduleMinutes = (mi: number) => Math.round(MODULES[mi].lessons.reduce((a, l) => a + sec(l[1]), 0) / 60);
/** Each lesson's quick check sits at 45% of the video. */
export const quickCheckAt = (id: string) => Math.round(lesson(id).secs * 0.45);
export const isDownloaded = (s: CourseState, id: string) => s.dl.some((x) => x.id === id);
/** The lesson can't play: a simulated load error, or offline without a download. */
export const blocked = (s: CourseState) => s.vidErr || (s.offline && !isDownloaded(s, s.cur));
export const miniActive = (s: CourseState) => MINI_PLAYER && s.visited && TAB_SCREENS.includes(s.screen) && s.miniHide !== s.cur;
export const allNotes = (s: CourseState) => Object.values(s.notes).flat();

/** The mini player needs a video that keeps playing off the lesson screen; lessons stop when you leave for now. */
export const MINI_PLAYER = false;
/** The lesson's full content, or undefined while it's coming soon. */
export const dayOf = (id: string) => LESSON_DAYS[id];
export const isSoon = (id: string) => !LESSON_DAYS[id];
export const hasQuickCheck = (id: string) => id in QUICK_CHECKS;
export const lessonDay = (id: string) => { const d = dayOf(id); return d ? `Day ${d.day}` : `Day ${ALL_IDS.indexOf(id)}`; };

/** Every step of the lesson is finished: your call, video, build (if any), prove it, follow-ups (if any). */
export function flowDone(s: CourseState, id: string) {
  const d = dayOf(id);
  if (!d) return false;
  const p = s.lessons[id] ?? {};
  const c = d.copy[s.lang];
  return !!(p.pre && p.watched && p.post && (!c.estimates?.length || p.est) && (!c.build || p.built !== undefined) && (!c.design || p.design) && (!c.followUps?.length || p.follow));
}

/** Saves a lesson step and counts today towards the streak. */
export function updateLesson(s: CourseState, id: string, patch: Partial<LessonProgress> | null, now = Date.now()): CourseState {
  const today = localDate(new Date(now));
  const activeDays = s.activeDays.includes(today) ? s.activeDays : [...s.activeDays, today];
  return { ...s, lessons: { ...s.lessons, [id]: patch ? { ...(s.lessons[id] ?? {}), ...patch } : {} }, activeDays };
}

const dayKey = (d: Date) => localDate(d);
/** Current streak (days in a row up to today, or up to yesterday if today isn't done yet) and the longest run. */
export function streak(s: CourseState, now = Date.now()) {
  const days = new Set(s.activeDays);
  const d = new Date(now);
  if (!days.has(dayKey(d))) d.setDate(d.getDate() - 1);
  let current = 0;
  while (days.has(dayKey(d))) { current++; d.setDate(d.getDate() - 1); }
  const sorted = [...days].sort();
  let longest = 0, run = 0, prev: Date | null = null;
  for (const k of sorted) {
    const [y, m, dd] = k.split("-").map(Number);
    const cur = new Date(y, m - 1, dd);
    run = prev && Math.round((cur.getTime() - prev.getTime()) / 864e5) === 1 ? run + 1 : 1;
    longest = Math.max(longest, run);
    prev = cur;
  }
  return { current, longest, today: days.has(localDate(new Date(now))) };
}

/** 1 if the answer is right. Short answers pass when they name both consistency and availability. */
export function grade(q: Question, a: Answer | undefined): number {
  switch (q.type) {
    case "mcq":
    case "timed":
    case "diagram":
      return a === q.ans ? 1 : 0;
    case "multi":
      return Array.isArray(a) && a.length === q.ans.length && q.ans.every((x) => a.includes(x)) ? 1 : 0;
    case "order":
      return ((Array.isArray(a) ? a : q.start) as number[]).every((v, i) => v === i) ? 1 : 0;
    case "text": {
      const t = (typeof a === "string" ? a : "").toLowerCase();
      return /consisten/.test(t) && /availab/.test(t) ? 1 : 0;
    }
  }
}

/** Whether the question has an answer good enough to enable Next. */
export function isAnswered(q: Question, a: Answer | undefined) {
  if (q.type === "order") return true;
  if (q.type === "multi") return Array.isArray(a) && a.length > 0;
  if (q.type === "text") return typeof a === "string" && a.trim().length > 3;
  return a !== undefined;
}

const toast = (msg: string, now: number, ms = 2600) => ({ toast: msg, toastUntil: now + ms });

/** A first visit: nothing done, no baseline yet, the course opens on Day 0. */
export function defaultState(now = Date.now()): CourseState {
  return {
    screen: "splash", tab: "home", onboarded: false, onb: 0, splashUntil: now + 1800,
    cur: "0-0", t: 0, playing: false, speed: 1, visited: false, miniHide: null, ended: false, upNext: 0,
    notes: {}, draft: "", ptab: "notes", openMod: 0, done: [],
    quiz: { kind: "pre", stage: "intro", idx: 0, answers: {} }, timeLeft: TIMED_SECONDS, confirmExit: false,
    pre: [], post: null, lastKind: "pre",
    qcOpen: false, qcPick: null, qcDone: [],
    notifs: NOTIFICATIONS, threads: THREADS, voted: {}, openThread: null, qDraft: "",
    dl: [], dlProg: {},
    offline: false, vidErr: false, recapMod: 0,
    goal: 15, remind: "19:00", autoplay: false, quality: "auto", wifiOnly: true, streakRem: true, replyNotif: true,
    todaySec: 0, today: localDate(new Date(now)),
    toast: null, toastUntil: 0,
    lessons: {}, lang: "en", subs: true, subLang: "hinglish", subSize: "m", audio: "Hinglish", volume: 1, muted: false,
    toured: false, activeDays: [],
  };
}

/** Screens the app can open on with `?start=`, matching the design canvas frames. */
export const START_SCREENS = [
  "home", "course", "player", "pre", "post", "q", "results", "progress", "qc", "preresults", "mini", "transcript", "exit",
  "splash", "onboard", "onboard2", "profile", "notifs", "notifsempty", "downloads", "dlempty", "discuss", "recap", "offline", "videoerr",
] as const;
export type StartScreen = (typeof START_SCREENS)[number];

/** A preview state for one design frame. `q` picks the question for "q"; `seedPost` adds a finished post-assessment. */
export function previewState(start: StartScreen, opts: { q?: number; seedPost?: boolean } = {}, now = Date.now()): CourseState {
  const s: CourseState = { ...defaultState(now), screen: "home", onboarded: true, pre: [1, 0, 0, 1, 0, 0], done: ["0-0"], cur: "1-0" };
  if (opts.seedPost) s.post = [1, 1, 1, 1, 0, 1];
  switch (start) {
    case "course": return { ...s, screen: "course", tab: "course" };
    case "progress": return { ...s, screen: "progress", tab: "progress" };
    case "player": return { ...s, screen: "player", visited: true };
    case "pre":
    case "post": return { ...s, screen: "quiz", quiz: { kind: start, stage: "intro", idx: 0, answers: {} } };
    case "q": {
      const i = Math.min(Math.max(opts.q ?? 0, 0), QUESTIONS.length - 1);
      const answers: Record<number, Answer> = {};
      if (i === 0) answers[0] = 0;
      if (i === 1) answers[1] = [0];
      if (i === 2) answers[2] = 1;
      return { ...s, screen: "quiz", quiz: { kind: "post", stage: "q", idx: i, answers } };
    }
    case "splash": return { ...s, screen: "splash", onboarded: false, splashUntil: now + 1800 };
    case "onboard": return { ...s, screen: "onboard", onboarded: false };
    case "onboard2": return { ...s, screen: "onboard", onboarded: false, onb: 2 };
    case "profile": return { ...s, screen: "profile", tab: "profile" };
    case "notifs": return { ...s, screen: "notifs" };
    case "notifsempty": return { ...s, screen: "notifs", notifs: [] };
    case "downloads": return { ...s, screen: "downloads", dlProg: { "2-2": 40 } };
    case "dlempty": return { ...s, screen: "downloads", dl: [] };
    case "discuss": return { ...s, screen: "player", visited: true };
    case "recap": return { ...s, screen: "recap", recapMod: 0, done: ["0-0"], cur: "1-0", t: 0 };
    case "offline": return { ...s, screen: "course", tab: "course", offline: true };
    case "videoerr": return { ...s, screen: "player", visited: true, vidErr: true };
    case "mini": return { ...s, visited: true, playing: true };
    case "transcript": return { ...s, screen: "player", visited: true, ptab: "transcript" };
    case "exit": return { ...s, screen: "quiz", quiz: { kind: "post", stage: "q", idx: 2, answers: { 0: 0, 1: [0], 2: 1 } }, confirmExit: true };
    case "qc": return { ...s, screen: "player", visited: true };
    case "preresults": return { ...s, screen: "results", lastKind: "pre" };
    case "results": return { ...s, screen: "results", post: s.post ?? [1, 1, 1, 1, 0, 1], lastKind: "post" };
    default: return s;
  }
}

/** Advances one second: splash, downloads, today's minutes, toasts and the timed question. */
export function tick(s: CourseState, now = Date.now()): CourseState {
  let n = s;
  const set = (p: Partial<CourseState>) => { n = { ...n, ...p }; };

  if (n.screen === "splash" && n.splashUntil && now > n.splashUntil) set({ screen: "onboard", onb: 0 });

  if (Object.keys(n.dlProg).length && !n.offline) {
    const dlProg = { ...n.dlProg };
    const dl = [...n.dl];
    for (const id of Object.keys(dlProg)) {
      dlProg[id] = Math.min(100, dlProg[id] + 9);
      if (dlProg[id] >= 100) {
        delete dlProg[id];
        dl.push({ id, size: 80 + ((id.charCodeAt(0) * 37 + id.charCodeAt(2) * 13) % 70) });
      }
    }
    set({ dlProg, dl });
  }

  // The <video> element moves the playhead; here we only count today's minutes while it plays.
  if (n.screen === "player" && n.playing && !blocked(n)) set({ todaySec: n.todaySec + n.speed });

  if (n.toast && now > n.toastUntil) set({ toast: null });

  if (n.screen === "quiz" && n.quiz.stage === "q" && QUESTIONS[n.quiz.idx].type === "timed" && !n.confirmExit) {
    if (n.timeLeft <= 1) n = nextQuestion(n);
    else set({ timeLeft: n.timeLeft - 1 });
  }
  return n;
}

export function openLesson(s: CourseState, id: string, now = Date.now()): CourseState {
  if (isSoon(id)) return { ...s, ...toast(`${lesson(id).title.split(":")[0]} is coming soon`, now) };
  const same = id === s.cur;
  return { ...s, screen: "player", cur: id, t: same ? s.t : 0, playing: same ? s.playing : false, visited: true, miniHide: null, ended: false, upNext: 0, qcOpen: false };
}

/** Marks the current lesson done and moves on: to the next lesson, or to the recap when a module is finished. */
export function completeNext(s: CourseState, auto: boolean, now = Date.now()): CourseState {
  if (dayOf(s.cur) && !flowDone(s, s.cur)) return { ...s, ...toast("Finish today’s practice first", now) };
  const nextId = ALL_IDS[ALL_IDS.indexOf(s.cur) + 1];
  const done = s.done.includes(s.cur) ? s.done : [...s.done, s.cur];
  const cmi = lesson(s.cur).mi;
  const t = toast(`Lesson complete. ${s.todaySec >= s.goal * 60 ? "Daily goal met." : "Counts toward today’s goal."}`, now);
  const reset = { ended: false, upNext: 0, qcOpen: false };
  if (moduleIds(cmi).every((id) => done.includes(id)) && (!nextId || lesson(nextId).mi !== cmi)) {
    return { ...s, ...reset, done, cur: nextId ?? s.cur, t: 0, playing: false, screen: "recap", recapMod: cmi, openMod: nextId ? lesson(nextId).mi : cmi };
  }
  if (nextId && isSoon(nextId)) return { ...s, ...reset, ...toast(`Done! ${lesson(nextId).title.split(":")[0]} is coming soon.`, now), done, playing: false, screen: "home", tab: "home" };
  if (nextId) return { ...s, ...reset, ...t, done, cur: nextId, t: 0, playing: auto, openMod: lesson(nextId).mi };
  return { ...s, ...reset, ...t, done };
}

export function startQuiz(s: CourseState, kind: QuizKind): CourseState {
  return { ...s, screen: "quiz", quiz: { kind, stage: "intro", idx: 0, answers: {} }, timeLeft: TIMED_SECONDS, playing: false, confirmExit: false };
}

export function setAnswer(s: CourseState, v: Answer): CourseState {
  return { ...s, quiz: { ...s.quiz, answers: { ...s.quiz.answers, [s.quiz.idx]: v } } };
}

/** Next question, or grade the attempt and open the results after the last one. */
export function nextQuestion(s: CourseState): CourseState {
  const q = s.quiz;
  if (q.idx < QUESTIONS.length - 1) return { ...s, quiz: { ...q, idx: q.idx + 1 }, timeLeft: TIMED_SECONDS };
  const scores = QUESTIONS.map((qq, i) => grade(qq, q.answers[i]));
  return { ...s, [q.kind]: scores, lastKind: q.kind, screen: "results", timeLeft: TIMED_SECONDS };
}

/** Toggling an option on a choice question: multi-select adds or removes, the rest pick one. */
export function pickOption(s: CourseState, i: number): CourseState {
  const q = QUESTIONS[s.quiz.idx];
  const a = s.quiz.answers[s.quiz.idx];
  if (q.type === "multi") {
    const cur = Array.isArray(a) ? a : [];
    return setAnswer(s, cur.includes(i) ? cur.filter((x) => x !== i) : [...cur, i]);
  }
  return setAnswer(s, i);
}

export function openNotification(s: CourseState, n: Notif): CourseState {
  const base = { ...s, notifs: s.notifs.map((x) => (x.id === n.id ? { ...x, unread: false } : x)) };
  switch (n.go) {
    case "discuss": return { ...openLesson(base, "2-1"), ptab: "discuss", openThread: "t3" };
    case "player": return openLesson(base, base.cur);
    case "progress": return { ...base, screen: "progress", tab: "progress" };
    case "course": return { ...base, screen: "course", tab: "course", openMod: 3 };
    case "preresults": return { ...base, screen: "results", lastKind: "pre" };
  }
}

export function answerQuickCheck(s: CourseState, i: number): CourseState {
  return s.qcPick === null ? { ...s, qcPick: i } : s;
}

/** Leaves the quick check: keep watching, rewatch the last minute, or skip. */
export function closeQuickCheck(s: CourseState, how: "continue" | "rewatch" | "skip", now = Date.now()): CourseState {
  const base = { ...s, qcOpen: false, qcDone: s.qcDone.includes(s.cur) ? s.qcDone : [...s.qcDone, s.cur], playing: true };
  if (how === "rewatch") return { ...base, t: Math.max(0, quickCheckAt(s.cur) - 60) };
  if (how === "continue") return { ...base, ...toast("Quick check done. Streak safe today.", now) };
  return base;
}

export function addNote(s: CourseState, now = Date.now()): CourseState {
  const text = s.draft.trim();
  if (!text) return s;
  return { ...s, notes: { ...s.notes, [s.cur]: [...(s.notes[s.cur] ?? []), { t: s.t, text }] }, draft: "", ...toast(`Note pinned at ${fmt(s.t)}`, now, 2200) };
}

export function postQuestion(s: CourseState, now = Date.now()): CourseState {
  const text = s.qDraft.trim();
  if (!text) return s;
  const th: Thread = { id: `n${now}`, name: "You", ini: "PS", ago: "now", t: s.t, text, votes: 0, replies: [] };
  return { ...s, threads: { ...s.threads, [s.cur]: [...(s.threads[s.cur] ?? []), th] }, qDraft: "", ...toast(`Question posted at ${fmt(s.t)}`, now, 2200) };
}

export function toggleDownload(s: CourseState, now = Date.now()): CourseState {
  if (isDownloaded(s, s.cur)) return { ...s, dl: s.dl.filter((y) => y.id !== s.cur), ...toast("Removed from downloads", now, 2000) };
  if (s.cur in s.dlProg) return s;
  return { ...s, dlProg: { ...s.dlProg, [s.cur]: 0 } };
}

export function removeDownload(s: CourseState, id: string, now = Date.now()): CourseState {
  const dlProg = { ...s.dlProg };
  delete dlProg[id];
  return { ...s, dl: s.dl.filter((y) => y.id !== id), dlProg, ...toast("Removed from downloads", now, 2000) };
}

/** Lessons of the current module not yet downloaded or downloading. */
export function missingDownloads(s: CourseState) {
  return moduleIds(lesson(s.cur).mi).filter((id) => !isDownloaded(s, id) && !(id in s.dlProg));
}

export function downloadModule(s: CourseState): CourseState {
  const dlProg = { ...s.dlProg };
  for (const id of missingDownloads(s)) dlProg[id] = 0;
  return { ...s, dlProg };
}

export function retryVideo(s: CourseState, now = Date.now()): CourseState {
  if (s.vidErr) return { ...s, vidErr: false, ...toast(`Video loaded. Picking up at ${fmt(s.t)}`, now, 2200) };
  return { ...s, ...toast("Still offline", now, 1800) };
}

export function togglePlay(s: CourseState): CourseState {
  if (blocked(s)) return s;
  const d = lesson(s.cur).secs;
  return { ...s, playing: !s.playing, t: s.t >= d ? 0 : s.t, ended: false, upNext: 0 };
}

export function seekTo(s: CourseState, t: number): CourseState {
  return { ...s, t: Math.min(lesson(s.cur).secs, Math.max(0, Math.round(t))), ended: false, upNext: 0 };
}

/** Closing a started assessment asks first; an unstarted one just closes. */
export function closeQuiz(s: CourseState): CourseState {
  if (s.quiz.stage === "q" && Object.keys(s.quiz.answers).length) return { ...s, confirmExit: true };
  return { ...s, screen: s.tab, confirmExit: false };
}

export interface Badge { name: string; icon: "play" | "target" | "flame" | "zap" | "note" | "trending" | "db" | "award"; on: boolean }

export function badges(s: CourseState, now = Date.now()): Badge[] {
  const modDone = (mi: number) => moduleIds(mi).every((id) => s.done.includes(id));
  const st = streak(s, now);
  return [
    { name: "First lesson", icon: "play", on: s.done.length > 0 },
    { name: "Baseline set", icon: "target", on: s.pre.length > 0 },
    { name: "7-day streak", icon: "flame", on: st.longest >= 7 },
    { name: "Started right", icon: "zap", on: modDone(0) },
    { name: "Note taker", icon: "note", on: allNotes(s).length >= 3 },
    { name: "+30 points", icon: "trending", on: scoreDelta(s) >= 30 },
    { name: "Builder", icon: "db", on: Object.values(s.lessons).some((p) => p.built !== undefined) },
    { name: "Course complete", icon: "award", on: s.done.length === LESSON_COUNT },
  ];
}

/** Post minus pre, in percentage points. 0 before the post-assessment. */
export function scoreDelta(s: CourseState) {
  if (!s.post) return 0;
  const sum = (a: number[]) => a.reduce((x, y) => x + y, 0);
  return Math.round(((sum(s.post) - sum(s.pre)) / QUESTIONS.length) * 100);
}

/** Fields kept in storage between visits. Preview switches and transient UI stay out. */
const PERSISTED = [
  "onboarded", "cur", "t", "speed", "visited", "notes", "ptab", "openMod", "done", "pre", "post", "qcDone", "notifs", "threads", "voted",
  "dl", "dlProg", "goal", "remind", "autoplay", "quality", "wifiOnly", "streakRem", "replyNotif", "todaySec", "today",
  "lessons", "lang", "subs", "subLang", "subSize", "audio", "volume", "muted", "toured", "activeDays",
] as const satisfies readonly (keyof CourseState)[];

export function toStored(s: CourseState) {
  return Object.fromEntries(PERSISTED.map((k) => [k, s[k]]));
}

/** Restores saved progress over the defaults. Today's minutes reset on a new day. */
export function fromStored(raw: unknown, now = Date.now()): CourseState {
  const base = defaultState(now);
  if (!raw || typeof raw !== "object") return base;
  const saved = raw as Partial<CourseState>;
  const s: CourseState = { ...base };
  for (const k of PERSISTED) if (k in saved && saved[k] !== undefined) (s as unknown as Record<string, unknown>)[k] = saved[k];
  if (!ALL_IDS.includes(s.cur) || isSoon(s.cur)) s.cur = base.cur;
  if (s.today !== localDate(new Date(now))) Object.assign(s, { todaySec: 0, today: localDate(new Date(now)) });
  s.screen = s.onboarded ? "home" : "splash";
  return s;
}

/** Progress from the standalone Day pages (/system-design/day-N), carried over once on a first visit. */
export function migrateLegacy(s: CourseState, legacy: { day0?: LessonProgress | null; day1?: LessonProgress | null; lang?: unknown }, now = Date.now()): CourseState {
  let n = s;
  for (const [id, p] of [["0-0", legacy.day0], ["1-0", legacy.day1]] as const) {
    if (p && typeof p === "object" && !n.lessons[id]) n = updateLesson(n, id, p, now);
  }
  if ((legacy.lang === "en" || legacy.lang === "hi") && !s.lessons["0-0"] && !s.lessons["1-0"]) n = { ...n, lang: legacy.lang };
  return n;
}

/** `?lesson=<id>`: open straight into that lesson, skipping the splash and intro (links from Instagram land here). */
export function deepLink(s: CourseState, id: string | null, now = Date.now()): CourseState {
  if (!id || !ALL_IDS.includes(id) || isSoon(id)) return s;
  return openLesson({ ...s, onboarded: true, tab: "course" }, id, now);
}

/** Clamped to the allowed range, in steps of 0.05 so the label never shows float noise. */
export function setSpeed(s: CourseState, v: number): CourseState {
  const speed = Math.round(Math.min(SPEED_MAX, Math.max(SPEED_MIN, v)) * 20) / 20;
  return speed === s.speed ? s : { ...s, speed };
}

/** The next preset up or down from the current speed (which may sit between presets). */
export function stepSpeed(s: CourseState, dir: 1 | -1): CourseState {
  const next = dir > 0 ? SPEED_PRESETS.find((p) => p > s.speed + 1e-9) : [...SPEED_PRESETS].reverse().find((p) => p < s.speed - 1e-9);
  return next === undefined ? s : setSpeed(s, next);
}

/** "1×", "1.25×", "0.8×". */
export const speedLabel = (v: number) => `${Number(v.toFixed(2))}×`;

/** Subtitle lines for a lesson in a language, or none. Hinglish are the video's own captions. */
export function subtitleLines(id: string, lang: SubLang): [number, string][] {
  return (lang === "en" ? SUBTITLES_EN[id] : TRANSCRIPTS[id]) ?? [];
}

/** Languages a lesson has subtitles in. */
export const subtitleLangs = (id: string) => SUB_LANGS.filter(([l]) => subtitleLines(id, l).length > 0);

/** The line being spoken at `t`, or "". */
export function lineAt(lines: [number, string][], t: number) {
  let cur = "";
  for (const [at, text] of lines) if (t >= at) cur = text;
  return cur;
}

/** The voice-overs a lesson's video has: the original first, then any others. */
export function audioTracks(id: string) {
  const v = dayOf(id)?.video;
  if (!v) return [];
  return [{ lang: v.lang, src: v.src, wide: v.wide?.src }, ...(v.audio ?? [])];
}

/** The track to play: the chosen language when this lesson has it, else the original. */
export function audioTrack(s: CourseState, id = s.cur) {
  const all = audioTracks(id);
  return all.find((a) => a.lang === s.audio) ?? all[0];
}

