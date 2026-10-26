"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ASSESSMENT_SECONDS } from "@/lib/coach/assessment";
import { SESSION_TUNING } from "@/lib/coach/prompt";

/**
 * One spoken session, over WebRTC.
 *
 * WebRTC rather than a WebSocket because the audio path matters more than the
 * code: the browser's own jitter buffer and echo cancellation are what make
 * being interrupted survivable, and the reply starts playing as it arrives
 * instead of after a turn is assembled.
 *
 * The offer goes to /api/coach/session, which relays it. No credential of
 * any kind reaches this file — see src/lib/coach/realtime.ts for why not even
 * a short-lived one.
 */

export type CoachStatus =
  | "idle"
  | "connecting"
  /** Connected, waiting for whoever speaks first. */
  | "ready"
  /** The learner is speaking. */
  | "listening"
  /** They have finished and the reply is being prepared. */
  | "thinking"
  | "speaking"
  | "ended"
  | "error";

export interface Caption {
  id: string;
  who: "coach" | "you";
  text: string;
  /** False while it is still being transcribed, so the UI can show it as provisional. */
  final: boolean;
}

export interface Levels {
  /** 0–1, from the microphone. */
  mic: number;
  /** 0–1, from what is actually being played back. */
  voice: number;
}

/**
 * Only the fields that are read. The realtime API sends a great deal more,
 * and modelling all of it would mean editing this every time it grows.
 */
interface RealtimeEvent {
  type?: string;
  delta?: string;
  transcript?: string;
  /** The conversation item a transcript belongs to: one per spoken turn, which is what keys a caption. */
  item_id?: string;
  response_id?: string;
  response?: {
    output?: { type?: string; name?: string; call_id?: string; arguments?: string }[];
  };
  error?: { message?: string };
}

/** A session is five minutes; this is the ceiling, a minute past it. */
const HARD_STOP_MS = (ASSESSMENT_SECONDS + 60) * 1000;

const rms = (data: Uint8Array) => {
  let sum = 0;
  for (let i = 0; i < data.length; i += 1) {
    const v = (data[i] - 128) / 128;
    sum += v * v;
  }
  return Math.min(1, Math.sqrt(sum / data.length) * 3.2);
};

export function useVoiceSession(topicId: string) {
  const [status, setStatus] = useState<CoachStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [captions, setCaptions] = useState<Caption[]>([]);
  const [muted, setMuted] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [skillsRecorded, setSkillsRecorded] = useState(0);
  /** Measured, not promised: the learner finishing to the first word back. */
  const [firstReplyMs, setFirstReplyMs] = useState<number | null>(null);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const dcRef = useRef<RTCDataChannel | null>(null);
  const micRef = useRef<MediaStream | null>(null);
  // Held in a ref, not just assigned: a remote track that is not attached to
  // a live element feeds silence into Web Audio in Chromium.
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const micAnalyser = useRef<AnalyserNode | null>(null);
  const voiceAnalyser = useRef<AnalyserNode | null>(null);
  const smoothed = useRef<Levels>({ mic: 0, voice: 0 });
  const sessionId = useRef<string | null>(null);
  const spokeAt = useRef<number | null>(null);
  const firstReply = useRef<number | null>(null);
  /** Whether the response now ending ever produced speech. See the function-call handling. */
  const responseSpoke = useRef(false);
  const speaking = useRef(false);

  const send = useCallback((event: unknown) => {
    const dc = dcRef.current;
    if (dc?.readyState === "open") dc.send(JSON.stringify(event));
  }, []);

  /**
   * Writes evidence without being in the way of it. The model has already had
   * its acknowledgement by the time this is called, so a slow write delays
   * nothing that is being said.
   */
  const record = useCallback((body: Record<string, unknown>) => {
    const id = sessionId.current;
    if (!id) return;
    void fetch("/api/coach/evidence", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ session: id, ...body }),
      keepalive: true,
    }).catch(() => {
      // A dropped row is a gap in the evidence, not a reason to interrupt a
      // conversation the learner is in the middle of.
    });
  }, []);

  /**
   * One line per spoken turn, keyed by its conversation item.
   *
   * `mode` is the whole reason this is not a one-liner: transcript deltas
   * arrive as fragments to be added to the line, while the completed
   * transcript is the whole thing and replaces what the fragments built.
   */
  const caption = useCallback(
    (who: Caption["who"], id: string, text: string, { final, mode }: { final: boolean; mode: "add" | "replace" }) => {
      setCaptions((current) => {
        const at = current.findIndex((c) => c.id === id);
        if (at === -1) return [...current, { id, who, text, final }].slice(-24);
        const next = [...current];
        next[at] = { ...next[at], text: mode === "add" ? next[at].text + text : text, final };
        // Captions are for following along, not a transcript: the tail is enough.
        return next.slice(-24);
      });
    },
    [],
  );

  const teardown = useCallback(() => {
    dcRef.current?.close();
    pcRef.current?.close();
    micRef.current?.getTracks().forEach((track) => track.stop());
    if (audioRef.current) {
      audioRef.current.srcObject = null;
      audioRef.current = null;
    }
    void ctxRef.current?.close().catch(() => {});
    dcRef.current = null;
    pcRef.current = null;
    micRef.current = null;
    ctxRef.current = null;
    micAnalyser.current = null;
    voiceAnalyser.current = null;
    smoothed.current = { mic: 0, voice: 0 };
    speaking.current = false;
  }, []);

  /** The microphone is released the moment the session ends, every way it can end. */
  const end = useCallback(() => {
    teardown();
    setStatus((current) => (current === "error" ? current : "ended"));
  }, [teardown]);

  const handle = useCallback(
    (event: RealtimeEvent) => {
      switch (event.type) {
        case "session.created":
        case "session.updated":
          setStatus((current) => (current === "connecting" ? "ready" : current));
          break;

        case "input_audio_buffer.speech_started":
          // Barge-in. The reply is already buffered in the browser, so
          // cancelling the response is not enough on its own: the audio that
          // has arrived has to be dropped too, or the coach talks over them
          // for another second.
          if (speaking.current) {
            send({ type: "response.cancel" });
            send({ type: "output_audio_buffer.clear" });
            speaking.current = false;
          }
          spokeAt.current = null;
          setStatus("listening");
          break;

        case "input_audio_buffer.speech_stopped":
          spokeAt.current = performance.now();
          setStatus("thinking");
          break;

        // Both keyed on the item, so the partial line becomes the final one
        // in place rather than appearing twice.
        case "conversation.item.input_audio_transcription.delta":
          if (event.delta) caption("you", `you-${event.item_id ?? "live"}`, event.delta, { final: false, mode: "add" });
          break;

        case "conversation.item.input_audio_transcription.completed":
          if (event.transcript) {
            caption("you", `you-${event.item_id ?? "live"}`, event.transcript, { final: true, mode: "replace" });
          }
          break;

        case "response.output_audio_transcript.delta": {
          // One caption per spoken turn. Without the item id every delta
          // would land in the same line and it would grow all session.
          const id = `coach-${event.item_id ?? event.response_id ?? "live"}`;
          speaking.current = true;
          responseSpoke.current = true;
          setStatus("speaking");
          if (spokeAt.current !== null && firstReply.current === null) {
            // The transcript arrives with the audio, so this is as close to
            // "first audible word" as the browser can see.
            firstReply.current = Math.round(performance.now() - spokeAt.current);
            setFirstReplyMs(firstReply.current);
          }
          caption("coach", id, event.delta ?? "", { final: false, mode: "add" });
          break;
        }

        case "response.output_audio_transcript.done":
          setCaptions((current) => current.map((c) => (c.who === "coach" ? { ...c, final: true } : c)));
          break;

        case "response.done": {
          speaking.current = false;
          setStatus((current) => (current === "ended" ? current : "ready"));
          const calls = (event.response?.output ?? []).filter((item) => item.type === "function_call");

          for (const call of calls) {
            // Answer first, write after. An acknowledgement the model is
            // waiting for must never be behind a database round trip.
            send({
              type: "conversation.item.create",
              item: { type: "function_call_output", call_id: call.call_id, output: JSON.stringify({ ok: true }) },
            });

            let args: Record<string, unknown> = {};
            try {
              args = JSON.parse(call.arguments || "{}") as Record<string, unknown>;
            } catch {
              args = {};
            }

            if (call.name === "record_skill_evidence") {
              setSkillsRecorded((n) => n + 1);
              record({ kind: "skill", skill: args.skill, level: args.level, evidence: args.evidence, nextStep: args.nextStep });
            } else if (call.name === "end_assessment") {
              record({ kind: "summary", summary: args.summary, firstReplyMs: firstReply.current });
            }
          }

          // Only nudge when the model called a function and said nothing: then
          // it is waiting on us and the room is silent. When it spoke in the
          // same turn — which is what it is told to do — an extra
          // response.create would make it say something it had not planned to.
          if (calls.length && !responseSpoke.current) send({ type: "response.create" });
          responseSpoke.current = false;
          break;
        }

        case "error":
          // The session usually survives these, so they are logged rather
          // than shown: a rejected session.update costs turn detection, not
          // the conversation.
          console.error("coach event error:", event.error?.message ?? "unknown");
          break;
      }
    },
    [caption, record, send],
  );

  const start = useCallback(async () => {
    setError(null);
    setCaptions([]);
    setSkillsRecorded(0);
    setFirstReplyMs(null);
    firstReply.current = null;
    spokeAt.current = null;
    setElapsed(0);
    setStatus("connecting");

    let mic: MediaStream;
    try {
      mic = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
    } catch {
      setStatus("error");
      setError("We could not reach your microphone. Allow it for this site, then try again.");
      return;
    }
    micRef.current = mic;

    try {
      const pc = new RTCPeerConnection();
      pcRef.current = pc;

      const audio = new Audio();
      audio.autoplay = true;
      audioRef.current = audio;

      const ctx = new AudioContext();
      ctxRef.current = ctx;
      if (ctx.state === "suspended") await ctx.resume();
      const analyser = (stream: MediaStream) => {
        const node = ctx.createAnalyser();
        node.fftSize = 512;
        node.smoothingTimeConstant = 0.55;
        ctx.createMediaStreamSource(stream).connect(node);
        return node;
      };
      micAnalyser.current = analyser(mic);

      pc.ontrack = (e) => {
        audio.srcObject = e.streams[0];
        // Measured, not connected to the destination: the element plays it.
        // Connecting both would play it twice, a beat apart.
        voiceAnalyser.current = analyser(e.streams[0]);
      };
      pc.onconnectionstatechange = () => {
        if (pc.connectionState === "failed" || pc.connectionState === "disconnected") {
          setStatus("error");
          setError("The connection dropped. Start the session again.");
          teardown();
        }
      };

      pc.addTrack(mic.getAudioTracks()[0], mic);

      const dc = pc.createDataChannel("oai-events");
      dcRef.current = dc;
      dc.onopen = () => send(SESSION_TUNING);
      dc.onmessage = (e) => {
        try {
          handle(JSON.parse(e.data as string) as RealtimeEvent);
        } catch {
          // A single unparseable frame is not worth ending a conversation over.
        }
      };

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      const response = await fetch(`/api/coach/session?topic=${encodeURIComponent(topicId)}`, {
        method: "POST",
        headers: { "content-type": "application/sdp" },
        body: offer.sdp,
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        setStatus("error");
        setError(body?.error ?? "The coach could not be reached. Try again in a minute.");
        teardown();
        return;
      }

      sessionId.current = response.headers.get("x-coach-session");
      await pc.setRemoteDescription({ type: "answer", sdp: await response.text() });
    } catch (e) {
      console.error("coach connect failed:", e instanceof Error ? e.message : String(e));
      setStatus("error");
      setError("Something went wrong setting up the call. Try again.");
      teardown();
    }
  }, [handle, send, teardown, topicId]);

  const toggleMute = useCallback(() => {
    const track = micRef.current?.getAudioTracks()[0];
    if (!track) return;
    track.enabled = !track.enabled;
    setMuted(!track.enabled);
  }, []);

  /**
   * One sample per frame, taken by whoever is drawing, so the analysers are
   * read once rather than once per animated thing on the screen.
   */
  const sampleLevels = useCallback((): Levels => {
    const read = (node: AnalyserNode | null) => {
      if (!node) return 0;
      const data = new Uint8Array(node.fftSize);
      node.getByteTimeDomainData(data);
      return rms(data);
    };
    const mic = muted ? 0 : read(micAnalyser.current);
    const voice = read(voiceAnalyser.current);
    // Fast to rise, slow to fall: a meter that tracks every dip looks jittery.
    const ease = (was: number, now: number) => (now > was ? was + (now - was) * 0.5 : was + (now - was) * 0.12);
    smoothed.current = { mic: ease(smoothed.current.mic, mic), voice: ease(smoothed.current.voice, voice) };
    return smoothed.current;
  }, [muted]);

  const live = status !== "idle" && status !== "ended" && status !== "error";

  useEffect(() => {
    if (!live) return;
    const started = Date.now();
    const timer = setInterval(() => {
      const ms = Date.now() - started;
      setElapsed(Math.floor(ms / 1000));
      // A forgotten tab is an open microphone and a running bill.
      if (ms > HARD_STOP_MS) end();
    }, 1000);
    return () => clearInterval(timer);
  }, [live, end]);

  // The microphone is not left open by a navigation.
  useEffect(() => teardown, [teardown]);

  return {
    status,
    error,
    captions,
    muted,
    elapsed,
    skillsRecorded,
    firstReplyMs,
    live,
    start,
    end,
    toggleMute,
    sampleLevels,
  };
}
