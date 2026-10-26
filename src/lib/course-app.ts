import {
  LESSON_DAYS,
  MODULES,
  NOTIFICATIONS,
  QUESTIONS,
  QUICK_CHECKS,
  TRANSCRIPTS,
  TIMED_SECONDS,
  type Notif,
  type Question,
} from "@/data/system-design/course-app";
import { SUBTITLES_EN } from "@/data/system-design/subtitles-en";
import type { Day, Lang, Question as ChoiceQuestion } from "@/data/system-design/types";

/**
 * State and transitions for the System Design course app. Everything here is
 * pure: the component layer owns timers, storage and the DOM. `t` is the
 * lesson video's playhead in seconds, reported by the <video> element.
 */

export type Screen =
  | "splash" | "onboard" | "commit" | "home" | "course" | "progress" | "profile"
  | "player" | "quiz" | "results" | "notifs" | "downloads" | "recap";
export type Tab = "home" | "course" | "progress" | "profile";
export type PlayerTab = "lessons" | "qna" | "notes" | "transcript";
/** "pre" is the retired course baseline; only the final assessment ("post") is taken now. */
export type QuizKind = "pre" | "post";
export type Answer = number | number[] | string;

export interface Note { t: number; text: string }

/** A lesson's own steps: the video, learn, prove it, build it, follow-ups. */
export interface LessonProgress {
  /** Sent the end-of-day feedback. */
  feedback?: boolean;
  watched?: boolean; read?: boolean; post?: number[];
  /** Estimate answers, as typed. */
  est?: number[];
  built?: number;
  /** The design attempt, and the self-check ticks after the walkthrough. */
  design?: string; checks?: boolean[];
  follow?: boolean[];
  /**
   * The lesson check ("Prove it"): 5 questions, 60% to pass. `post` holds the
   * passing attempt's picks; `check` is the best score so far (0–100); the
   * last attempt's picks stay in `checkPicks` for its results. A fail sets
   * `failed`, and a retake opens once the video is watched again (`rewatched`).
   */
  check?: number; checkPicks?: number[]; tries?: number; failed?: boolean; rewatched?: boolean;
  /** Seconds of video actually played since the last miss; skipping ahead does not count. */
  rewatchSec?: number;
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
  /**
   * Which step the lesson's main column is showing. One step at a time, in
   * place of the video: nothing scrolls, and finishing one opens the next.
   */
  stage: StepKey;
  /** The assessment is mid-attempt, so stepping away would lose it (not saved: a reload returns to the video). */
  checkBusy: boolean;
  /** Local dates (YYYY-MM-DD) with any finished step: the streak. */
  activeDays: string[];
  /** The promise made after the welcome: signed name and local date. */
  commitment: { name: string; date: string } | null;
  /** The streak pop-up is open; `popDay` is the last day it was shown (once a day, on the first pass). */
  streakPop: boolean;
  popDay: string;
}

/** How many of `picks` landed on the best choice. */
export const score = (questions: ChoiceQuestion[], picks: number[]) =>
  picks.filter((p, k) => questions[k]?.choices[p]?.best).length;

export type StepKey = "watch" | "reveal" | "prove" | "estimate" | "build" | "design" | "follow" | "done";

/** The lesson's steps in order: watch → learn → prove it → estimate → build it → design it → follow-ups → done. Each opens when the one before it is done. */
export function lessonSteps(s: CourseState, id: string, day: Day) {
  const c = day.copy[s.lang];
  const p: LessonProgress = s.lessons[id] ?? {};
  const steps: { key: StepKey; done: boolean; open: boolean }[] = [
    { key: "watch", done: !!p.watched, open: true },
    { key: "reveal", done: !!p.read || !!p.post, open: !!p.watched },
    { key: "prove", done: !!p.post, open: !!p.watched },
  ];
  const add = (key: StepKey, done: boolean) => steps.push({ key, done, open: steps[steps.length - 1].done });
  if (c.estimates?.length) add("estimate", !!p.est);
  if (c.build) add("build", p.built !== undefined);
  if (c.design) add("design", !!p.design);
  if (c.followUps?.length) add("follow", !!p.follow);
  steps.push({ key: "done", done: s.done.includes(id), open: flowDone(s, id) });
  return steps;
}

/**
 * The step a lesson opens on: the first one still to do, or the video when the
 * day is finished. "Learn" is never it — the day runs video → assessment →
 * practice, and what really happened is reference, opened from the step bar.
 */
export function stageFor(s: CourseState, id: string): StepKey {
  const d = dayOf(id);
  if (!d) return "watch";
  return lessonSteps(s, id, d).find((x) => x.open && !x.done && x.key !== "reveal")?.key ?? "watch";
}

/** The lesson check: questions per lesson and the share needed to pass. */
export const CHECK_SIZE = 5;
export const PASS_MARK = 0.6;

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

/** Every step of the lesson is finished: video, learn, prove it, build (if any), follow-ups (if any). */
export function flowDone(s: CourseState, id: string) {
  const d = dayOf(id);
  if (!d) return false;
  const p = s.lessons[id] ?? {};
  const c = d.copy[s.lang];
  return !!(p.watched && p.post && (!c.estimates?.length || p.est) && (!c.build || p.built !== undefined) && (!c.design || p.design) && (!c.followUps?.length || p.follow));
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
    notes: {}, draft: "", ptab: "lessons", openMod: 0, done: [],
    quiz: { kind: "pre", stage: "intro", idx: 0, answers: {} }, timeLeft: TIMED_SECONDS, confirmExit: false,
    pre: [], post: null, lastKind: "pre",
    qcOpen: false, qcPick: null, qcDone: [],
    notifs: NOTIFICATIONS,
    dl: [], dlProg: {},
    offline: false, vidErr: false, recapMod: 0,
    goal: 15, remind: "19:00", autoplay: false, quality: "auto", wifiOnly: true, streakRem: true, replyNotif: true,
    todaySec: 0, today: localDate(new Date(now)),
    toast: null, toastUntil: 0,
    commitment: null, streakPop: false, popDay: "",
    lessons: {}, lang: "en", subs: true, subLang: "hinglish", subSize: "m", audio: "Hinglish", volume: 1, muted: false,
    toured: false, stage: "watch", checkBusy: false, activeDays: [],
  };
}

/** Screens the app can open on with `?start=`, matching the design canvas frames. */
export const START_SCREENS = [
  "home", "course", "player", "post", "q", "results", "progress", "qc", "mini", "transcript", "exit",
  "commit", "commitdone", "streak", "lesson", "lessonpass", "lessonfail", "retake", "estimate",
  "splash", "onboard", "onboard2", "profile", "notifs", "notifsempty", "downloads", "dlempty", "discuss", "recap", "offline", "videoerr",
] as const;
export type StartScreen = (typeof START_SCREENS)[number];

/** A preview state for one design frame. `q` picks the question for "q"; `seedPost` adds a finished post-assessment. */
export function previewState(start: StartScreen, opts: { q?: number; seedPost?: boolean } = {}, now = Date.now()): CourseState {
  const s: CourseState = {
    ...defaultState(now), screen: "home", onboarded: true, toured: true, done: ["0-0"], cur: "1-0",
    lessons: { "0-0": { watched: true, read: true, post: [0, 0, 0, 0, 1], check: 80, checkPicks: [0, 0, 0, 0, 1], tries: 1 } },
    commitment: { name: "Priya Sharma", date: localDate(new Date(now)) },
  };
  /** Day 1 opened past the video, with the check in some state. These frames are about the check, so the column shows it. */
  const atCheck = (p: Partial<LessonProgress>): CourseState => ({
    ...s, screen: "player", visited: true, stage: "prove", lessons: { ...s.lessons, "1-0": { watched: true, read: true, ...p } },
  });
  if (opts.seedPost) s.post = [1, 1, 1, 1, 0, 1];
  switch (start) {
    case "course": return { ...s, screen: "course", tab: "course" };
    case "progress": return { ...s, screen: "progress", tab: "progress" };
    case "player": return { ...s, screen: "player", visited: true };
    case "post": return { ...s, screen: "quiz", quiz: { kind: "post", stage: "intro", idx: 0, answers: {} } };
    case "commit": return { ...s, screen: "commit", commitment: null };
    case "commitdone": return { ...s, screen: "commit" };
    case "streak": return { ...s, activeDays: [localDate(new Date(now))], streakPop: true };
    case "lesson": return atCheck({});
    case "lessonpass": return atCheck({ post: [0, 0, 0, 0, 1], check: 80, checkPicks: [0, 0, 0, 0, 1], tries: 1 });
    case "lessonfail": return atCheck({ check: 40, checkPicks: [0, 1, 1, 0, 2], tries: 1, failed: true });
    case "retake": return atCheck({ check: 40, checkPicks: [0, 1, 1, 0, 2], tries: 1, failed: true, rewatched: true });
    case "estimate": return { ...atCheck({ post: [0, 0, 0, 0, 1], check: 80, checkPicks: [0, 0, 0, 0, 1], tries: 1 }), stage: "estimate" };
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
    case "recap": return { ...s, screen: "recap", recapMod: 0, done: ["0-0"], cur: "1-0", t: 0 };
    case "offline": return { ...s, screen: "course", tab: "course", offline: true };
    case "videoerr": return { ...s, screen: "player", visited: true, vidErr: true };
    case "mini": return { ...s, visited: true, playing: true };
    case "transcript": return { ...s, screen: "player", visited: true, ptab: "transcript" };
    case "exit": return { ...s, screen: "quiz", quiz: { kind: "post", stage: "q", idx: 2, answers: { 0: 0, 1: [0], 2: 1 } }, confirmExit: true };
    case "qc": return { ...s, screen: "player", visited: true };
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

export function openLesson(s: CourseState, id: string, now = Date.now(), force = false): CourseState {
  if (isSoon(id)) return { ...s, ...toast(`${lesson(id).title.split(":")[0]} is coming soon`, now) };
  if (!force && isLocked(s, id)) return { ...s, ...toast("Pass the previous lesson’s assessment to unlock this one", now, 2400) };
  const same = id === s.cur;
  return { ...s, screen: "player", cur: id, t: same ? s.t : 0, playing: same ? s.playing : false, visited: true, miniHide: null, ended: false, upNext: 0, qcOpen: false, stage: stageFor(s, id), checkBusy: false };
}

/** Marks the current lesson done and moves on: to the next lesson, or to the recap when a module is finished. */
export function completeNext(s: CourseState, auto: boolean, now = Date.now()): CourseState {
  if (dayOf(s.cur) && !flowDone(s, s.cur)) return { ...s, ...toast("Finish today’s practice first", now) };
  const nextId = ALL_IDS[ALL_IDS.indexOf(s.cur) + 1];
  const done = s.done.includes(s.cur) ? s.done : [...s.done, s.cur];
  const cmi = lesson(s.cur).mi;
  const t = toast(`Lesson complete. ${s.todaySec >= s.goal * 60 ? "Daily goal met." : "Counts toward today’s goal."}`, now);
  // The next lesson starts on its video, not on the step this one finished on.
  const reset = { ended: false, upNext: 0, qcOpen: false, stage: "watch" as StepKey, checkBusy: false };
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

export interface Badge { name: string; description: string; icon: "play" | "target" | "flame" | "zap" | "note" | "trending" | "db" | "award"; on: boolean }

export function badges(s: CourseState, now = Date.now()): Badge[] {
  const modDone = (mi: number) => moduleIds(mi).every((id) => s.done.includes(id));
  const st = streak(s, now);
  return [
    { name: "First lesson", description: "Finished my first System Design lesson.", icon: "play", on: s.done.length > 0 },
    { name: "First pass", description: "Passed my first System Design lesson assessment.", icon: "target", on: Object.values(s.lessons).some((p) => !!p.post) },
    { name: "7-day streak", description: "Kept learning for seven consecutive days.", icon: "flame", on: st.longest >= 7 },
    { name: "Started right", description: "Finished the first System Design module.", icon: "zap", on: modDone(0) },
    { name: "Note taker", description: "Saved three notes from my learning journey.", icon: "note", on: allNotes(s).length >= 3 },
    { name: "Perfect score", description: "Scored 100% on a System Design lesson assessment.", icon: "trending", on: Object.values(s.lessons).some((p) => p.check === 100) },
    { name: "Builder", description: "Submitted my first architecture practice answer.", icon: "db", on: Object.values(s.lessons).some((p) => p.built !== undefined) },
    { name: "Course complete", description: "Finished every lesson in the System Design course.", icon: "award", on: ALL_IDS.every((id) => s.done.includes(id)) },
  ];
}

/** Fields kept in storage between visits. Preview switches and transient UI stay out. */
const PERSISTED = [
  "onboarded", "cur", "t", "speed", "visited", "notes", "openMod", "done", "pre", "post", "qcDone", "notifs",
  "dl", "dlProg", "goal", "remind", "autoplay", "quality", "wifiOnly", "streakRem", "replyNotif", "todaySec", "today",
  "lessons", "lang", "subs", "subLang", "subSize", "audio", "volume", "muted", "toured", "activeDays", "commitment", "popDay",
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

/** A Day page's saved progress. `pre` came from the opening quiz those pages had, which this course no longer asks. */
type LegacyProgress = Partial<LessonProgress> & { pre?: number[] };

/** Progress from the standalone Day pages (/system-design/day-N), carried over once on a first visit. */
export function migrateLegacy(s: CourseState, legacy: { day0?: LegacyProgress | null; day1?: LegacyProgress | null; lang?: unknown }, now = Date.now()): CourseState {
  let n = s;
  for (const [id, p] of [["0-0", legacy.day0], ["1-0", legacy.day1]] as const) {
    if (!p || typeof p !== "object" || n.lessons[id]) continue;
    const keep = { ...p };
    delete keep.pre;
    n = updateLesson(n, id, keep, now);
  }
  if ((legacy.lang === "en" || legacy.lang === "hi") && !s.lessons["0-0"] && !s.lessons["1-0"]) n = { ...n, lang: legacy.lang };
  return n;
}

/** `?lesson=<id>`: open straight into that lesson, skipping the splash and intro (links from Instagram land here). */
export function deepLink(s: CourseState, id: string | null, now = Date.now()): CourseState {
  if (!id || !ALL_IDS.includes(id) || isSoon(id)) return s;
  // Back from "Continue with Google" on the welcome, or a first visit: the commitment comes before Day 0.
  if (id === "0-0" && !s.commitment && s.done.length === 0) return { ...s, onboarded: true, tab: "course", cur: id, screen: "commit" };
  // Shared links open their lesson even when it's still locked here.
  return openLesson({ ...s, onboarded: true, tab: "course" }, id, now, true);
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

/** Locked until the lesson before it is passed (or done). Lessons not out yet are handled as "coming soon". */
export function isLocked(s: CourseState, id: string) {
  // Learners already in a lesson keep it: the check arrived after they had moved on.
  if (id === s.cur || s.done.includes(id) || Object.keys(s.lessons[id] ?? {}).length) return false;
  const i = ALL_IDS.indexOf(id);
  const prev = ALL_IDS[i - 1];
  if (!prev || !dayOf(prev)) return false;
  return !s.lessons[prev]?.post && !s.done.includes(prev);
}

/** A check attempt's score, 0–100. */
export function checkPct(questions: ChoiceQuestion[], picks: number[]) {
  if (!questions.length) return 0;
  return Math.round((picks.filter((p, k) => questions[k]?.choices[p]?.best).length / questions.length) * 100);
}

export const passed = (pct: number) => pct >= PASS_MARK * 100;

/**
 * Grades a lesson check. A pass saves it as the lesson's "Prove it" and, the
 * first time today, opens the streak pop-up. A fail asks for a rewatch first.
 */
export function submitCheck(s: CourseState, id: string, questions: ChoiceQuestion[], picks: number[], now = Date.now()): CourseState {
  const pct = checkPct(questions, picks);
  const was = s.lessons[id] ?? {};
  const best = Math.max(was.check ?? 0, pct);
  const tries = (was.tries ?? 0) + 1;
  if (!passed(pct)) {
    return updateLesson(s, id, { check: was.post ? best : pct, checkPicks: picks, tries, failed: !was.post, rewatched: false, rewatchSec: 0 }, now);
  }
  const n = updateLesson(s, id, { post: picks, read: true, check: best, checkPicks: picks, tries, failed: false, rewatched: false }, now);
  const today = localDate(new Date(now));
  return n.popDay === today ? n : { ...n, streakPop: true, popDay: today };
}

/** Share of the video that must be played again after a miss before the retake opens. */
export const REWATCH_SHARE = 0.85;

/**
 * Counts seconds played after a missed check. Only real playback counts:
 * the caller passes the gap between two time updates, and a jump (a seek or
 * a skip) is too large to be playback, so it adds nothing.
 */
export function addRewatch(s: CourseState, id: string, played: number, duration: number): CourseState {
  const p = s.lessons[id];
  if (!p?.failed || p.rewatched || !(duration > 0) || !(played > 0) || played > 2) return s;
  const sec = (p.rewatchSec ?? 0) + played;
  const n = { ...s, lessons: { ...s.lessons, [id]: { ...p, rewatchSec: sec } } };
  return sec >= duration * REWATCH_SHARE ? markRewatched(n, id) : n;
}

/** After a fail, watching the video again opens the retake. */
export function markRewatched(s: CourseState, id: string): CourseState {
  const p = s.lessons[id];
  return p?.failed && !p.rewatched ? { ...s, lessons: { ...s.lessons, [id]: { ...p, rewatched: true } } } : s;
}

/** Lessons with a check score, for the course list and the averages. */
export function checkScores(s: CourseState) {
  return ALL_IDS.filter((id) => s.lessons[id]?.check !== undefined).map((id) => ({ id, pct: s.lessons[id].check!, passed: !!s.lessons[id].post }));
}

/** The average check score as "75%", or "—" before any. */
export function checkAverage(s: CourseState) {
  const all = checkScores(s);
  return all.length ? `${Math.round(all.reduce((a, x) => a + x.pct, 0) / all.length)}%` : "—";
}

/** Signs the commitment, dated today. */
export function commit(s: CourseState, name: string, now = Date.now()): CourseState {
  return { ...s, commitment: { name: name.trim(), date: localDate(new Date(now)) } };
}

