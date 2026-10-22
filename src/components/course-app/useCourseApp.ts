"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { QUESTIONS } from "@/data/system-design/course-app";
import {
  START_SCREENS, defaultState, fromStored, isAnswered, nextQuestion, pickOption, previewState, tick, togglePlay, toStored,
  type CourseState, type StartScreen,
} from "@/lib/course-app";

const STORAGE_KEY = "klymb.system-design.v1";

export type Act = (fn: (s: CourseState) => CourseState) => void;

/**
 * The app's one store. Progress is saved to this browser only (there is no
 * backend yet). `?start=<screen>` opens a design-review state instead and
 * saves nothing; `&q=` and `&post=1` set the question and a finished
 * post-assessment, as on the design canvas.
 */
export function useCourseApp() {
  const [s, setS] = useState<CourseState>(() => defaultState());
  const [ready, setReady] = useState(false);
  const preview = useRef(false);
  const latest = useRef(s);
  useEffect(() => { latest.current = s; }, [s]);

  const act: Act = useCallback((fn) => setS(fn), []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const start = params.get("start");
    let next: CourseState;
    if (start && (START_SCREENS as readonly string[]).includes(start)) {
      preview.current = true;
      next = previewState(start as StartScreen, { q: Number(params.get("q") ?? 0), seedPost: params.get("post") === "1" });
    } else {
      let raw: unknown = null;
      try { raw = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "null"); } catch { raw = null; }
      next = fromStored(raw);
    }
    if (!navigator.onLine) next = { ...next, offline: true };
    // Storage and the URL only exist in the browser, so the first real state arrives after mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setS(next);
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready || preview.current) return;
    try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(toStored(s))); } catch { /* private mode or full: progress just isn't kept */ }
  }, [s, ready]);

  useEffect(() => {
    if (!ready) return;
    const iv = window.setInterval(() => setS((p) => tick(p)), 1000);
    const goOffline = () => setS((p) => ({ ...p, offline: true }));
    const goOnline = () => setS((p) => ({ ...p, offline: false }));
    window.addEventListener("offline", goOffline);
    window.addEventListener("online", goOnline);
    return () => {
      window.clearInterval(iv);
      window.removeEventListener("offline", goOffline);
      window.removeEventListener("online", goOnline);
    };
  }, [ready]);

  // Keyboard: 1–4 or A–D answer, Enter goes on, Space plays or pauses. Typing in a field is left alone.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName ?? "";
      if (tag === "INPUT" || tag === "TEXTAREA" || e.metaKey || e.ctrlKey || e.altKey) return;
      const st = latest.current;
      if (st.screen === "quiz" && st.quiz.stage === "q" && !st.confirmExit) {
        const q = QUESTIONS[st.quiz.idx];
        const k = e.key.toLowerCase();
        const i = /^[1-4]$/.test(k) ? Number(k) - 1 : /^[a-d]$/.test(k) ? k.charCodeAt(0) - 97 : -1;
        const count = "options" in q ? q.options.length : q.type === "diagram" ? 3 : 0;
        if (i >= 0 && i < count) {
          setS((p) => pickOption(p, i));
          e.preventDefault();
        } else if (e.key === "Enter" && isAnswered(q, st.quiz.answers[st.quiz.idx])) {
          setS(nextQuestion);
          e.preventDefault();
        }
      } else if (st.screen === "player" && e.key === " " && !st.qcOpen) {
        setS(togglePlay);
        e.preventDefault();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return { s, act, ready };
}
