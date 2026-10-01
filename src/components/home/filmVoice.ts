/**
 * The film's narration, read by the browser's own speech engine
 * (SpeechSynthesis): free and instant, but the voice depends on the device.
 * To sound as natural as the device allows, it prefers Indian-English voices,
 * then the higher-quality "natural"/"neural"/"enhanced" English voices that
 * Chrome, Edge and Safari ship, then any English voice.
 *
 * Returns null where speech is unavailable; the film then plays music only.
 */
const PREFERRED = [
  /en-IN/i,
  /natural|neural|enhanced|premium/i,
  /Google UK English (Male|Female)|Google US English/i,
  /Samantha|Daniel|Karen|Moira|Rishi|Veena/i,
  /^en/i,
];

function pickVoice(voices: SpeechSynthesisVoice[]) {
  const english = voices.filter((v) => /^en/i.test(v.lang));
  for (const p of PREFERRED) {
    const hit = english.find((v) => p.test(v.lang) || p.test(v.name));
    if (hit) return hit;
  }
  return english[0] ?? null;
}

export class FilmVoice {
  private voice: SpeechSynthesisVoice | null = null;

  static create() {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return null;
    const v = new FilmVoice();
    v.voice = pickVoice(window.speechSynthesis.getVoices());
    // Some browsers load the voice list late.
    window.speechSynthesis.addEventListener?.("voiceschanged", () => {
      v.voice = pickVoice(window.speechSynthesis.getVoices());
    });
    return v;
  }

  /** Speaks one line, cutting off anything still being read. */
  say(text: string, { onStart, onEnd }: { onStart?: () => void; onEnd?: () => void } = {}) {
    const synth = window.speechSynthesis;
    synth.cancel();
    const u = new SpeechSynthesisUtterance(text);
    this.voice ??= pickVoice(synth.getVoices());
    if (this.voice) {
      u.voice = this.voice;
      u.lang = this.voice.lang;
    }
    u.rate = 0.98;
    u.pitch = 0.95;
    u.volume = 1;
    u.onstart = () => onStart?.();
    u.onend = () => onEnd?.();
    synth.speak(u);
  }

  /** iOS only lets speech start from a tap: call this inside the click handler. */
  prime() {
    const u = new SpeechSynthesisUtterance(" ");
    u.volume = 0;
    window.speechSynthesis.speak(u);
  }

  pause() {
    window.speechSynthesis.pause();
  }

  resume() {
    window.speechSynthesis.resume();
  }

  stop() {
    window.speechSynthesis.cancel();
  }
}
