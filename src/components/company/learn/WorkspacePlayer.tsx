"use client";

import "@/components/course-app/course-app.css";
import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { QuickCheckSheet, Toast } from "@/components/course-app/Overlays";
import { Notes, Video } from "@/components/course-app/screens/Player";
import { VideoBar, canSubtitle, useMenu, usePlayerKeys } from "@/components/course-app/screens/PlayerControls";
import type { Act } from "@/components/course-app/useCourseApp";
import { CourseUserProvider } from "@/components/course-app/user";
import { defaultState, hasQuickCheck, lesson, setLessons, tick, type CourseState, type LessonContent } from "@/lib/course-app";

/**
 * The public course's own lesson player, in the workspace (user, 26 Nov):
 * the same video, controls bar (play, ±10s, volume, speed, voice-over,
 * subtitles by language and size, full screen), keyboard shortcuts, the
 * paused-midway quick check, notes pinned to the video time and the viewer's
 * email on the picture. Only the player: none of the public course's screens.
 * Settings, notes and where each lesson was left are kept in this browser,
 * apart from the public course's own saved state.
 */

const KEY = "klymb.org-player.v1";
const SETTINGS = ["speed", "subs", "subLang", "subSize", "audio", "volume", "muted"] as const;

interface Saved {
  settings?: Partial<Pick<CourseState, (typeof SETTINGS)[number]>>;
  notes?: CourseState["notes"];
  qcDone?: string[];
  /** Lessons whose video was watched to the end (or most of the way). */
  watched?: string[];
  /** Where each lesson's video was left, in seconds. */
  at?: Record<string, number>;
}

const read = (): Saved => {
  try { const v = JSON.parse(window.localStorage.getItem(KEY) ?? "null"); return v && typeof v === "object" ? v : {}; } catch { return {}; }
};
const write = (v: Saved) => { try { window.localStorage.setItem(KEY, JSON.stringify(v)); } catch { /* private mode: nothing kept */ } };

const noop = () => () => {};

interface PlayerProps {
  lessonId: string; content: LessonContent; email: string; name: string | null;
  /** False while the check has the stage: the video pauses and the shortcuts rest. */
  active: boolean;
  /** Watched most of the way (or on an earlier visit): the check may open. */
  onWatched: () => void;
  /** Played to the end: the check takes the stage. */
  onEnded: () => void;
}

export function WorkspacePlayer(props: PlayerProps) {
  // The player draws only in the browser: it reads what this browser kept, and the lesson's content goes into the course app's store there.
  const client = useSyncExternalStore(noop, () => true, () => false);
  if (!client) return <div className="aspect-video w-full rounded-lg bg-[#201e1d]" aria-label="Loading the video" />;
  return <Player {...props} />;
}

function Player({ lessonId, content, email, name, active, onWatched, onEnded }: PlayerProps) {
  const [s, setS] = useState<CourseState>(() => {
    setLessons({ [lessonId]: content });
    const saved = read();
    const base = defaultState();
    return {
      ...base,
      ...saved.settings,
      screen: "player", tab: "course", onboarded: true, toured: true, visited: true,
      // Back where they left off, unless that was the end: then from the start.
      cur: lessonId, t: (saved.at?.[lessonId] ?? 0) < lesson(lessonId).secs - 5 ? saved.at?.[lessonId] ?? 0 : 0,
      notes: saved.notes ?? {},
      qcDone: saved.qcDone ?? [],
      lessons: saved.watched?.includes(lessonId) ? { [lessonId]: { watched: true } } : {},
    };
  });
  const act: Act = useCallback((fn) => setS(fn), []);
  const menu = useMenu();
  usePlayerKeys(act, active);
  // Off stage, the video pauses (its own pause event tells the store).
  useEffect(() => { if (!active) document.querySelector<HTMLVideoElement>("#lesson-watch video")?.pause(); }, [active]);

  // The course app's clock: it opens the quick check partway through and clears toasts.
  useEffect(() => {
    const iv = window.setInterval(() => setS((p) => tick(p)), 1000);
    return () => window.clearInterval(iv);
  }, []);

  const watched = !!s.lessons[lessonId]?.watched;
  useEffect(() => { if (watched) onWatched(); }, [watched, onWatched]);
  useEffect(() => { if (s.ended) onEnded(); }, [s.ended, onEnded]);

  // Keep settings, notes and the place in this lesson for next time (at most about once a second, as the clock ticks).
  useEffect(() => {
    const saved = read();
    write({
      settings: Object.fromEntries(SETTINGS.map((k) => [k, s[k]])),
      notes: s.notes,
      qcDone: s.qcDone,
      watched: watched ? [...new Set([...(saved.watched ?? []), lessonId])] : saved.watched ?? [],
      at: { ...saved.at, [lessonId]: Math.floor(s.t) },
    });
  }, [s, watched, lessonId]);

  const notes = (s.notes[lessonId] ?? []).length;
  return (
    <CourseUserProvider value={{ email, name }}>
      <div className="sd-app flex flex-col gap-3 bg-transparent!">
        <div className="overflow-hidden rounded-lg">
          <Video s={s} act={act} subs={s.subs && canSubtitle(s)} hold={!!menu.menu} bar={<VideoBar s={s} act={act} ui={menu} />} />
        </div>
        <details className="rounded-lg border border-line/30 bg-white text-sm">
          <summary className="cursor-pointer px-4 py-3 font-semibold">Your notes ({notes})<span className="ml-2 font-normal text-muted">pinned to the video time, kept in this browser</span></summary>
          <Notes s={s} act={act} />
        </details>
        <p className="text-xs text-muted">Shortcuts: K play/pause · J/L back or forward 10s · &lt; &gt; speed · C captions · M mute · F full screen</p>
        {s.qcOpen && hasQuickCheck(s.cur) && <QuickCheckSheet s={s} act={act} />}
        {s.toast && <Toast text={s.toast} />}
      </div>
    </CourseUserProvider>
  );
}
