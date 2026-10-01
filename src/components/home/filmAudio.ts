/**
 * The film's soundtrack, synthesised with the Web Audio API: no files to
 * load, nothing to license. A quiet ambient bed plus short effects that the
 * film fires on cue (a slash for each struck title, ticks for the day
 * counter, chimes for the proof points, a swell on the call to action).
 *
 * Browsers only allow sound after a user gesture, so this is created when the
 * viewer turns sound on, and it stays silent until then.
 */
export class FilmAudio {
  private ctx: AudioContext;
  private master: GainNode;
  private bed: GainNode;
  private noise: AudioBuffer;
  private bedStarted = false;

  constructor() {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.ctx = new Ctx();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.9;
    // A gentle limiter so stacked cues never clip.
    const comp = this.ctx.createDynamicsCompressor();
    comp.threshold.value = -14;
    comp.ratio.value = 6;
    this.master.connect(comp).connect(this.ctx.destination);
    this.bed = this.ctx.createGain();
    this.bed.gain.value = 0;
    this.bed.connect(this.master);
    this.noise = this.ctx.createBuffer(1, this.ctx.sampleRate, this.ctx.sampleRate);
    const data = this.noise.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  }

  get now() {
    return this.ctx.currentTime;
  }

  async resume() {
    if (this.ctx.state !== "running") await this.ctx.resume();
    if (!this.bedStarted) this.startBed();
    this.bed.gain.cancelScheduledValues(this.now);
    this.bed.gain.setTargetAtTime(0.11, this.now, 0.8);
  }

  pause() {
    this.bed.gain.setTargetAtTime(0, this.now, 0.2);
    window.setTimeout(() => void this.ctx.suspend(), 400);
  }

  close() {
    void this.ctx.close();
  }

  /** A dark, slowly moving minor chord (D minor with an added ninth). */
  private startBed() {
    this.bedStarted = true;
    const filter = this.ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 700;
    filter.Q.value = 0.7;
    filter.connect(this.bed);
    const lfo = this.ctx.createOscillator();
    const lfoGain = this.ctx.createGain();
    lfo.frequency.value = 0.07;
    lfoGain.gain.value = 260;
    lfo.connect(lfoGain).connect(filter.frequency);
    lfo.start();
    for (const [f, detune] of [[73.42, -6], [73.42, 6], [110, 0], [146.83, -4], [174.61, 5], [164.81, 0]] as const) {
      const o = this.ctx.createOscillator();
      o.type = "sawtooth";
      o.frequency.value = f;
      o.detune.value = detune;
      const g = this.ctx.createGain();
      g.gain.value = 0.05;
      o.connect(g).connect(filter);
      o.start();
    }
  }

  private env(g: GainNode, at: number, peak: number, attack: number, release: number) {
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(peak, at + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, at + attack + release);
  }

  private noiseBurst(at: number, { from, to, q = 1, dur, peak, type = "bandpass" }: { from: number; to: number; q?: number; dur: number; peak: number; type?: BiquadFilterType }) {
    const src = this.ctx.createBufferSource();
    src.buffer = this.noise;
    const f = this.ctx.createBiquadFilter();
    f.type = type;
    f.Q.value = q;
    f.frequency.setValueAtTime(from, at);
    f.frequency.exponentialRampToValueAtTime(to, at + dur);
    const g = this.ctx.createGain();
    this.env(g, at, peak, dur * 0.25, dur * 0.75);
    src.connect(f).connect(g).connect(this.master);
    src.start(at);
    src.stop(at + dur + 0.05);
  }

  private tone(at: number, freq: number, { type = "sine", dur = 0.6, peak = 0.2, attack = 0.005, glideTo }: { type?: OscillatorType; dur?: number; peak?: number; attack?: number; glideTo?: number } = {}) {
    const o = this.ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(freq, at);
    if (glideTo) o.frequency.exponentialRampToValueAtTime(glideTo, at + dur);
    const g = this.ctx.createGain();
    this.env(g, at, peak, attack, dur);
    o.connect(g).connect(this.master);
    o.start(at);
    o.stop(at + attack + dur + 0.05);
  }

  /** Air moving between scenes. */
  whoosh() {
    this.noiseBurst(this.now, { from: 300, to: 3200, q: 0.8, dur: 0.6, peak: 0.35 });
  }

  /** A title arriving: a soft low pluck. */
  pluck(step = 0) {
    this.tone(this.now, 220 * Math.pow(2, step / 12), { type: "triangle", dur: 0.35, peak: 0.18 });
  }

  /** A title struck through: a fast blade swipe with a low thud under it. */
  slash() {
    this.noiseBurst(this.now, { from: 5000, to: 900, q: 2, dur: 0.22, peak: 0.45 });
    this.tone(this.now, 90, { dur: 0.25, peak: 0.35, glideTo: 45 });
  }

  /** Old title becoming new role: a rising sweep. */
  rise() {
    this.tone(this.now, 330, { type: "sine", dur: 0.4, peak: 0.16, glideTo: 660 });
    this.noiseBurst(this.now, { from: 1200, to: 6000, q: 1.5, dur: 0.35, peak: 0.12, type: "highpass" });
  }

  /** One day passing; checkpoints ring brighter. */
  tick(accent = false) {
    if (accent) {
      this.tone(this.now, 1318.5, { dur: 0.5, peak: 0.16 });
      this.tone(this.now, 659.25, { dur: 0.6, peak: 0.12, type: "triangle" });
    } else {
      this.noiseBurst(this.now, { from: 3500, to: 3000, q: 8, dur: 0.05, peak: 0.12 });
    }
  }

  /** A proof point landing. */
  chime(step = 0) {
    const f = [587.33, 739.99, 880][step % 3];
    this.tone(this.now, f, { dur: 0.9, peak: 0.16 });
    this.tone(this.now, f * 2, { dur: 0.6, peak: 0.05 });
  }

  /** The call to action: a warm major chord swelling up. */
  swell() {
    const at = this.now;
    for (const f of [146.83, 220, 293.66, 369.99, 440]) {
      const o = this.ctx.createOscillator();
      o.type = "sawtooth";
      o.frequency.value = f;
      const lp = this.ctx.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.setValueAtTime(400, at);
      lp.frequency.exponentialRampToValueAtTime(2400, at + 1.6);
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.0001, at);
      g.gain.exponentialRampToValueAtTime(0.06, at + 1.2);
      g.gain.exponentialRampToValueAtTime(0.0001, at + 4);
      o.connect(lp).connect(g).connect(this.master);
      o.start(at);
      o.stop(at + 4.1);
    }
    this.tone(at, 1174.66, { dur: 1.6, peak: 0.08, attack: 0.3 });
  }
}
