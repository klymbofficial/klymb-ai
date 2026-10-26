"use client";

import { useState } from "react";
import { Captions, Mic, MicOff, PhoneOff, TriangleAlert } from "lucide-react";
import { Orb, orbState } from "@/components/coach/Orb";
import { useVoiceSession, type CoachStatus } from "@/components/coach/useVoiceSession";
import { Button } from "@/components/ui/Button";
import { ASSESSMENT_SECONDS } from "@/lib/coach/assessment";
import type { CoachTopic } from "@/lib/coach/topics";

/**
 * The session screen: one orb, the context around it, captions underneath.
 *
 * Everything on it is there to answer a question the learner would otherwise
 * have to guess at — am I being heard, is it my turn, how long is left, what
 * was that it just asked — because a voice interface gives none of that away
 * on its own.
 */

const LABELS: Record<CoachStatus, string> = {
  idle: "Ready when you are",
  connecting: "Connecting",
  ready: "Go ahead",
  listening: "Hearing you",
  thinking: "Thinking",
  speaking: "Speaking",
  ended: "Session ended",
  error: "Disconnected",
};

const DOTS: Record<CoachStatus, string> = {
  idle: "bg-white/40",
  connecting: "bg-white/70 tick",
  ready: "bg-red-soft",
  listening: "bg-white",
  thinking: "bg-red-soft tick",
  speaking: "bg-red-soft",
  ended: "bg-white/40",
  error: "bg-white/40",
};

const clock = (seconds: number) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;

/** Minutes left, as a ring. Not a countdown in red: the coach manages the time, not the learner. */
function TimeRing({ seconds }: { seconds: number }) {
  const r = 24;
  const c = 2 * Math.PI * r;
  const pct = Math.min(1, seconds / ASSESSMENT_SECONDS);
  return (
    <div className="flex items-center gap-3">
      <div className="relative size-14 shrink-0">
        <svg viewBox="0 0 60 60" className="size-14 -rotate-90" aria-hidden="true">
          <circle cx="30" cy="30" r={r} fill="none" stroke="rgb(255 255 255 / 0.15)" strokeWidth="5" />
          <circle
            cx="30" cy="30" r={r} fill="none" stroke="var(--color-red-soft)" strokeWidth="5" strokeLinecap="round"
            strokeDasharray={c} strokeDashoffset={c * (1 - pct)}
            style={{ transition: "stroke-dashoffset 1s linear" }}
          />
        </svg>
        <span className="absolute inset-0 grid place-items-center text-xs font-black nums">{clock(seconds)}</span>
      </div>
      <p className="text-xs leading-tight text-white/55">
        of {clock(ASSESSMENT_SECONDS)}
        <br />
        assessment
      </p>
    </div>
  );
}

function IconButton({
  onClick, label, pressed, children,
}: { onClick: () => void; label: string; pressed?: boolean; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={pressed}
      title={label}
      className={`grid size-12 place-items-center rounded-full border-2 transition-colors ${
        pressed ? "border-paper bg-paper text-night" : "border-white/30 text-paper hover:border-paper"
      }`}
    >
      {children}
    </button>
  );
}

export function VoiceCoach({
  topic, alternatives, trackName, day,
}: { topic: CoachTopic; alternatives: CoachTopic[]; trackName: string; day: number }) {
  const [chosen, setChosen] = useState(topic);
  const [showCaptions, setShowCaptions] = useState(true);
  const session = useVoiceSession(chosen.id);
  const { status, live, captions, muted, elapsed, error, skillsRecorded, firstReplyMs } = session;

  // The last thing the coach said is the question on the table, so it is the
  // one line shown large; the rest scrolls underneath.
  const lastCoachLine = [...captions].reverse().find((line) => line.who === "coach")?.text ?? "";

  return (
    <section className="relative overflow-hidden rounded-slab bg-night px-5 py-8 text-paper sm:px-10 sm:py-12">
      <div className="flex flex-wrap items-start justify-between gap-5">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-red-soft">Practising</p>
          <h2 className="display mt-1.5 text-2xl sm:text-3xl">{chosen.label}</h2>
          <p className="mt-1.5 text-sm text-white/55">
            {trackName} · Day {day} · {chosen.skills.join(" · ")}
          </p>
        </div>
        <TimeRing seconds={elapsed} />
      </div>

      <div className="relative mx-auto mt-10 aspect-square w-full max-w-[19rem]">
        <Orb state={orbState(status, muted)} sample={session.sampleLevels} />
      </div>

      <p className="mt-7 flex items-center justify-center gap-2.5 text-xs font-bold uppercase tracking-[0.16em]">
        <span aria-hidden="true" className={`size-2 rounded-full ${muted && live ? "bg-white/40" : DOTS[status]}`} />
        <span aria-live="polite">{muted && live ? "Muted" : LABELS[status]}</span>
      </p>

      <p className="mx-auto mt-5 min-h-[4.5rem] max-w-2xl text-center text-lg leading-snug text-white/90 sm:text-xl">
        {lastCoachLine || (
          <span className="text-white/45">
            {status === "idle" ? `First question: “${chosen.opener}”` : status === "connecting" ? "Setting up the call…" : ""}
          </span>
        )}
      </p>

      <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
        {!live && (
          // Light on the dark ground, as the dashboard's own primary action is.
          <Button soft variant="inverse" onClick={session.start} arrow>
            {status === "ended" || status === "error" ? "Start another session" : "Start the session"}
          </Button>
        )}
        {live && (
          <>
            <IconButton onClick={session.toggleMute} label={muted ? "Unmute your microphone" : "Mute your microphone"} pressed={muted}>
              {muted ? <MicOff className="size-5" /> : <Mic className="size-5" />}
            </IconButton>
            <button
              type="button"
              onClick={session.end}
              className="inline-flex items-center gap-2 rounded-lg border-2 border-white/30 px-5 py-3 text-sm font-bold text-paper transition-colors hover:border-paper hover:bg-white/10"
            >
              <PhoneOff aria-hidden="true" className="size-4" />
              End session
            </button>
          </>
        )}
        <IconButton onClick={() => setShowCaptions((on) => !on)} label="Show captions" pressed={showCaptions}>
          <Captions className="size-5" />
        </IconButton>
      </div>

      {error && (
        <p role="alert" className="mx-auto mt-6 flex max-w-xl items-start gap-2.5 rounded-lg bg-white/10 px-4 py-3 text-sm">
          <TriangleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-red-soft" />
          {error}
        </p>
      )}

      {!live && status === "idle" && (
        <p className="mx-auto mt-6 max-w-xl text-center text-sm text-white/50">
          Your browser will ask for the microphone. Speak normally and interrupt whenever you want — it stops when you start.
          Nothing is recorded: the captions are on screen only.
        </p>
      )}

      {showCaptions && captions.length > 0 && (
        <div
          aria-live="polite"
          className="mx-auto mt-8 max-h-56 max-w-2xl space-y-3 overflow-y-auto border-t border-white/15 pt-5 text-sm"
        >
          {captions.map((line) => (
            <p key={line.id} className={line.who === "coach" ? "text-white/80" : "text-white/55"}>
              <span className="mr-2 text-[0.7rem] font-bold uppercase tracking-[0.12em] text-red-soft">
                {line.who === "coach" ? "Coach" : "You"}
              </span>
              {line.text}
              {!line.final && <span aria-hidden="true" className="tick">…</span>}
            </p>
          ))}
        </div>
      )}

      {(skillsRecorded > 0 || firstReplyMs !== null) && (
        <p className="mt-8 text-center text-xs text-white/40 nums">
          {skillsRecorded > 0 && `${skillsRecorded} ${skillsRecorded === 1 ? "answer" : "answers"} recorded for your reviewer`}
          {skillsRecorded > 0 && firstReplyMs !== null && " · "}
          {/* Measured here rather than quoted from a provider's page. */}
          {firstReplyMs !== null && `first reply ${(firstReplyMs / 1000).toFixed(1)}s`}
        </p>
      )}

      {!live && alternatives.length > 1 && (
        <div className="mt-9 border-t border-white/15 pt-6">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-white/45">Practise something else</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {alternatives.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => setChosen(option)}
                aria-current={option.id === chosen.id}
                className={`rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${
                  option.id === chosen.id ? "border-paper bg-paper text-night" : "border-white/25 text-white/75 hover:border-paper hover:text-paper"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
