type Scene = { combat: boolean; intensity: number; boss: boolean; paused: boolean };

const MIX_KEY = "void-surge-mix-v1";

function clamp01(v: number) {
  return Math.max(0, Math.min(1, v));
}

export class AudioSys {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private sfx: GainNode | null = null;
  private music: GainNode | null = null;
  private sched: number | null = null;
  private nextT = 0;
  private step = 0;
  private bpm = 150;
  private scene: Scene = { combat: false, intensity: 1, boss: false, paused: false };
  muted = false;
  unlocked = false;
  sfxVol = 0.85;
  musicVol = 0.8;

  constructor() {
    this.loadMix();
  }

  unlock() {
    if (!this.ctx) {
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new Ctx({ latencyHint: "interactive" });
      this.master = this.ctx.createGain();
      this.sfx = this.ctx.createGain();
      this.music = this.ctx.createGain();
      this.master.gain.value = 0;
      this.sfx.gain.value = 0;
      this.music.gain.value = 0;
      this.sfx.connect(this.master);
      this.music.connect(this.master);
      this.master.connect(this.ctx.destination);
      this.applyMix();
    }
    if (this.ctx.state === "suspended") void this.ctx.resume();
    this.unlocked = true;
    this.startMusic();
  }

  resume() {
    if (this.ctx?.state === "suspended") void this.ctx.resume();
  }

  setMuted(v: boolean) {
    this.muted = v;
    this.applyMix();
    this.persistMix();
  }

  setSfxVol(v: number) {
    this.sfxVol = clamp01(v);
    this.applyMix();
    this.persistMix();
  }

  setMusicVol(v: number) {
    this.musicVol = clamp01(v);
    this.applyMix();
    this.persistMix();
  }

  setScene(partial: Partial<Scene>) {
    this.scene = { ...this.scene, ...partial };
    this.applyMix();
  }

  private loadMix() {
    try {
      const raw = localStorage.getItem(MIX_KEY);
      if (!raw) return;
      const p = JSON.parse(raw) as { sfx?: number; music?: number; muted?: boolean };
      if (typeof p.sfx === "number") this.sfxVol = clamp01(p.sfx);
      if (typeof p.music === "number") this.musicVol = clamp01(p.music);
      if (typeof p.muted === "boolean") this.muted = p.muted;
    } catch {
      /* ignore */
    }
  }

  private persistMix() {
    try {
      localStorage.setItem(MIX_KEY, JSON.stringify({ sfx: this.sfxVol, music: this.musicVol, muted: this.muted }));
    } catch {
      /* ignore */
    }
  }

  private applyMix() {
    if (!this.ctx || !this.master || !this.sfx || !this.music) return;
    const t = this.ctx.currentTime;
    this.master.gain.setTargetAtTime(this.muted ? 0 : 0.8, t, 0.03);
    this.sfx.gain.setTargetAtTime(this.sfxVol * this.sfxVol * 0.5, t, 0.03);
    const scene = this.scene.paused ? 0.42 : this.scene.combat ? 1 : 0.72;
    this.music.gain.setTargetAtTime(scene * this.musicVol * this.musicVol * 0.85, t, 0.06);
  }

  private tone(freq: number, dur: number, type: OscillatorType, gain: number, slide = 0) {
    if (!this.ctx || !this.sfx || this.muted || this.sfxVol < 0.01) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(40, freq + slide), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g);
    g.connect(this.sfx);
    osc.start(t);
    osc.stop(t + dur + 0.02);
    osc.onended = () => {
      osc.disconnect();
      g.disconnect();
    };
  }

  private noise(dur: number, gain: number, hp = 400) {
    if (!this.ctx || !this.sfx || this.muted || this.sfxVol < 0.01) return;
    const n = Math.floor(this.ctx.sampleRate * dur);
    const buf = this.ctx.createBuffer(1, n, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < n; i++) data[i] = Math.random() * 2 - 1;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const filter = this.ctx.createBiquadFilter();
    filter.type = "highpass";
    filter.frequency.value = hp;
    const g = this.ctx.createGain();
    const t = this.ctx.currentTime;
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(filter);
    filter.connect(g);
    g.connect(this.sfx);
    src.start(t);
    src.stop(t + dur);
    src.onended = () => {
      src.disconnect();
      filter.disconnect();
      g.disconnect();
    };
  }

  shoot() {
    this.tone(640 + Math.random() * 90, 0.07, "square", 0.055, -280);
  }
  hit() {
    this.noise(0.05, 0.07, 800);
    this.tone(240 + Math.random() * 50, 0.05, "triangle", 0.04, -80);
  }
  pickup() {
    this.tone(920, 0.08, "sine", 0.05, 420);
  }
  heal() {
    this.tone(520, 0.14, "sine", 0.06, 260);
  }
  levelup() {
    this.tone(392, 0.12, "triangle", 0.07);
    this.tone(523, 0.16, "triangle", 0.06);
    this.tone(659, 0.22, "sine", 0.05);
  }
  hurt() {
    this.noise(0.18, 0.28, 70);
    this.tone(86, 0.24, "sawtooth", 0.16, -55);
    this.tone(240, 0.1, "square", 0.09, -180);
    this.tone(48, 0.32, "sine", 0.1, -12);
  }
  boom() {
    this.noise(0.22, 0.15, 120);
    this.tone(70, 0.28, "sine", 0.1, -20);
  }
  phase() {
    this.tone(180, 0.4, "square", 0.05, 80);
    this.tone(90, 0.5, "sine", 0.08);
  }
  boss() {
    this.tone(48, 0.7, "sine", 0.14, -12);
    this.tone(96, 0.45, "sawtooth", 0.05);
    this.tone(196, 0.28, "square", 0.04);
  }
  win() {
    this.tone(392, 0.2, "triangle", 0.07);
    this.tone(523, 0.28, "triangle", 0.06);
    this.tone(784, 0.45, "sine", 0.05);
  }
  dead() {
    this.noise(0.85, 0.22, 40);
    this.tone(196, 0.55, "sawtooth", 0.14, -150);
    this.tone(82, 0.9, "triangle", 0.12, -50);
    this.tone(42, 1.4, "sine", 0.16, -10);
  }
  vacuum() {
    this.tone(523, 0.12, "sine", 0.07, 220);
    this.tone(784, 0.22, "triangle", 0.06, 180);
    this.tone(1046, 0.28, "sine", 0.04);
  }

  private startMusic() {
    if (!this.ctx || this.sched !== null) return;
    this.nextT = this.ctx.currentTime + 0.06;
    this.step = 0;
    this.sched = window.setInterval(() => this.schedule(), 25);
  }

  private schedule() {
    if (!this.ctx || !this.music) return;
    const sixteenth = 60 / this.bpm / 4;
    while (this.nextT < this.ctx.currentTime + 0.18) {
      this.playStep(this.step, this.nextT);
      this.nextT += sixteenth;
      this.step = (this.step + 1) % 64;
    }
  }

  private playStep(step: number, t: number) {
    if (!this.ctx || !this.music || this.muted || this.musicVol < 0.01) return;
    const s = this.scene;
    const beat = step % 16;
    const bar = Math.floor(step / 16) % 4;
    const bassSeq = [110, 110, 130.81, 98, 110, 82.41, 98, 146.83];
    const bass = bassSeq[Math.floor(step / 4) % bassSeq.length];
    const riff = [440, 0, 523.25, 0, 659.25, 587.33, 523.25, 0, 440, 392, 329.63, 0, 392, 0, 523.25, 440];
    const riffNote = riff[beat];
    const lift = s.intensity >= 4 ? 1.15 : 1;

    if (beat === 0) this.pad(t, bar % 2 === 0 ? 220 : 261.63, s.combat ? 0.055 : 0.07);

    if (beat % 4 === 0) this.bass(t, bass, 0.16 * lift);
    if (s.combat && beat % 8 === 6) this.bass(t, bass * 2, 0.08);

    if (!s.combat) {
      if (riffNote) this.lead(t, riffNote, 0.055);
      return;
    }

    if (beat === 0 || beat === 4 || beat === 8 || beat === 12) this.kick(t, 0.22);
    if (beat === 4 || beat === 12) this.snare(t);
    if (beat % 2 === 0) this.hat(t, beat % 4 === 0 ? 0.055 : 0.032);
    if (s.intensity >= 2 && beat % 2 === 1) this.hat(t, 0.018);
    if (riffNote) this.lead(t, riffNote * (bar === 3 ? 1.5 : 1), 0.07 * lift);
    if (s.intensity >= 3 && beat === 0) this.stab(t, 329.63);
    if (s.boss && (beat === 0 || beat === 8)) this.kick(t, 0.2, 80);
  }

  private kick(t: number, gain = 0.13, start = 140) {
    if (!this.ctx || !this.music) return;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(start, t);
    osc.frequency.exponentialRampToValueAtTime(38, t + 0.12);
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
    osc.connect(g);
    g.connect(this.music);
    osc.start(t);
    osc.stop(t + 0.24);
    osc.onended = () => {
      osc.disconnect();
      g.disconnect();
    };
  }

  private snare(t: number) {
    if (!this.ctx || !this.music) return;
    const n = Math.floor(this.ctx.sampleRate * 0.12);
    const buf = this.ctx.createBuffer(1, n, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < n; i++) data[i] = Math.random() * 2 - 1;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const bp = this.ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 1800;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.12, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
    src.connect(bp);
    bp.connect(g);
    g.connect(this.music);
    src.start(t);
    src.stop(t + 0.13);
    src.onended = () => {
      src.disconnect();
      bp.disconnect();
      g.disconnect();
    };
    this.toneAt(t, 220, 0.08, "triangle", 0.05);
  }

  private hat(t: number, gain: number) {
    if (!this.ctx || !this.music) return;
    const n = Math.floor(this.ctx.sampleRate * 0.04);
    const buf = this.ctx.createBuffer(1, n, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < n; i++) data[i] = Math.random() * 2 - 1;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const hp = this.ctx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 7000;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.04);
    src.connect(hp);
    hp.connect(g);
    g.connect(this.music);
    src.start(t);
    src.stop(t + 0.05);
    src.onended = () => {
      src.disconnect();
      hp.disconnect();
      g.disconnect();
    };
  }

  private bass(t: number, freq: number, gain: number) {
    if (!this.ctx || !this.music) return;
    const osc = this.ctx.createOscillator();
    const f = this.ctx.createBiquadFilter();
    const g = this.ctx.createGain();
    osc.type = "sawtooth";
    osc.frequency.value = freq;
    f.type = "lowpass";
    f.frequency.setValueAtTime(420, t);
    f.frequency.exponentialRampToValueAtTime(160, t + 0.28);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.32);
    osc.connect(f);
    f.connect(g);
    g.connect(this.music);
    osc.start(t);
    osc.stop(t + 0.34);
    osc.onended = () => {
      osc.disconnect();
      f.disconnect();
      g.disconnect();
    };
  }

  private lead(t: number, freq: number, gain: number) {
    if (!this.ctx || !this.music) return;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = "triangle";
    osc.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
    osc.connect(g);
    g.connect(this.music);
    osc.start(t);
    osc.stop(t + 0.18);
    osc.onended = () => {
      osc.disconnect();
      g.disconnect();
    };
  }

  private pad(t: number, freq: number, gain: number) {
    if (!this.ctx || !this.music) return;
    const osc = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = "sine";
    osc2.type = "sine";
    osc.frequency.value = freq;
    osc2.frequency.value = freq * 1.005;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(gain, t + 0.12);
    g.gain.linearRampToValueAtTime(gain * 0.35, t + 1.05);
    osc.connect(g);
    osc2.connect(g);
    g.connect(this.music);
    osc.start(t);
    osc2.start(t);
    osc.stop(t + 1.1);
    osc2.stop(t + 1.1);
    osc.onended = () => {
      osc.disconnect();
      osc2.disconnect();
      g.disconnect();
    };
  }

  private stab(t: number, freq: number) {
    this.toneAt(t, freq, 0.18, "sawtooth", 0.04);
    this.toneAt(t, freq * 1.5, 0.14, "triangle", 0.03);
  }

  private toneAt(t: number, freq: number, dur: number, type: OscillatorType, gain: number) {
    if (!this.ctx || !this.music) return;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g);
    g.connect(this.music);
    osc.start(t);
    osc.stop(t + dur + 0.02);
    osc.onended = () => {
      osc.disconnect();
      g.disconnect();
    };
  }

  dispose() {
    if (this.sched !== null) {
      clearInterval(this.sched);
      this.sched = null;
    }
    void this.ctx?.close();
    this.ctx = null;
  }
}
