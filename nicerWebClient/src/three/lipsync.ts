import { VisemeMap, OPEN_VISEMES, CLOSED_VISEMES } from "./visemes";

/**
 * Lip-sync abstraction. The Avatar samples `visemes` every frame and applies the
 * weights to its morph targets. Two drivers implement the same surface:
 *
 *  - WebSpeechDriver  → drives visemes PROCEDURALLY from SpeechSynthesis timing.
 *    (Web Speech plays straight to the speakers and can't be tapped by an
 *     analyser, so we animate the mouth from boundary/timing events instead.)
 *  - AudioFileDriver  → plays an HTMLAudioElement and drives visemes from the
 *    real amplitude via Web Audio API analyser. Used for pre-rendered TTS files.
 */
export interface LipsyncDriver {
  readonly visemes: VisemeMap;
  readonly speaking: boolean;
  speak(text: string, opts?: { lang?: string }): Promise<void>;
  stop(): void;
  update(dt: number): void;
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export class WebSpeechDriver implements LipsyncDriver {
  visemes: VisemeMap = {};
  speaking = false;

  private energy = 0;          // pulses to ~1 on each word boundary, then decays
  private phase = 0;           // drives the vowel cycle
  private activeOpen = OPEN_VISEMES[0];
  private activeClosed = CLOSED_VISEMES[0];
  private target: VisemeMap = {};
  private switchTimer = 0;
  private onDone: (() => void) | null = null;
  private preferredVoice: SpeechSynthesisVoice | null = null;

  constructor() {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      const pick = () => { this.preferredVoice = this.choose(speechSynthesis.getVoices()); };
      pick();
      speechSynthesis.onvoiceschanged = pick;
    }
  }

  private choose(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
    if (!voices.length) return null;
    return (
      voices.find((v) => /de-CH/i.test(v.lang)) ||
      voices.find((v) => /^de/i.test(v.lang)) ||
      voices.find((v) => /en-GB/i.test(v.lang)) ||
      voices[0]
    );
  }

  speak(text: string, opts: { lang?: string } = {}): Promise<void> {
    this.stop();
    return new Promise((resolve) => {
      if (typeof window === "undefined" || !("speechSynthesis" in window)) {
        // No TTS available — still run a short procedural mouth so the avatar reacts.
        this.simulate(text, resolve);
        return;
      }
      const u = new SpeechSynthesisUtterance(text);
      const v = this.preferredVoice || this.choose(speechSynthesis.getVoices());
      if (v) u.voice = v;
      u.lang = opts.lang || v?.lang || "de-CH";
      u.rate = 1.0; u.pitch = 1.0;
      this.speaking = true;
      this.onDone = resolve;
      u.onboundary = () => { this.energy = 1; };
      u.onend = () => this.finish();
      u.onerror = () => this.finish();
      speechSynthesis.speak(u);
    });
  }

  /** Fallback when Web Speech is unavailable: animate for an estimated duration. */
  private simulate(text: string, resolve: () => void) {
    this.speaking = true;
    this.energy = 1;
    const ms = Math.min(8000, 400 + text.length * 45);
    setTimeout(() => { this.onDone = resolve; this.finish(); }, ms);
  }

  private finish() {
    this.speaking = false;
    this.energy = 0;
    const done = this.onDone; this.onDone = null;
    done?.();
  }

  stop() {
    if (typeof window !== "undefined" && "speechSynthesis" in window) speechSynthesis.cancel();
    this.speaking = false;
    this.energy = 0;
  }

  update(dt: number) {
    this.energy = Math.max(0, this.energy - dt * 4.5);
    this.phase += dt * 9;

    // Re-pick the active vowel/closure every ~120ms while speaking.
    this.switchTimer -= dt;
    if (this.switchTimer <= 0) {
      this.switchTimer = 0.1 + Math.random() * 0.07;
      this.activeOpen = OPEN_VISEMES[(Math.random() * OPEN_VISEMES.length) | 0];
      this.activeClosed = CLOSED_VISEMES[(Math.random() * CLOSED_VISEMES.length) | 0];
    }

    this.target = {};
    if (this.speaking) {
      const wave = (Math.sin(this.phase) * 0.5 + 0.5);     // 0..1
      const open = Math.min(1, 0.25 + wave * 0.55 + this.energy * 0.4);
      this.target[this.activeOpen] = open;
      this.target[this.activeClosed] = (1 - wave) * 0.35;  // brief closures
    } else {
      this.target["viseme_sil"] = 1;
    }

    // Smooth toward target so the mouth never snaps.
    const keys = new Set([...Object.keys(this.visemes), ...Object.keys(this.target)]);
    keys.forEach((k) => {
      const cur = this.visemes[k] ?? 0;
      const tgt = this.target[k] ?? 0;
      const next = lerp(cur, tgt, Math.min(1, dt * 16));
      if (next < 0.001 && tgt === 0) delete this.visemes[k];
      else this.visemes[k] = next;
    });
  }
}

// ---- Audio file driver: real amplitude → visemes via Web Audio analyser -----
export class AudioFileDriver implements LipsyncDriver {
  visemes: VisemeMap = {};
  speaking = false;

  private audio: HTMLAudioElement | null = null;
  private analyser: AnalyserNode | null = null;
  private buf: Uint8Array<ArrayBuffer> = new Uint8Array(0);
  private phase = 0;
  private activeOpen = OPEN_VISEMES[0];
  private switchTimer = 0;
  private onDone: (() => void) | null = null;

  /** Play an audio file URL and lip-sync to its amplitude. */
  playFile(url: string): Promise<void> {
    this.stop();
    return new Promise((resolve) => {
      const audio = new Audio(url);
      audio.crossOrigin = "anonymous";
      this.audio = audio;
      this.onDone = resolve;

      const ctx = new AudioContext();
      const src = ctx.createMediaElementSource(audio);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      src.connect(analyser);
      analyser.connect(ctx.destination);
      this.analyser = analyser;
      this.buf = new Uint8Array(analyser.frequencyBinCount) as Uint8Array<ArrayBuffer>;

      audio.onended = () => this.finish();
      audio.onerror = () => this.finish();

      ctx.resume().then(() => {
        this.speaking = true;
        audio.play().catch(() => this.finish());
      });
    });
  }

  // speak() is a no-op for this driver — use playFile() directly.
  speak(_text: string): Promise<void> { return Promise.resolve(); }

  stop() {
    this.audio?.pause();
    this.audio = null;
    this.analyser = null;
    this.speaking = false;
    this.visemes = {};
  }

  private finish() {
    this.speaking = false;
    this.visemes = {};
    const done = this.onDone; this.onDone = null;
    done?.();
  }

  update(dt: number) {
    if (!this.speaking || !this.analyser) {
      this.visemes["viseme_sil"] = lerp(this.visemes["viseme_sil"] ?? 0, 1, dt * 10);
      return;
    }

    // Sample amplitude from analyser.
    this.analyser.getByteTimeDomainData(this.buf);
    let sum = 0;
    for (let i = 0; i < this.buf.length; i++) sum += Math.abs(this.buf[i] - 128);
    const amplitude = Math.min(1, (sum / this.buf.length) / 28);

    this.phase += dt * 8;
    this.switchTimer -= dt;
    if (this.switchTimer <= 0) {
      this.switchTimer = 0.08 + Math.random() * 0.06;
      this.activeOpen = OPEN_VISEMES[(Math.random() * OPEN_VISEMES.length) | 0];
    }

    const target: VisemeMap = {};
    if (amplitude > 0.02) {
      const wave = Math.sin(this.phase) * 0.5 + 0.5;
      target[this.activeOpen] = Math.min(1, amplitude * 1.6 + wave * 0.2);
    } else {
      target["viseme_sil"] = 1;
    }

    const keys = new Set([...Object.keys(this.visemes), ...Object.keys(target)]);
    keys.forEach((k) => {
      const cur = this.visemes[k] ?? 0;
      const tgt = target[k] ?? 0;
      const next = lerp(cur, tgt, Math.min(1, dt * 18));
      if (next < 0.001 && tgt === 0) delete this.visemes[k];
      else this.visemes[k] = next;
    });
  }
}
