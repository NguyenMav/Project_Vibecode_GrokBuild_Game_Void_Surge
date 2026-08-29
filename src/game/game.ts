import {
  ENEMY,
  FIXED_DT,
  MAX_BEAMS,
  MAX_BULLETS,
  MAX_DRONES,
  MAX_DT,
  MAX_ENEMIES,
  MAX_FLOATS,
  MAX_GEMS,
  MAX_GEAR_LEVEL,
  MAX_INTENSITY,
  MAX_MINES,
  MAX_PARTICLES,
  MAX_PASSIVE_SLOTS,
  MAX_SENTRIES,
  MAX_STRIKES,
  MAX_TRAILS,
  MAX_WEAPON_SLOTS,
  MAX_FODDER_SHOTS,
  PASSIVES,
  PHASE_SECONDS,
  PLAYER,
  RUN_SECONDS,
  STARTER_ID,
  WEAPON,
  WORLD,
  BOSS_ORDER,
  isBoss,
  type BossKind,
  type EnemyKind,
  type PassiveId,
} from "./config";
import { AudioSys } from "./audio";
import { Input } from "./input";
import { loadAtlas, type Atlas } from "./sprites";
import type {
  Beam,
  Best,
  Bullet,
  Choice,
  Drone,
  Enemy,
  FloatText,
  Gem,
  Hud,
  Mine,
  Mode,
  Particle,
  PassiveInst,
  Sentry,
  Strike,
  FlameTrail,
  WeaponInst,
} from "./types";
import { rollChoices, xpToNext } from "./upgrades";
import { renderFrame } from "./render";
import { killPoints, loadPilot, loadSave, persistPilot, persistSave, pushRun, sanitizePilot, serializeBoard, parseBoard, mergeRuns, bestFromRuns, EMPTY_BEST, type SaveState } from "./save";

function clamp(v: number, a: number, b: number) {
  return Math.max(a, Math.min(b, v));
}

function roundHp(n: number) {
  if (n <= 0) return 1;
  const mag = 10 ** Math.max(0, Math.floor(Math.log10(n)));
  return Math.max(1, Math.round(n / mag) * mag);
}

type Player = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  hp: number;
  maxHp: number;
  speed: number;
  regen: number;
  armor: number;
  pickup: number;
  cooldownMul: number;
  damageMul: number;
  xpMul: number;
  projSpeed: number;
  spawnMul: number;
  rangeMul: number;
  extraProj: number;
  iFrames: number;
  contactCd: number;
  facing: number;
  walk: number;
  dir: number;
  aim: number;
};

export class Game {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  input = new Input();
  audio = new AudioSys();
  atlas: Atlas | null = null;
  mode: Mode = "title";
  time = 0;
  acc = 0;
  last = 0;
  raf = 0;
  intensity = 1;
  titans = 0;
  bossesKilled = 0;
  spawnAcc = 0;
  banner = "";
  bannerT = 0;
  flashT = 0;
  hurtT = 0;
  deathT = 0;
  kills = 0;
  score = 0;
  named = true;
  pending: SaveState["runs"][number] | null = null;
  pilot = loadPilot();
  level = 0;
  xp = 0;
  xpNext = xpToNext(0);
  won = false;
  best: Best;
  board: SaveState["runs"] = [];
  reduced = false;
  mobile = false;
  viewW = 800;
  viewH = 600;
  camX = WORLD / 2;
  camY = WORLD / 2;
  trauma = 0;
  hitstop = 0;
  hudDirty = true;
  lastEmit = 0;
  lastMode: Mode = "title";
  listeners = new Set<(h: Hud) => void>();
  hudCache: Hud;
  weapons: WeaponInst[] = [];
  passives: PassiveInst[] = [];
  choices: Choice[] = [];
  player: Player;
  enemies: Enemy[] = [];
  bullets: Bullet[] = [];
  gems: Gem[] = [];
  mines: Mine[] = [];
  drones: Drone[] = [];
  sentries: Sentry[] = [];
  strikes: Strike[] = [];
  trails: FlameTrail[] = [];
  particles: Particle[] = [];
  floats: FloatText[] = [];
  beams: Beam[] = [];
  medkit = { alive: false, x: 0, y: 0 };
  vacuum = { alive: false, x: 0, y: 0, life: 0 };
  vacuumPull = 0;
  eCount = 0;
  bCount = 0;
  gCount = 0;
  hash = new Map<number, number[]>();
  nbEpoch = 1;
  nbSeen = new Uint16Array(MAX_ENEMIES);
  nbOut: number[] = [];
  heading = 0;
  destroyed = false;
  haloAngle = 0;
  saberSweep = 0;
  attractT = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) throw new Error("Canvas unsupported");
    this.ctx = ctx;
    const save = loadSave();
    this.best = save.best;
    this.board = save.runs;
    this.reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    this.player = this.freshPlayer();
    this.hudCache = this.buildHud();
    this.bootPools();
  }

  private freshPlayer(): Player {
    return {
      x: WORLD / 2,
      y: WORLD / 2,
      vx: 0,
      vy: 0,
      r: PLAYER.r,
      hp: PLAYER.hp,
      maxHp: PLAYER.hp,
      speed: PLAYER.speed,
      regen: 0.4,
      armor: 0,
      pickup: PLAYER.pickup,
      cooldownMul: 1,
      damageMul: 1,
      xpMul: 1,
      projSpeed: 1,
      spawnMul: 1,
      rangeMul: 1,
      extraProj: 0,
      iFrames: 0,
      contactCd: 0,
      facing: 1,
      walk: 0,
      dir: 0,
      aim: 0,
    };
  }

  private bootPools() {
    const e = (): Enemy => ({
      alive: false,
      kind: "crawler",
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      r: 8,
      hp: 1,
      maxHp: 1,
      speed: 0,
      dmg: 0,
      xp: 0,
      flash: 0,
      hitCd: 0,
      shotCd: 0,
      slow: 0,
      facing: 1,
      phase: 0,
      aim: 0,
      burst: 0,
    });
    this.enemies = Array.from({ length: MAX_ENEMIES }, e);
    this.bullets = Array.from({ length: MAX_BULLETS }, () => ({
      alive: false,
      team: 0,
      owner: -1,
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      r: 3,
      dmg: 0,
      life: 0,
      pierce: 0,
      homing: false,
      kind: "shotgun",
      slow: 0,
      aoe: 0,
    }));
    this.gems = Array.from({ length: MAX_GEMS }, () => ({
      alive: false,
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      value: 1,
      magnet: false,
    }));
    this.mines = Array.from({ length: MAX_MINES }, () => ({
      alive: false,
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      r: 48,
      dmg: 0,
      life: 0,
      arm: 0,
      slow: 0,
    }));
    this.drones = Array.from({ length: MAX_DRONES }, () => ({
      alive: false,
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      shotCd: 0,
      phase: 0,
    }));
    this.sentries = Array.from({ length: MAX_SENTRIES }, () => ({
      alive: false,
      x: 0,
      y: 0,
      life: 0,
      shotCd: 0,
      dmg: 0,
      range: 280,
    }));
    this.strikes = Array.from({ length: MAX_STRIKES }, () => ({
      alive: false,
      x: 0,
      y: 0,
      wait: 0,
      r: 42,
      dmg: 0,
      flash: 0,
      team: 0,
    }));
    this.trails = Array.from({ length: MAX_TRAILS }, () => ({
      alive: false,
      x: 0,
      y: 0,
      r: 24,
      dmg: 0,
      life: 0,
      max: 1,
    }));
    this.particles = Array.from({ length: MAX_PARTICLES }, () => ({
      alive: false,
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      life: 0,
      max: 1,
      size: 2,
      color: "#c5d0d6",
    }));
    this.floats = Array.from({ length: MAX_FLOATS }, () => ({
      alive: false,
      x: 0,
      y: 0,
      vy: 0,
      life: 0,
      text: "",
      color: "#e8eaef",
    }));
    this.beams = Array.from({ length: MAX_BEAMS }, () => ({
      alive: false,
      x1: 0,
      y1: 0,
      x2: 0,
      y2: 0,
      life: 0,
      width: 2,
      color: "#9ec4c8",
    }));
  }

  async start() {
    this.input.attach();
    this.atlas = await loadAtlas();
    this.resetWorld(true);
    this.last = performance.now();
    this.bindControlsTest();
    const loop = (now: number) => {
      if (this.destroyed) return;
      this.raf = requestAnimationFrame(loop);
      let dt = (now - this.last) / 1000;
      this.last = now;
      if (dt > MAX_DT) dt = MAX_DT;
      this.tick(dt, now);
    };
    this.raf = requestAnimationFrame(loop);
    this.emit(true);
  }

  destroy() {
    this.destroyed = true;
    cancelAnimationFrame(this.raf);
    this.input.detach();
    this.audio.dispose();
    if (window.__controlsTest) delete window.__controlsTest;
  }

  subscribe(fn: (h: Hud) => void) {
    this.listeners.add(fn);
    fn(this.hudCache);
    return () => this.listeners.delete(fn);
  }

  getHud() {
    return this.hudCache;
  }

  setStick(x: number, y: number) {
    this.input.setStick(x, y);
  }

  setPilot(name: string) {
    this.pilot = sanitizePilot(name);
    persistPilot(this.pilot);
    this.emit(true);
  }

  exportBoard() {
    return serializeBoard(this.board);
  }

  importBoard(raw: string) {
    const incoming = parseBoard(raw);
    if (!incoming) return false;
    this.board = mergeRuns(this.board, incoming);
    this.best = bestFromRuns(this.board);
    persistSave({ best: this.best, runs: this.board });
    this.emit(true);
    return true;
  }

  clearBoard() {
    this.best = { ...EMPTY_BEST };
    this.board = [];
    persistSave({ best: this.best, runs: this.board });
    this.emit(true);
  }

  beginRun(name?: string) {
    this.flushRun();
    if (name) {
      this.pilot = sanitizePilot(name);
      persistPilot(this.pilot);
    }
    this.audio.unlock();
    this.audio.setScene({ combat: true, intensity: 1, boss: false, paused: false });
    this.resetWorld(false);
    this.mode = "playing";
    this.emit(true);
  }

  retry() {
    this.flushRun();
    this.audio.unlock();
    this.audio.setScene({ combat: true, intensity: 1, boss: false, paused: false });
    this.resetWorld(false);
    this.mode = "playing";
    this.emit(true);
  }

  goHome() {
    this.flushRun();
    this.audio.setScene({ combat: false, boss: false, paused: false });
    this.resetWorld(true);
    this.mode = "title";
    this.emit(true);
  }

  togglePause() {
    if (this.mode === "playing") this.mode = "paused";
    else if (this.mode === "paused") this.mode = "playing";
    this.audio.setScene({ paused: this.mode === "paused" });
    this.emit(true);
  }

  setMuted(v: boolean) {
    this.audio.setMuted(v);
    this.emit(true);
  }

  setSfxVol(v: number) {
    this.audio.setSfxVol(v);
    this.emit(true);
  }

  setMusicVol(v: number) {
    this.audio.setMusicVol(v);
    this.emit(true);
  }

  choose(i: number) {
    const c = this.choices[i];
    if (!c || this.mode !== "levelup") return;
    this.applyChoice(c);
    this.choices = [];
    this.mode = "playing";
    this.grantXp(0);
    this.emit(true);
  }

  private resetWorld(attract: boolean) {
    this.time = 0;
    this.acc = 0;
    this.intensity = 1;
    this.titans = 0;
    this.bossesKilled = 0;
    this.spawnAcc = 0;
    this.banner = attract ? "" : "SIGNAL LOCKED";
    this.bannerT = attract ? 0 : 1.6;
    this.flashT = 0;
    this.hurtT = 0;
    this.deathT = 0;
    this.kills = 0;
    this.score = 0;
    this.pending = null;
    this.named = true;
    this.level = 0;
    this.xp = 0;
    this.xpNext = xpToNext(0);
    this.won = false;
    this.trauma = 0;
    this.hitstop = 0;
    this.player = this.freshPlayer();
    this.camX = this.player.x;
    this.camY = this.player.y;
    this.weapons = [{ id: STARTER_ID, level: 1, cd: 0 }];
    this.passives = [];
    this.choices = [];
    this.heading = 0;
    this.haloAngle = 0;
    this.saberSweep = 0;
    this.attractT = 0;
    this.eCount = 0;
    this.bCount = 0;
    this.gCount = 0;
    this.medkit.alive = false;
    this.vacuum.alive = false;
    this.vacuumPull = 0;
    for (const a of this.enemies) a.alive = false;
    for (const a of this.bullets) a.alive = false;
    for (const a of this.gems) a.alive = false;
    for (const a of this.mines) a.alive = false;
    for (const a of this.drones) a.alive = false;
    for (const a of this.sentries) a.alive = false;
    for (const a of this.strikes) a.alive = false;
    for (const a of this.trails) a.alive = false;
    for (const a of this.particles) a.alive = false;
    for (const a of this.floats) a.alive = false;
    for (const a of this.beams) a.alive = false;
    if (attract) this.mode = "title";
    this.audio.setScene({
      combat: !attract,
      intensity: 1,
      boss: false,
      paused: false,
    });
  }

  private tick(dt: number, now: number) {
    this.resize();
    if (this.input.consumePause()) {
      if (this.mode === "playing" || this.mode === "paused") this.togglePause();
    }
    const pick = this.input.consumePick();
    if (pick !== null && this.mode === "levelup") this.choose(pick);

    const sim = this.mode === "playing" || this.mode === "title";
    if (sim) {
      if (this.hitstop > 0) {
        this.hitstop -= dt;
      } else {
        this.acc += dt;
        while (this.acc >= FIXED_DT) {
          this.step(FIXED_DT);
          this.acc -= FIXED_DT;
        }
      }
    }
    this.trauma = Math.max(0, this.trauma - dt * 1.8);
    renderFrame(this, now);
  }

  private step(dt: number) {
    if (this.mode === "title") this.attractT += dt;
    else this.time += dt;

    const nextInt = 1 + Math.min(MAX_INTENSITY - 1, Math.floor(this.time / PHASE_SECONDS));
    if (this.mode === "playing" && nextInt > this.intensity) {
      this.intensity = nextInt;
      this.banner = `INTENSITY ${this.intensity}`;
      this.bannerT = 2.4;
      this.addTrauma(0.7);
      this.audio.phase();
      this.audio.setScene({ intensity: this.intensity });
      for (let i = 0; i < 3 + this.intensity; i++) this.spawnEnemy(this.rollKind(), true);
    }

    if (this.mode === "playing") {
      const wantBosses = Math.min(BOSS_ORDER.length, Math.floor(this.time / 120));
      while (this.titans < wantBosses) this.spawnBoss();
      if (this.time >= RUN_SECONDS) {
        this.winRun();
        return;
      }
    }

    if (this.bannerT > 0) this.bannerT -= dt;
    if (this.flashT > 0) this.flashT -= dt;
    if (this.hurtT > 0) this.hurtT -= dt;
    if (this.mode === "over" && !this.won) this.deathT = Math.min(1, this.deathT + dt * 1.6);
    else if (this.deathT > 0) this.deathT = Math.max(0, this.deathT - dt);
    if (this.vacuumPull > 0) this.vacuumPull -= dt;
    this.updatePlayer(dt);
    this.spawnWave(dt);
    this.updateEnemies(dt);
    this.updateWeapons(dt);
    this.updateDrones(dt);
    this.updateSentries(dt);
    this.updateStrikes(dt);
    this.updateTrails(dt);
    this.updateBullets(dt);
    this.updateMines(dt);
    this.updateGems(dt);
    this.updateVfx(dt);
    this.collide();
    this.followCam(dt);
    this.emit();
  }

  private updatePlayer(dt: number) {
    const p = this.player;
    let mv = this.input.move();
    if (this.mode === "title" && !this.input.hasInjected()) {
      const t = this.attractT;
      mv = { x: Math.sin(t * 0.7), y: Math.cos(t * 0.45) };
      const len = Math.hypot(mv.x, mv.y) || 1;
      mv.x /= len;
      mv.y /= len;
    }
    p.vx = mv.x * p.speed;
    p.vy = mv.y * p.speed;
    p.x = clamp(p.x + p.vx * dt, 80, WORLD - 80);
    p.y = clamp(p.y + p.vy * dt, 80, WORLD - 80);

    const moving = Math.hypot(mv.x, mv.y) > 0.01;
    if (moving) {
      this.heading = Math.atan2(-mv.x, -mv.y);
      p.aim = Math.atan2(mv.y, mv.x);
      p.walk += dt * 12;
      if (Math.abs(mv.x) > Math.abs(mv.y)) p.dir = mv.x > 0 ? 2 : 1;
      else p.dir = mv.y > 0 ? 0 : 3;
    }
    p.iFrames = Math.max(0, p.iFrames - dt);
    p.contactCd = Math.max(0, p.contactCd - dt);
    if (p.regen > 0 && this.mode === "playing") p.hp = Math.min(p.maxHp, p.hp + p.regen * dt);

    if (!this.medkit.alive && this.mode === "playing" && Math.random() < dt * 0.04) {
      const a = Math.random() * Math.PI * 2;
      this.medkit.alive = true;
      this.medkit.x = clamp(p.x + Math.cos(a) * 380, 120, WORLD - 120);
      this.medkit.y = clamp(p.y + Math.sin(a) * 380, 120, WORLD - 120);
    }
    if (this.medkit.alive) {
      const dx = this.medkit.x - p.x;
      const dy = this.medkit.y - p.y;
      if (dx * dx + dy * dy < (p.r + 16) ** 2) {
        this.medkit.alive = false;
        p.hp = Math.min(p.maxHp, p.hp + 28);
        this.audio.heal();
        this.float(p.x, p.y - 20, "+28", "#6f9e86");
      }
    }
    if (this.vacuum.alive && this.mode === "playing") {
      this.vacuum.life -= dt;
      const dx = p.x - this.vacuum.x;
      const dy = p.y - this.vacuum.y;
      const d = Math.hypot(dx, dy) || 1;
      this.vacuum.x += (dx / d) * 46 * dt;
      this.vacuum.y += (dy / d) * 46 * dt;
      if (d < p.r + 22 || this.vacuum.life <= 0) this.triggerVacuum();
    }
  }

  private lastMinuteSurge() {
    if (this.mode !== "playing") return 1;
    const elapsed = this.time - (RUN_SECONDS - 60);
    if (elapsed < 0) return 1;
    const steps = 1 + Math.min(5, Math.floor(elapsed / 10));
    return 2 ** steps;
  }

  private spawnWave(dt: number) {
    const surge = this.lastMinuteSurge();
    const cap = surge > 1 ? (this.mobile ? 110 : MAX_ENEMIES - 4) : this.mobile ? 80 : 140;
    if (this.eCount >= cap) return;
    const t = this.mode === "title" ? 40 + this.attractT * 0.4 : this.time;
    const i = this.mode === "title" ? 2 : this.intensity;
    const base = (0.85 + t * 0.008) * (1 + (i - 1) * 0.22) * this.player.spawnMul * 2;
    const rate = Math.min(surge > 1 ? 42 : 17, base * surge);
    this.spawnAcc += dt * rate;
    while (this.spawnAcc >= 1 && this.eCount < cap) {
      this.spawnAcc -= 1;
      this.spawnEnemy(this.rollKind(), false);
    }
  }

  private rollKind(): EnemyKind {
    const i = this.mode === "title" ? 2 : this.intensity;
    const r = Math.random();
    if (i <= 1) return "crawler";
    if (i === 2) return r < 0.7 ? "crawler" : "brute";
    if (i === 3) return r < 0.52 ? "crawler" : r < 0.82 ? "brute" : "spitter";
    if (i === 4) return r < 0.38 ? "crawler" : r < 0.66 ? "brute" : r < 0.88 ? "spitter" : "elite";
    if (i === 5) return r < 0.3 ? "crawler" : r < 0.55 ? "brute" : r < 0.8 ? "spitter" : "elite";
    if (i === 6) return r < 0.22 ? "crawler" : r < 0.48 ? "brute" : r < 0.74 ? "spitter" : "elite";
    if (i === 7) return r < 0.16 ? "crawler" : r < 0.4 ? "brute" : r < 0.68 ? "spitter" : "elite";
    if (i === 8) return r < 0.12 ? "crawler" : r < 0.34 ? "brute" : r < 0.6 ? "spitter" : "elite";
    if (i === 9) return r < 0.08 ? "crawler" : r < 0.28 ? "brute" : r < 0.52 ? "spitter" : "elite";
    return r < 0.05 ? "crawler" : r < 0.22 ? "brute" : r < 0.48 ? "spitter" : "elite";
  }

  private spawnBoss() {
    const idx = this.titans;
    const kind: BossKind = BOSS_ORDER[idx] ?? "crown";
    this.titans += 1;
    const hpMul = 1 + idx * 0.4;
    this.spawnEnemy(kind, true, hpMul);
    const def = ENEMY[kind];
    this.banner = `BOSS: ${def.name}`;
    this.bannerT = 2.6;
    this.flashT = 0.45;
    this.addTrauma(0.75);
    this.audio.boss();
    this.audio.setScene({ boss: true, intensity: this.intensity });
    for (let i = 0; i < 5 + idx; i++) this.spawnEnemy(idx >= 3 ? "elite" : "crawler", true);
  }

  private spawnNamed(kind: EnemyKind) {
    this.spawnEnemy(kind, true);
    this.bannerT = 2;
    this.addTrauma(0.55);
  }

  private spawnEnemy(kind: EnemyKind, burst: boolean, hpMul = 1) {
    let slot = this.enemies.find((e) => !e.alive);
    if (!slot && isBoss(kind)) {
      const fodder = this.enemies.find((e) => e.alive && !isBoss(e.kind));
      if (fodder) {
        fodder.alive = false;
        this.eCount = Math.max(0, this.eCount - 1);
        slot = fodder;
      }
    }
    if (!slot) return;
    const def = ENEMY[kind];
    const i = Math.max(1, this.intensity);
    const scaleHp = isBoss(kind) ? 1 + (i - 1) * 0.1 : 1 + (i - 1) * 0.08;
    const scaleSp = 1 + (i - 1) * 0.09;
    const ring = this.viewRadius() + (burst ? 40 : 70);
    const a = Math.random() * Math.PI * 2;
    slot.alive = true;
    slot.kind = kind;
    slot.x = this.player.x + Math.cos(a) * ring;
    slot.y = this.player.y + Math.sin(a) * ring;
    slot.vx = 0;
    slot.vy = 0;
    slot.r = def.r;
    slot.maxHp = roundHp(def.hp * scaleHp * hpMul);
    slot.hp = slot.maxHp;
    slot.speed = def.speed * scaleSp;
    slot.dmg = def.dmg * (1 + (this.intensity - 1) * 0.08);
    slot.xp = def.xp;
    slot.flash = 0;
    slot.hitCd = 0;
    slot.shotCd = isBoss(kind) ? 1.2 : Math.random() * 1.2;
    slot.slow = 0;
    slot.facing = 1;
    slot.phase = 0;
    slot.aim = Math.random() * Math.PI * 2;
    slot.burst = 0;
    this.eCount += 1;
  }

  private viewRadius() {
    return Math.hypot(this.viewW, this.viewH) * 0.52 + 40;
  }

  private bossShot(
    e: Enemy,
    owner: number,
    ang: number,
    spd: number,
    dmg: number,
    opts: {
      r?: number;
      life?: number;
      homing?: boolean;
      slow?: number;
      kind?: Bullet["kind"];
      x?: number;
      y?: number;
    } = {},
  ) {
    this.fireBullet({
      team: 1,
      owner,
      x: opts.x ?? e.x,
      y: opts.y ?? e.y,
      vx: Math.cos(ang) * spd,
      vy: Math.sin(ang) * spd,
      r: opts.r ?? 6,
      dmg,
      life: opts.life ?? 2.2,
      pierce: 0,
      homing: opts.homing ?? false,
      kind: opts.kind ?? "spit",
      slow: opts.slow ?? 0,
      aoe: 0,
    });
  }

  private tickFodder(e: Enemy, idx: number, dt: number, dx: number, dy: number, d: number) {
    const i = this.intensity;
    if (e.kind === "spitter") {
      e.shotCd -= dt;
      if (e.shotCd <= 0 && d < 340 + i * 8 && d > 55) {
        e.shotCd = Math.max(0.9, ENEMY.spitter.shotCd - (i - 1) * 0.1);
        const room = MAX_FODDER_SHOTS - this.ownedShots(idx);
        if (room <= 0) return;
        const base = Math.atan2(dy, dx);
        const n = Math.min(room, i >= 8 ? 3 : i >= 5 ? 2 : 1);
        const spread = n > 1 ? 0.2 : 0;
        const spd = ENEMY.spitter.shotSpd * (1 + (i - 1) * 0.04);
        for (let k = 0; k < n; k++) {
          const ang = base + (k - (n - 1) / 2) * spread;
          this.fireBullet({
            team: 1,
            owner: idx,
            x: e.x,
            y: e.y,
            vx: Math.cos(ang) * spd,
            vy: Math.sin(ang) * spd,
            r: 5,
            dmg: ENEMY.spitter.shotDmg,
            life: 1.8,
            pierce: 0,
            homing: false,
            kind: "spit",
            slow: i >= 6 ? 0.5 : 0,
            aoe: 0,
          });
        }
      }
    } else if (e.kind === "elite" && i >= 3 && e.phase <= 0 && d > 70 && Math.random() < dt * (0.22 + i * 0.04)) {
      e.phase = 0.26 + Math.min(0.12, i * 0.01);
      const s = 300 + i * 16;
      e.vx = (dx / d) * s;
      e.vy = (dy / d) * s;
    } else if (e.kind === "brute" && i >= 4 && e.phase <= 0 && d > 90 && d < 280 && Math.random() < dt * (0.18 + i * 0.03)) {
      e.phase = 0.34;
      const s = 260 + i * 14;
      e.vx = (dx / d) * s;
      e.vy = (dy / d) * s;
    } else if (e.kind === "crawler" && i >= 6 && e.phase <= 0 && d > 40 && Math.random() < dt * 0.35) {
      e.phase = 0.18;
      const s = 220 + i * 10;
      e.vx = (dx / d) * s;
      e.vy = (dy / d) * s;
    }
  }

  private tickBoss(e: Enemy, idx: number, dt: number, dx: number, dy: number, d: number) {
    e.shotCd -= dt;
    e.aim += dt;
    const dmg = Math.max(8, e.dmg * 0.7);
    if (e.kind === "hearth") {
      if (d < 88 && e.shotCd <= 0.4) {
        const p = this.player;
        if (p.iFrames <= 0) {
          this.playerHit(e.dmg * 0.45, true);
          p.x -= (dx / d) * 42;
          p.y -= (dy / d) * 42;
        }
        this.burst(e.x, e.y, 12, "#ff5a4a");
        e.shotCd = 2.6;
      }
      if (e.shotCd <= 0) {
        e.shotCd = 2.8;
        for (let k = 0; k < 10; k++) this.bossShot(e, idx, (k / 10) * Math.PI * 2 + this.time, 180, dmg);
        this.addTrauma(0.2);
      }
    } else if (e.kind === "hydra") {
      if (e.shotCd <= 0) {
        e.shotCd = 1.55;
        const base = Math.atan2(dy, dx);
        for (const off of [-0.32, 0, 0.32]) this.bossShot(e, idx, base + off, 240, dmg, { slow: 0.8, r: 5 });
      }
      if (e.phase <= 0 && d > 90 && Math.random() < dt * 0.35) {
        e.phase = 0.38;
        const s = 420;
        e.vx = (dx / d) * s;
        e.vy = (dy / d) * s;
      }
    } else if (e.kind === "colossus") {
      if (e.shotCd <= 0) {
        e.shotCd = 1.85;
        const base = Math.atan2(dy, dx);
        const wall = Math.floor(this.time / 1.85) % 2 === 0;
        if (wall) {
          const perp = base + Math.PI / 2;
          for (let k = -2; k <= 2; k++) {
            this.bossShot(e, idx, base, 158, dmg * 1.15, {
              r: 9,
              life: 3.5,
              kind: "siege",
              x: e.x + Math.cos(perp) * k * 28,
              y: e.y + Math.sin(perp) * k * 28,
            });
          }
        } else {
          for (let k = 0; k < 6; k++) {
            this.bossShot(e, idx, e.aim * 0.85 + (k / 6) * Math.PI * 2, 170, dmg, {
              r: 8,
              life: 3.2,
              kind: "siege",
            });
          }
        }
        for (const off of [-70, 0, 70]) {
          const slot = this.strikes.find((s) => !s.alive);
          if (!slot) break;
          const a = base + Math.PI + off * 0.01;
          slot.alive = true;
          slot.x = this.player.x + Math.cos(a) * Math.abs(off);
          slot.y = this.player.y + Math.sin(a) * Math.abs(off);
          slot.wait = 0.55 + Math.abs(off) * 0.002;
          slot.r = 48;
          slot.dmg = dmg * 1.35;
          slot.flash = 0;
          slot.team = 1;
        }
        this.addTrauma(0.16);
      }
      e.phase -= dt;
      if (e.phase <= 0) {
        e.phase = 6.2;
        this.spawnEnemy("brute", true);
        this.spawnEnemy("crawler", true);
      }
    } else if (e.kind === "specter") {
      this.tickSpecter(e, idx, dmg, dt);
    } else if (e.kind === "crown") {
      const ang = e.aim * 1.4;
      const reach = 360;
      this.addBeam(e.x, e.y, e.x + Math.cos(ang) * reach, e.y + Math.sin(ang) * reach, 0.08, 5, "#ffe08a");
      const nx = -Math.sin(ang);
      const ny = Math.cos(ang);
      const p = this.player;
      const along = (p.x - e.x) * Math.cos(ang) + (p.y - e.y) * Math.sin(ang);
      const dist = Math.abs((p.x - e.x) * nx + (p.y - e.y) * ny);
      if (along > 0 && along < reach && dist < 18 && p.iFrames <= 0) {
        this.playerHit(dmg * 0.35 * 8, false);
      }
      if (e.shotCd <= 0) {
        e.shotCd = 3.4;
        for (let k = 0; k < 12; k++) this.bossShot(e, idx, (k / 12) * Math.PI * 2, 200, dmg);
        this.spawnEnemy("elite", true);
        this.addTrauma(0.28);
      }
    }
  }

  private specterBlink(e: Enemy) {
    const a = Math.random() * Math.PI * 2;
    const dist = 170 + Math.random() * 70;
    e.x = this.player.x + Math.cos(a) * dist;
    e.y = this.player.y + Math.sin(a) * dist;
    e.phase = 0.42;
    this.burst(e.x, e.y, 18, "#c9a0ff");
    this.addTrauma(0.2);
  }

  private specterSeekers(e: Enemy, idx: number, dmg: number, n = 3) {
    const base = Math.atan2(this.player.y - e.y, this.player.x - e.x);
    for (let k = 0; k < n; k++) {
      this.bossShot(e, idx, base + (k - (n - 1) / 2) * 0.4, 88, dmg * 1.15, {
        r: 8,
        life: 3.6,
        homing: true,
        kind: "phase",
      });
    }
  }

  private tickSpecter(e: Enemy, idx: number, dmg: number, dt: number) {
    e.phase = Math.max(0, e.phase - dt);
    if (e.shotCd > 0) return;
    let pattern = Math.floor(e.burst / 10);
    let step = e.burst % 10;
    if (step === 0) {
      pattern = (pattern + 1) % 4;
      step = 1;
      this.specterBlink(e);
    }
    const p = this.player;
    const base = Math.atan2(p.y - e.y, p.x - e.x);
    if (pattern === 0) {
      if (step === 1) {
        for (let k = 0; k < 18; k++) {
          this.bossShot(e, idx, base + k * 0.35 + e.aim, 110 + (k % 6) * 18, dmg, {
            r: 5,
            life: 2.9,
            kind: "phase",
          });
        }
        e.shotCd = 0.32;
        e.burst = 2;
      } else if (step === 2) {
        for (let k = 0; k < 14; k++) {
          const a = (k / 14) * Math.PI * 2;
          const tx = p.x + Math.cos(a) * 108;
          const ty = p.y + Math.sin(a) * 108;
          this.bossShot(e, idx, Math.atan2(ty - e.y, tx - e.x), 210, dmg, {
            r: 5,
            life: 2.4,
            kind: "phase",
            x: e.x,
            y: e.y,
          });
        }
        e.shotCd = 0.28;
        e.burst = 3;
      } else {
        this.specterSeekers(e, idx, dmg, 3);
        e.shotCd = 2.35;
        e.burst = 0;
      }
    } else if (pattern === 1) {
      const phantoms = [
        { x: e.x, y: e.y },
        { x: e.x + Math.cos(e.aim) * 150, y: e.y + Math.sin(e.aim) * 150 },
        { x: e.x + Math.cos(e.aim + 2.094) * 150, y: e.y + Math.sin(e.aim + 2.094) * 150 },
      ];
      if (step === 1) {
        for (const o of phantoms) {
          this.burst(o.x, o.y, 8, "#c9a0ff");
          for (let k = 0; k < 6; k++) {
            this.bossShot(e, idx, (k / 6) * Math.PI * 2 + e.aim, 168, dmg, {
              r: 5,
              life: 2.6,
              kind: "phase",
              x: o.x,
              y: o.y,
            });
          }
        }
        e.shotCd = 0.26;
        e.burst = 12;
      } else if (step === 2) {
        for (const o of phantoms) {
          const a = Math.atan2(p.y - o.y, p.x - o.x);
          for (let k = -2; k <= 2; k++) {
            this.bossShot(e, idx, a + k * 0.16, 200, dmg, {
              r: 5,
              life: 2.5,
              kind: "phase",
              x: o.x,
              y: o.y,
            });
          }
        }
        e.shotCd = 0.24;
        e.burst = 13;
      } else {
        for (let k = 0; k < 8; k++) {
          this.bossShot(e, idx, e.aim + (k / 8) * Math.PI * 2, 190, dmg, { r: 6, life: 2.8, kind: "phase" });
        }
        this.specterSeekers(e, idx, dmg, 2);
        e.shotCd = 2.2;
        e.burst = 10;
      }
    } else if (pattern === 2) {
      const perp = base + Math.PI / 2;
      if (step === 1) {
        for (let k = -4; k <= 4; k++) {
          this.bossShot(e, idx, base, 172, dmg, {
            r: 6,
            life: 3.1,
            kind: "phase",
            x: e.x + Math.cos(perp) * k * 26,
            y: e.y + Math.sin(perp) * k * 26,
          });
        }
        e.shotCd = 0.22;
        e.burst = 22;
      } else if (step === 2) {
        for (let k = -4; k <= 4; k++) {
          this.bossShot(e, idx, perp, 172, dmg, {
            r: 6,
            life: 3.1,
            kind: "phase",
            x: e.x + Math.cos(base) * k * 26,
            y: e.y + Math.sin(base) * k * 26,
          });
        }
        e.shotCd = 0.2;
        e.burst = 23;
      } else if (step === 3) {
        this.specterBlink(e);
        for (let k = 0; k < 10; k++) {
          this.bossShot(e, idx, (k / 10) * Math.PI * 2, 186, dmg, { r: 5, life: 2.7, kind: "phase" });
        }
        e.shotCd = 0.2;
        e.burst = 24;
      } else {
        for (let k = 0; k < 10; k++) {
          this.bossShot(e, idx, (k / 10) * Math.PI * 2 + 0.31, 186, dmg, { r: 5, life: 2.7, kind: "phase" });
        }
        this.specterSeekers(e, idx, dmg, 2);
        e.shotCd = 2.15;
        e.burst = 20;
      }
    } else {
      if (step <= 8) {
        const spin = e.aim * 2.4 + step * 0.38;
        for (let k = 0; k < 4; k++) {
          this.bossShot(e, idx, spin + (k / 4) * Math.PI * 2, 154 + step * 6, dmg, {
            r: 5,
            life: 2.8,
            kind: "phase",
          });
        }
        e.shotCd = 0.11;
        e.burst = 30 + step + 1;
      } else {
        for (let k = 0; k < 12; k++) {
          const a = (k / 12) * Math.PI * 2;
          this.bossShot(e, idx, Math.atan2(p.y + Math.sin(a) * 70 - e.y, p.x + Math.cos(a) * 70 - e.x), 220, dmg, {
            r: 5,
            life: 2.3,
            kind: "phase",
          });
        }
        this.specterSeekers(e, idx, dmg, 3);
        e.shotCd = 2.1;
        e.burst = 30;
      }
    }
  }

  private updateEnemies(dt: number) {
    const p = this.player;
    this.rebuildHash();
    const maxD = this.viewRadius() + 420;
    for (let i = 0; i < this.enemies.length; i++) {
      const e = this.enemies[i];
      if (!e.alive) continue;
      e.flash = Math.max(0, e.flash - dt);
      e.hitCd = Math.max(0, e.hitCd - dt);
      e.slow = Math.max(0, e.slow - dt);
      const dx = p.x - e.x;
      const dy = p.y - e.y;
      const d2 = dx * dx + dy * dy;
      if (d2 > maxD * maxD) {
        const a = Math.random() * Math.PI * 2;
        const ring = this.viewRadius() + 60;
        e.x = p.x + Math.cos(a) * ring;
        e.y = p.y + Math.sin(a) * ring;
        continue;
      }
      const d = Math.sqrt(d2) || 1;
      let sx = 0;
      let sy = 0;
      const cell = this.cell(e.x, e.y);
      const nbs = this.hash.get(cell);
      if (nbs) {
        for (const j of nbs) {
          if (j === i) continue;
          const o = this.enemies[j];
          if (!o.alive) continue;
          const ox = e.x - o.x;
          const oy = e.y - o.y;
          const od = ox * ox + oy * oy;
          const min = (e.r + o.r) * 0.85;
          if (od < min * min && od > 0.01) {
            const inv = 1 / Math.sqrt(od);
            sx += ox * inv;
            sy += oy * inv;
          }
        }
      }
      const spd = e.speed * (e.slow > 0 ? 0.45 : 1);
      const dashing =
        (e.kind === "hydra" || e.kind === "elite" || e.kind === "brute" || e.kind === "crawler") && e.phase > 0;
      if (dashing) {
        e.x += e.vx * dt;
        e.y += e.vy * dt;
        e.phase -= dt;
      } else {
        e.vx = (dx / d) * spd + sx * 40;
        e.vy = (dy / d) * spd + sy * 40;
        e.x += e.vx * dt;
        e.y += e.vy * dt;
      }
      if (e.vx !== 0) e.facing = e.vx < 0 ? -1 : 1;

      if (!isBoss(e.kind)) this.tickFodder(e, i, dt, dx, dy, d);
      if (isBoss(e.kind) && this.mode === "playing") this.tickBoss(e, i, dt, dx, dy, d);

      const ghost = e.kind === "specter" && e.phase > 0;
      if (!ghost && this.mode === "playing" && p.iFrames <= 0 && p.contactCd <= 0) {
        const hitR = p.r + e.r - 4;
        if (d2 < hitR * hitR) {
          this.playerHit(e.dmg, true);
          const push = 28;
          e.x -= (dx / d) * push;
          e.y -= (dy / d) * push;
        }
      }
    }
  }

  private updateWeapons(dt: number) {
    this.haloAngle += dt * 2.4;
    if (this.saberSweep > 0) this.saberSweep = Math.max(0, this.saberSweep - dt * 6);
    const p = this.player;
    for (const w of this.weapons) {
      w.cd -= dt;
      if (w.cd > 0) continue;
      const lv = w.level - 1;
      const cdMul = p.cooldownMul;
      if (w.id === "saber") {
        w.cd = WEAPON.saber.cd[lv] * cdMul;
        this.swingSaber(lv);
      } else if (w.id === "shotgun") {
        w.cd = WEAPON.shotgun.cd[lv] * cdMul;
        this.fireShotgun(lv);
      } else if (w.id === "laser") {
        w.cd = WEAPON.laser.cd[lv] * cdMul;
        this.fireLaser(lv);
      } else if (w.id === "flamer") {
        if (this.dropTrail(lv)) w.cd = WEAPON.flamer.cd[lv] * cdMul;
        else w.cd = 0.05 * cdMul;
      } else if (w.id === "orbs") {
        w.cd = WEAPON.orbs.cd[lv] * cdMul;
        this.tickOrbs(lv);
      } else if (w.id === "drone") {
        w.cd = WEAPON.drone.cd[lv] * cdMul;
        this.syncDrones(this.wCount(WEAPON.drone.count[lv], MAX_DRONES));
      } else if (w.id === "sentry") {
        w.cd = WEAPON.sentry.cd[lv] * cdMul;
        this.dropSentry(lv);
      } else if (w.id === "tesla") {
        w.cd = WEAPON.tesla.cd[lv] * cdMul;
        this.fireTesla(lv);
      } else if (w.id === "rad") {
        w.cd = WEAPON.rad.cd[lv] * cdMul;
        this.tickRad(lv);
      } else if (w.id === "orbit") {
        w.cd = WEAPON.orbit.cd[lv] * cdMul;
        this.fireOrbit(lv);
      } else if (w.id === "cryo") {
        w.cd = WEAPON.cryo.cd[lv] * cdMul;
        this.throwCryo(lv);
      }
    }
    if (!this.weapons.some((w) => w.id === "drone")) this.syncDrones(0);
  }

  private wRange(v: number) {
    return v * this.player.rangeMul;
  }

  private wCount(v: number, cap = 16) {
    return Math.min(cap, v + this.player.extraProj);
  }

  private nearest(range: number, skip?: Enemy, ox?: number, oy?: number): Enemy | null {
    const x = ox ?? this.player.x;
    const y = oy ?? this.player.y;
    let best: Enemy | null = null;
    let bd = range * range;
    for (const e of this.enemies) {
      if (!e.alive || e === skip) continue;
      const dx = e.x - x;
      const dy = e.y - y;
      const d = dx * dx + dy * dy;
      if (d < bd) {
        bd = d;
        best = e;
      }
    }
    return best;
  }

  private swingSaber(lv: number) {
    const def = WEAPON.saber;
    const p = this.player;
    const aim = p.aim;
    const range = this.wRange(def.range[lv]);
    const arc = def.arc[lv];
    const dmg = def.dmg[lv] * p.damageMul;
    this.saberSweep = 1;
    for (const e of this.enemies) {
      if (!e.alive) continue;
      const dx = e.x - p.x;
      const dy = e.y - p.y;
      const d = Math.hypot(dx, dy);
      if (d > range + e.r || d < 1) continue;
      let da = Math.atan2(dy, dx) - aim;
      while (da > Math.PI) da -= Math.PI * 2;
      while (da < -Math.PI) da += Math.PI * 2;
      if (Math.abs(da) <= arc) this.hurtEnemy(e, dmg, dx, dy);
    }
    this.audio.shoot();
  }

  private fireShotgun(lv: number) {
    const def = WEAPON.shotgun;
    const reach = this.wRange(def.range);
    const t = this.nearest(reach);
    const aim = t ? Math.atan2(t.y - this.player.y, t.x - this.player.x) : this.player.aim;
    const n = this.wCount(def.pellets[lv]);
    const spd = def.speed * this.player.projSpeed;
    for (let i = 0; i < n; i++) {
      const a = aim + (i - (n - 1) / 2) * def.spread[lv];
      this.fireBullet({
        team: 0,
        x: this.player.x,
        y: this.player.y,
        vx: Math.cos(a) * spd,
        vy: Math.sin(a) * spd,
        r: def.r,
        dmg: def.dmg[lv] * this.player.damageMul,
        life: reach / spd,
        pierce: 0,
        homing: false,
        kind: "shotgun",
        slow: 0,
        aoe: 0,
      });
    }
    this.audio.shoot();
  }

  private fireLaser(lv: number) {
    const def = WEAPON.laser;
    const maxR = this.wRange(def.range[lv]);
    const t = this.nearest(maxR);
    const base = t ? Math.atan2(t.y - this.player.y, t.x - this.player.x) : this.player.aim;
    const beams = this.wCount(1, 6);
    const dmg = def.dmg[lv] * this.player.damageMul;
    for (let b = 0; b < beams; b++) {
      const aim = base + (b - (beams - 1) / 2) * 0.14;
      const x2 = this.player.x + Math.cos(aim) * maxR;
      const y2 = this.player.y + Math.sin(aim) * maxR;
      this.addBeam(this.player.x, this.player.y, x2, y2, 0.1, def.width[lv], "#ff6b4a");
      const hits: { e: Enemy; along: number }[] = [];
      const nx = -Math.sin(aim);
      const ny = Math.cos(aim);
      for (const e of this.enemies) {
        if (!e.alive) continue;
        const dx = e.x - this.player.x;
        const dy = e.y - this.player.y;
        const along = dx * Math.cos(aim) + dy * Math.sin(aim);
        if (along < 0 || along > maxR) continue;
        const dist = Math.abs(dx * nx + dy * ny);
        if (dist < 16 + e.r) hits.push({ e, along });
      }
      hits.sort((a, b) => a.along - b.along);
      const n = Math.min(def.pierce[lv], hits.length);
      for (let i = 0; i < n; i++) this.hurtEnemy(hits[i].e, dmg, Math.cos(aim), Math.sin(aim));
    }
    this.audio.shoot();
  }

  private dropTrail(lv: number) {
    const def = WEAPON.flamer;
    const p = this.player;
    if (Math.hypot(p.vx, p.vy) < 28) return false;
    const gap = def.gap[lv];
    for (const t of this.trails) {
      if (!t.alive) continue;
      const dx = t.x - p.x;
      const dy = t.y - p.y;
      if (dx * dx + dy * dy < gap * gap) return false;
    }
    let slot = this.trails.find((t) => !t.alive);
    if (!slot) {
      let oldest: FlameTrail | null = null;
      for (const t of this.trails) {
        if (!oldest || t.life < oldest.life) oldest = t;
      }
      slot = oldest ?? undefined;
    }
    if (!slot) return false;
    const life = def.life[lv];
    slot.alive = true;
    slot.x = p.x;
    slot.y = p.y;
    slot.r = this.wRange(def.radius[lv]);
    slot.dmg = def.dmg[lv] * p.damageMul;
    slot.max = life;
    slot.life = life;
    this.burst(p.x, p.y, 2, "#ff7a45");
    return true;
  }

  private updateTrails(dt: number) {
    for (const t of this.trails) {
      if (!t.alive) continue;
      t.life -= dt;
      if (t.life <= 0) {
        t.alive = false;
        continue;
      }
      for (const e of this.enemies) {
        if (!e.alive || e.hitCd > 0) continue;
        const dx = e.x - t.x;
        const dy = e.y - t.y;
        if (dx * dx + dy * dy < (t.r + e.r) * (t.r + e.r)) {
          this.hurtEnemy(e, t.dmg, dx, dy);
          e.hitCd = 0.22;
          e.slow = Math.max(e.slow, 0.45);
        }
      }
    }
  }

  private tickOrbs(lv: number) {
    const def = WEAPON.orbs;
    const rad = this.wRange(def.radius[lv]);
    const dmg = def.dmg[lv] * this.player.damageMul;
    const p = this.player;
    for (const e of this.enemies) {
      if (!e.alive || e.hitCd > 0) continue;
      const dx = e.x - p.x;
      const dy = e.y - p.y;
      const d = Math.hypot(dx, dy);
      if (Math.abs(d - rad) < e.r + 14) {
        this.hurtEnemy(e, dmg, dx, dy);
        e.hitCd = 0.12;
      }
    }
  }

  private syncDrones(count: number) {
    let n = 0;
    for (const d of this.drones) if (d.alive) n += 1;
    while (n < count) {
      const slot = this.drones.find((d) => !d.alive);
      if (!slot) break;
      const a = Math.random() * Math.PI * 2;
      slot.alive = true;
      slot.x = this.player.x + Math.cos(a) * 40;
      slot.y = this.player.y + Math.sin(a) * 40;
      slot.vx = Math.cos(a) * 320;
      slot.vy = Math.sin(a) * 320;
      slot.shotCd = 0;
      slot.phase = a;
      n += 1;
    }
    while (n > count) {
      const live = this.drones.find((d) => d.alive);
      if (!live) break;
      live.alive = false;
      n -= 1;
    }
  }

  private dropSentry(lv: number) {
    const def = WEAPON.sentry;
    const live = this.sentries.filter((s) => s.alive).length;
    if (live >= this.wCount(def.count[lv], MAX_SENTRIES)) return;
    const slot = this.sentries.find((s) => !s.alive);
    if (!slot) return;
    const a = Math.random() * Math.PI * 2;
    const dist = 40 + Math.random() * 70;
    slot.alive = true;
    slot.x = this.player.x + Math.cos(a) * dist;
    slot.y = this.player.y + Math.sin(a) * dist;
    slot.life = def.life[lv];
    slot.shotCd = 0.2;
    slot.dmg = def.dmg[lv] * this.player.damageMul;
    slot.range = this.wRange(def.range);
    this.burst(slot.x, slot.y, 6, "#c5d0d6");
  }

  private fireTesla(lv: number) {
    const def = WEAPON.tesla;
    let cur = this.nearest(this.wRange(def.range[lv]));
    if (!cur) return;
    const seen = new Set<Enemy>();
    let fromX = this.player.x;
    let fromY = this.player.y;
    const dmg = def.dmg[lv] * this.player.damageMul;
    for (let c = 0; c < this.wCount(def.chains[lv], 14); c++) {
      if (!cur || seen.has(cur)) break;
      seen.add(cur);
      this.addBeam(fromX, fromY, cur.x, cur.y, 0.12, 2.4, "#7fd0dc");
      this.hurtEnemy(cur, dmg * (1 - c * 0.07), cur.x - fromX, cur.y - fromY);
      fromX = cur.x;
      fromY = cur.y;
      let next: Enemy | null = null;
      let bd = this.wRange(180) ** 2;
      for (const e of this.enemies) {
        if (!e.alive || seen.has(e)) continue;
        const dx = e.x - fromX;
        const dy = e.y - fromY;
        const d = dx * dx + dy * dy;
        if (d < bd) {
          bd = d;
          next = e;
        }
      }
      cur = next;
    }
    this.audio.hit();
  }

  private tickRad(lv: number) {
    const def = WEAPON.rad;
    const rad = this.wRange(def.radius[lv]);
    const dmg = def.dmg[lv] * this.player.damageMul;
    const p = this.player;
    for (const e of this.enemies) {
      if (!e.alive) continue;
      const dx = e.x - p.x;
      const dy = e.y - p.y;
      if (dx * dx + dy * dy < (rad + e.r) * (rad + e.r)) {
        e.slow = Math.max(e.slow, def.slow[lv]);
        if (e.hitCd <= 0) {
          this.hurtEnemy(e, dmg, dx, dy);
          e.hitCd = 0.28;
        }
      }
    }
  }

  private fireOrbit(lv: number) {
    const def = WEAPON.orbit;
    const n = this.wCount(def.count[lv], MAX_STRIKES);
    const r = this.wRange(def.radius[lv]);
    const minSep = r * 2 + 18;
    const spots = this.orbitSpots(n, minSep);
    for (let i = 0; i < spots.length; i++) {
      const slot = this.strikes.find((s) => !s.alive);
      if (!slot) break;
      slot.alive = true;
      slot.x = spots[i].x;
      slot.y = spots[i].y;
      slot.wait = 0.38 + i * 0.1;
      slot.r = r;
      slot.dmg = def.dmg[lv] * this.player.damageMul;
      slot.flash = 0;
      slot.team = 0;
    }
  }

  private orbitSpots(n: number, minSep: number) {
    const p = this.player;
    const taken: { x: number; y: number }[] = [];
    for (const s of this.strikes) {
      if (s.alive && s.team === 0) taken.push({ x: s.x, y: s.y });
    }
    const far = (x: number, y: number) => taken.every((t) => (t.x - x) ** 2 + (t.y - y) ** 2 >= minSep * minSep);
    const add = (x: number, y: number) => {
      const pt = { x: clamp(x, 80, WORLD - 80), y: clamp(y, 80, WORLD - 80) };
      if (!far(pt.x, pt.y)) return false;
      taken.push(pt);
      return true;
    };
    const out: { x: number; y: number }[] = [];
    const foes = this.enemies
      .filter((e) => e.alive)
      .map((e) => ({ e, d: (e.x - p.x) ** 2 + (e.y - p.y) ** 2 }))
      .filter((x) => x.d < 420 * 420)
      .sort((a, b) => a.d - b.d);
    const rot = Math.floor(this.time * 5);
    for (let i = 0; i < foes.length && out.length < n; i++) {
      const e = foes[(i + rot) % foes.length].e;
      const a = this.time * 2.1 + i * 2.4;
      const x = e.x + Math.cos(a) * 28;
      const y = e.y + Math.sin(a) * 28;
      if (add(x, y)) out.push(taken[taken.length - 1]);
    }
    for (let k = 0; out.length < n && k < 36; k++) {
      const a = (out.length / Math.max(1, n)) * Math.PI * 2 + this.time * 1.3 + k * 0.7;
      const dist = 90 + (k % 6) * (minSep * 0.55);
      if (add(p.x + Math.cos(a) * dist, p.y + Math.sin(a) * dist)) out.push(taken[taken.length - 1]);
    }
    return out;
  }

  private throwCryo(lv: number) {
    const def = WEAPON.cryo;
    const n = this.wCount(def.count[lv]);
    const spd = def.speed * this.player.projSpeed;
    const reach = this.wRange(340);
    for (let i = 0; i < n; i++) {
      const t = this.nearest(reach);
      const aim = t
        ? Math.atan2(t.y - this.player.y, t.x - this.player.x) + (i - (n - 1) / 2) * 0.22
        : this.player.aim + (i - (n - 1) / 2) * 0.22;
      this.fireBullet({
        team: 0,
        x: this.player.x,
        y: this.player.y,
        vx: Math.cos(aim) * spd,
        vy: Math.sin(aim) * spd,
        r: 7,
        dmg: def.dmg[lv] * this.player.damageMul,
        life: 1.1 * this.player.rangeMul,
        pierce: 0,
        homing: false,
        kind: "cryo",
        slow: def.slow[lv],
        aoe: this.wRange(def.radius[lv]),
      });
    }
    this.audio.shoot();
  }

  private fireBullet(b: Omit<Bullet, "alive" | "owner"> & { owner?: number }) {
    let slot = this.bullets.find((x) => !x.alive);
    if (!slot) {
      let worst: Bullet | null = null;
      for (const x of this.bullets) {
        if (!x.alive || x.team !== 1) continue;
        if (!worst || x.life < worst.life) worst = x;
      }
      slot = worst ?? undefined;
    }
    if (!slot) return;
    const was = slot.alive;
    Object.assign(slot, { owner: -1 }, b, { alive: true });
    if (!was) this.bCount += 1;
  }

  private ownedShots(owner: number) {
    let n = 0;
    for (const b of this.bullets) if (b.alive && b.owner === owner) n += 1;
    return n;
  }

  private updateDrones(dt: number) {
    const wpn = this.weapons.find((w) => w.id === "drone");
    if (!wpn) return;
    const lv = wpn.level - 1;
    const def = WEAPON.drone;
    const p = this.player;
    const dmg = def.dmg[lv] * p.damageMul;
    const spd = def.speed[lv] * p.projSpeed;
    const hitR = def.r[lv];
    const leash = 360;
    let i = 0;
    for (const d of this.drones) {
      if (!d.alive) continue;
      d.phase += dt * 16;
      const t = this.nearest(640, undefined, d.x, d.y);
      const pdx = p.x - d.x;
      const pdy = p.y - d.y;
      const pd = Math.hypot(pdx, pdy) || 1;
      let ax: number;
      let ay: number;
      if (pd > leash) {
        ax = pdx / pd;
        ay = pdy / pd;
      } else if (t) {
        const dx = t.x - d.x;
        const dy = t.y - d.y;
        const dist = Math.hypot(dx, dy) || 1;
        ax = dx / dist;
        ay = dy / dist;
      } else {
        ax = Math.cos(d.phase * 0.15 + i * 1.7);
        ay = Math.sin(d.phase * 0.15 + i * 1.7);
      }
      const k = 1 - Math.exp(-3.4 * dt);
      d.vx += (ax * spd - d.vx) * k;
      d.vy += (ay * spd - d.vy) * k;
      const v = Math.hypot(d.vx, d.vy) || 1;
      if (v < spd * 0.72) {
        d.vx = (d.vx / v) * spd * 0.72;
        d.vy = (d.vy / v) * spd * 0.72;
      }
      d.x += d.vx * dt;
      d.y += d.vy * dt;
      if (d.x < 80 || d.x > WORLD - 80) {
        d.vx *= -1;
        d.x = clamp(d.x, 80, WORLD - 80);
      }
      if (d.y < 80 || d.y > WORLD - 80) {
        d.vy *= -1;
        d.y = clamp(d.y, 80, WORLD - 80);
      }
      for (const e of this.enemies) {
        if (!e.alive || e.hitCd > 0) continue;
        const dx = e.x - d.x;
        const dy = e.y - d.y;
        if (dx * dx + dy * dy < (hitR + e.r) * (hitR + e.r)) {
          this.hurtEnemy(e, dmg, dx, dy);
          e.hitCd = 0.1;
        }
      }
      i += 1;
    }
  }

  private updateSentries(dt: number) {
    const cdMul = this.player.cooldownMul;
    for (const s of this.sentries) {
      if (!s.alive) continue;
      s.life -= dt;
      if (s.life <= 0) {
        s.alive = false;
        this.burst(s.x, s.y, 8, "#8b90a0");
        continue;
      }
      s.shotCd -= dt;
      if (s.shotCd > 0) continue;
      const t = this.nearest(s.range, undefined, s.x, s.y);
      if (!t) continue;
      s.shotCd = 0.42 * cdMul;
      const dx = t.x - s.x;
      const dy = t.y - s.y;
      const d = Math.hypot(dx, dy) || 1;
      const spd = 480 * this.player.projSpeed;
      this.fireBullet({
        team: 0,
        x: s.x,
        y: s.y,
        vx: (dx / d) * spd,
        vy: (dy / d) * spd,
        r: 4,
        dmg: s.dmg,
        life: s.range / spd,
        pierce: 0,
        homing: false,
        kind: "sentry",
        slow: 0,
        aoe: 0,
      });
    }
  }

  private updateStrikes(dt: number) {
    for (const s of this.strikes) {
      if (!s.alive) continue;
      if (s.wait > 0) {
        s.wait -= dt;
        continue;
      }
      this.addBeam(s.x, s.y - 420, s.x, s.y + 20, 0.16, 10, "#ffe08a");
      this.burst(s.x, s.y, 14, "#ffe08a");
      this.addTrauma(0.18);
      this.audio.boom();
      if (s.team === 1) {
        const p = this.player;
        const dx = p.x - s.x;
        const dy = p.y - s.y;
        if (this.mode === "playing" && p.iFrames <= 0 && dx * dx + dy * dy < (s.r + p.r) * (s.r + p.r)) {
          this.playerHit(s.dmg, false);
        }
      } else {
        for (const e of this.enemies) {
          if (!e.alive) continue;
          const dx = e.x - s.x;
          const dy = e.y - s.y;
          if (dx * dx + dy * dy < (s.r + e.r) * (s.r + e.r)) this.hurtEnemy(e, s.dmg, dx, dy);
        }
      }
      s.alive = false;
    }
  }

  private explodeCryo(b: Bullet) {
    this.burst(b.x, b.y, 12, "#7fd0dc");
    this.addTrauma(0.18);
    this.audio.boom();
    const rad = b.aoe || 50;
    for (const e of this.enemies) {
      if (!e.alive) continue;
      const dx = e.x - b.x;
      const dy = e.y - b.y;
      if (dx * dx + dy * dy < (rad + e.r) * (rad + e.r)) {
        this.hurtEnemy(e, b.dmg, dx, dy);
        e.slow = Math.max(e.slow, b.slow);
      }
    }
  }

  private updateBullets(dt: number) {
    for (const b of this.bullets) {
      if (!b.alive) continue;
      if (b.homing) {
        if (b.team === 1) {
          const p = this.player;
          const dx = p.x - b.x;
          const dy = p.y - b.y;
          const d = Math.hypot(dx, dy) || 1;
          const spd = Math.hypot(b.vx, b.vy);
          const k = 1 - Math.exp(-6 * dt);
          b.vx += ((dx / d) * spd - b.vx) * k;
          b.vy += ((dy / d) * spd - b.vy) * k;
        } else {
          const t = this.nearest(520);
          if (t) {
            const dx = t.x - b.x;
            const dy = t.y - b.y;
            const d = Math.hypot(dx, dy) || 1;
            const spd = Math.hypot(b.vx, b.vy);
            const tx = (dx / d) * spd;
            const ty = (dy / d) * spd;
            const k = 1 - Math.exp(-8 * dt);
            b.vx += (tx - b.vx) * k;
            b.vy += (ty - b.vy) * k;
          }
        }
      }
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.life -= dt;
      if (b.life <= 0 || b.x < -40 || b.y < -40 || b.x > WORLD + 40 || b.y > WORLD + 40) {
        if (b.kind === "cryo") this.explodeCryo(b);
        b.alive = false;
        this.bCount -= 1;
      }
    }
  }

  private updateMines(dt: number) {
    for (const m of this.mines) {
      if (!m.alive) continue;
      m.life -= dt;
      m.arm -= dt;
      if (m.life <= 0) {
        this.detonate(m);
        continue;
      }
      if (m.arm > 0) continue;
      for (const e of this.enemies) {
        if (!e.alive) continue;
        const dx = e.x - m.x;
        const dy = e.y - m.y;
        if (dx * dx + dy * dy < (m.r + e.r) * (m.r + e.r)) {
          this.detonate(m);
          break;
        }
      }
    }
  }

  private detonate(m: Mine) {
    m.alive = false;
    this.audio.boom();
    this.addTrauma(0.25);
    this.burst(m.x, m.y, 10, "#7d9aa0");
    for (const e of this.enemies) {
      if (!e.alive) continue;
      const dx = e.x - m.x;
      const dy = e.y - m.y;
      if (dx * dx + dy * dy < (m.r + e.r) * (m.r + e.r)) {
        this.hurtEnemy(e, m.dmg, dx, dy);
        e.slow = Math.max(e.slow, 1.6);
      }
    }
  }

  private updateGems(dt: number) {
    const p = this.player;
    const mag = p.pickup;
    for (const g of this.gems) {
      if (!g.alive) continue;
      const dx = p.x - g.x;
      const dy = p.y - g.y;
      const d2 = dx * dx + dy * dy;
      if (d2 < mag * mag) g.magnet = true;
      if (g.magnet) {
        const d = Math.sqrt(d2) || 1;
        const spd = this.vacuumPull > 0 ? 780 : 420;
        g.x += (dx / d) * spd * dt;
        g.y += (dy / d) * spd * dt;
      } else if (d2 < 230 * 230) {
        const d = Math.sqrt(d2) || 1;
        g.x += (dx / d) * 70 * dt;
        g.y += (dy / d) * 70 * dt;
      }
      if (d2 < (p.r + 10) * (p.r + 10)) {
        g.alive = false;
        this.gCount -= 1;
        this.grantXp(g.value);
        this.audio.pickup();
      }
    }
  }

  private updateVfx(dt: number) {
    for (const q of this.particles) {
      if (!q.alive) continue;
      q.x += q.vx * dt;
      q.y += q.vy * dt;
      q.vx *= 0.92;
      q.vy *= 0.92;
      q.life -= dt;
      if (q.life <= 0) q.alive = false;
    }
    for (const f of this.floats) {
      if (!f.alive) continue;
      f.y += f.vy * dt;
      f.life -= dt;
      if (f.life <= 0) f.alive = false;
    }
    for (const b of this.beams) {
      if (!b.alive) continue;
      b.life -= dt;
      if (b.life <= 0) b.alive = false;
    }
  }

  private collide() {
    for (const b of this.bullets) {
      if (!b.alive) continue;
      if (b.team === 1) {
        const p = this.player;
        if (this.mode !== "playing" || p.iFrames > 0) continue;
        const dx = b.x - p.x;
        const dy = b.y - p.y;
        if (dx * dx + dy * dy < (b.r + p.r) * (b.r + p.r)) {
          this.playerHit(b.dmg, false);
          b.alive = false;
          this.bCount -= 1;
        }
        continue;
      }
      const nearby = this.neighborsAt(b.x, b.y);
      for (const idx of nearby) {
        const e = this.enemies[idx];
        if (!e?.alive) continue;
        const dx = b.x - e.x;
        const dy = b.y - e.y;
        if (dx * dx + dy * dy < (b.r + e.r) * (b.r + e.r)) {
          if (b.kind === "cryo") {
            this.explodeCryo(b);
            b.alive = false;
            this.bCount -= 1;
            break;
          }
          this.hurtEnemy(e, b.dmg, -dx, -dy);
          if (b.slow) e.slow = Math.max(e.slow, b.slow);
          if (b.pierce > 0) b.pierce -= 1;
          else {
            b.alive = false;
            this.bCount -= 1;
            break;
          }
        }
      }
    }
  }

  private hurtEnemy(e: Enemy, dmg: number, kx: number, ky: number) {
    e.hp -= dmg;
    e.flash = 0.08;
    const len = Math.hypot(kx, ky) || 1;
    e.x += (kx / len) * 8;
    e.y += (ky / len) * 8;
    if (dmg >= 20) this.float(e.x, e.y - e.r, `${Math.round(dmg)}`, "#e8eaef");
    if (e.hp <= 0) this.kill(e);
    else this.audio.hit();
  }

  private kill(e: Enemy) {
    e.alive = false;
    this.eCount = Math.max(0, this.eCount - 1);
    this.kills += 1;
    if (this.mode === "playing") {
      const pts = killPoints(this.intensity);
      this.score += pts;
      this.float(e.x, e.y - e.r - 8, `+${pts}`, "#5ec8d8");
    }
    const palette: Record<string, string> = {
      crawler: "#ff7a45",
      brute: "#e08a4c",
      spitter: "#7dffb3",
      elite: "#5ec8d8",
      hearth: "#ff5a4a",
      hydra: "#5ec8d8",
      colossus: "#e08a4c",
      specter: "#c9a0ff",
      crown: "#ffe08a",
    };
    this.dropGem(e.x, e.y, e.xp);
    this.burst(e.x, e.y, isBoss(e.kind) ? 18 : 6, palette[e.kind] ?? "#7fd0dc");
    if (isBoss(e.kind)) {
      this.hitstop = 0.1;
      this.addTrauma(0.85);
      this.audio.boom();
      this.bossesKilled += 1;
      this.dropVacuum(e.x, e.y);
      if (!this.enemies.some((x) => x.alive && isBoss(x.kind))) this.audio.setScene({ boss: false });
    }
  }

  private dropVacuum(x: number, y: number) {
    if (this.vacuum.alive) this.triggerVacuum();
    this.vacuum.alive = true;
    this.vacuum.x = x;
    this.vacuum.y = y;
    this.vacuum.life = 10;
    this.burst(x, y, 12, "#ffe08a");
  }

  private triggerVacuum() {
    this.vacuum.alive = false;
    this.vacuumPull = 5;
    for (const g of this.gems) {
      if (g.alive) g.magnet = true;
    }
    this.audio.vacuum();
    this.burst(this.player.x, this.player.y, 16, "#5ec8d8");
    this.float(this.player.x, this.player.y - 24, "VACUUM", "#ffe08a");
  }

  private playerHit(raw: number, contact: boolean) {
    if (this.mode !== "playing") return;
    const p = this.player;
    if (p.iFrames > 0) return;
    const dmg = Math.max(1, raw * (1 - clamp(p.armor, 0, 0.55)));
    p.hp -= dmg;
    p.iFrames = PLAYER.iFrames;
    if (contact) p.contactCd = PLAYER.contactCd;
    this.hurtT = 0.42;
    this.addTrauma(0.42);
    this.audio.hurt();
    this.float(p.x, p.y - 18, `${Math.round(dmg)}`, "#c45c58");
    if (p.hp <= 0) this.die();
  }

  private dropGem(x: number, y: number, value: number) {
    const slot = this.gems.find((g) => !g.alive);
    if (!slot) {
      this.grantXp(value);
      return;
    }
    slot.alive = true;
    slot.x = x;
    slot.y = y;
    slot.value = value;
    slot.magnet = false;
    this.gCount += 1;
  }

  private grantXp(v: number) {
    if (this.mode !== "playing") return;
    this.xp += v * this.player.xpMul;
    while (this.xp >= this.xpNext && this.mode === "playing") {
      this.xp -= this.xpNext;
      this.level += 1;
      this.xpNext = xpToNext(this.level);
      this.choices = rollChoices(this.weapons, this.passives, this.level);
      if (this.choices.length === 0) {
        this.player.hp = Math.min(this.player.maxHp, this.player.hp + 10);
        continue;
      }
      this.mode = "levelup";
      this.audio.levelup();
      this.addTrauma(0.2);
      this.player.hp = Math.min(this.player.maxHp, this.player.hp + 10);
      this.emit(true);
    }
  }

  private applyChoice(c: Choice) {
    if (c.kind === "weapon") {
      const guns = this.weapons.filter((w) => w.id !== STARTER_ID);
      if (guns.length >= MAX_WEAPON_SLOTS) return;
      this.weapons.push({ id: c.id, level: 1, cd: 0.2 });
      return;
    }
    if (c.kind === "upgrade") {
      const w = this.weapons.find((x) => x.id === c.id);
      if (w) w.level = Math.min(MAX_GEAR_LEVEL, w.level + 1);
      return;
    }
    if (c.kind === "passive") {
      if (this.passives.length >= MAX_PASSIVE_SLOTS) return;
      this.passives.push({ id: c.id, level: 1 });
      this.applyPassive(c.id);
      return;
    }
    const p = this.passives.find((x) => x.id === c.id);
    if (p) {
      p.level = Math.min(MAX_GEAR_LEVEL, p.level + 1);
      this.applyPassive(c.id);
    }
  }

  private applyPassive(id: PassiveId) {
    const p = this.player;
    const spec = PASSIVES[id];
    if ("hpPct" in spec && spec.hpPct) {
      const add = p.maxHp * spec.hpPct;
      p.maxHp += add;
      p.hp = Math.min(p.maxHp, p.hp + add);
    }
    if ("speed" in spec && spec.speed) p.speed *= 1 + spec.speed;
    if ("pickup" in spec && spec.pickup) p.pickup *= 1 + spec.pickup;
    if ("cooldown" in spec && spec.cooldown) p.cooldownMul *= 1 - spec.cooldown;
    if ("damage" in spec && spec.damage) p.damageMul *= 1 + spec.damage;
    if ("regenPct" in spec && spec.regenPct) p.regen += p.maxHp * spec.regenPct * 0.1;
    if ("armor" in spec && spec.armor) p.armor = clamp(p.armor + spec.armor, 0, 0.55);
    if ("xp" in spec && spec.xp) p.xpMul *= 1 + spec.xp;
    if ("proj" in spec && spec.proj) p.projSpeed *= 1 + spec.proj;
    if ("spawn" in spec && spec.spawn) p.spawnMul *= 1 + spec.spawn;
    if ("range" in spec && spec.range) p.rangeMul *= 1 + spec.range;
    if ("extra" in spec) {
      const salvo = this.passives.find((x) => x.id === "salvo");
      p.extraProj = !salvo ? 0 : salvo.level >= 5 ? 2 : 1;
    }
  }

  private die() {
    this.player.hp = 0;
    this.mode = "over";
    this.won = false;
    this.deathT = 0.35;
    this.hurtT = 0.5;
    this.audio.dead();
    this.addTrauma(1);
    this.record();
    this.emit(true);
  }

  private winRun() {
    this.mode = "over";
    this.won = true;
    this.audio.win();
    this.banner = "EXTRACTION COMPLETE";
    this.bannerT = 3;
    this.record();
    this.emit(true);
  }

  submitRun(raw: string) {
    if (this.named || !this.pending) return;
    const name = sanitizePilot(raw);
    this.pilot = name;
    persistPilot(name);
    const run = { ...this.pending, name };
    const next = pushRun({ best: this.best, runs: this.board }, run);
    this.best = next.best;
    this.board = next.runs;
    this.pending = null;
    this.named = true;
    this.emit(true);
  }

  private flushRun() {
    if (!this.named && this.pending) this.submitRun(this.pilot);
  }

  private liveScore() {
    return this.score;
  }

  private record() {
    const run = {
      name: this.pilot,
      score: this.score,
      time: this.time,
      kills: this.kills,
      level: this.level,
      bosses: this.bossesKilled,
      won: this.won,
      at: Date.now(),
    };
    const next = pushRun({ best: this.best, runs: this.board }, run);
    this.best = next.best;
    this.board = next.runs;
    this.pending = null;
    this.named = true;
    this.audio.setScene({ combat: false, boss: false, paused: false });
  }

  private followCam(dt: number) {
    const k = 1 - Math.exp(-7.5 * dt);
    this.camX += (this.player.x - this.camX) * k;
    this.camY += (this.player.y - this.camY) * k;
  }

  addTrauma(v: number) {
    if (this.reduced) return;
    this.trauma = clamp(this.trauma + v, 0, 1);
  }

  private burst(x: number, y: number, n: number, color: string) {
    for (let i = 0; i < n; i++) {
      const slot = this.particles.find((p) => !p.alive);
      if (!slot) return;
      const a = Math.random() * Math.PI * 2;
      const s = 40 + Math.random() * 140;
      slot.alive = true;
      slot.x = x;
      slot.y = y;
      slot.vx = Math.cos(a) * s;
      slot.vy = Math.sin(a) * s;
      slot.max = 0.35 + Math.random() * 0.3;
      slot.life = slot.max;
      slot.size = 1.5 + Math.random() * 2.5;
      slot.color = color;
    }
  }

  private float(x: number, y: number, text: string, color: string) {
    const slot = this.floats.find((f) => !f.alive);
    if (!slot) return;
    slot.alive = true;
    slot.x = x;
    slot.y = y;
    slot.vy = -28;
    slot.life = 0.55;
    slot.text = text;
    slot.color = color;
  }

  private addBeam(x1: number, y1: number, x2: number, y2: number, life: number, width: number, color: string) {
    const slot = this.beams.find((b) => !b.alive);
    if (!slot) return;
    Object.assign(slot, { alive: true, x1, y1, x2, y2, life, width, color });
  }

  private cell(x: number, y: number) {
    return ((x / 96) | 0) * 73856093 ^ ((y / 96) | 0) * 19349663;
  }

  private rebuildHash() {
    this.hash.clear();
    for (let i = 0; i < this.enemies.length; i++) {
      const e = this.enemies[i];
      if (!e.alive) continue;
      const k = this.cell(e.x, e.y);
      let b = this.hash.get(k);
      if (!b) {
        b = [];
        this.hash.set(k, b);
      }
      b.push(i);
    }
  }

  private neighborsAt(x: number, y: number) {
    const gx = (x / 96) | 0;
    const gy = (y / 96) | 0;
    this.nbEpoch += 1;
    if (this.nbEpoch > 65000) {
      this.nbEpoch = 1;
      this.nbSeen.fill(0);
    }
    const epoch = this.nbEpoch;
    const out = this.nbOut;
    out.length = 0;
    for (let oy = -1; oy <= 1; oy++) {
      for (let ox = -1; ox <= 1; ox++) {
        const k = (gx + ox) * 73856093 ^ (gy + oy) * 19349663;
        const list = this.hash.get(k);
        if (!list) continue;
        for (const i of list) {
          if (this.nbSeen[i] === epoch) continue;
          this.nbSeen[i] = epoch;
          out.push(i);
        }
      }
    }
    return out;
  }

  private resize() {
    const parent = this.canvas.parentElement ?? document.body;
    const w = parent.clientWidth || window.innerWidth;
    const h = parent.clientHeight || window.innerHeight;
    this.mobile = w < 720;
    const zoom = this.mobile ? Math.min(1, w / 680) : 1;
    this.viewW = w / zoom;
    this.viewH = h / zoom;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const tw = Math.floor(w * dpr);
    const th = Math.floor(h * dpr);
    if (this.canvas.width !== tw || this.canvas.height !== th) {
      this.canvas.width = tw;
      this.canvas.height = th;
      this.canvas.style.width = `${w}px`;
      this.canvas.style.height = `${h}px`;
    }
    this.ctx.setTransform(dpr * zoom, 0, 0, dpr * zoom, 0, 0);
  }

  private liveBosses() {
    const list: Hud["bosses"] = [];
    for (const e of this.enemies) {
      if (!e.alive || !isBoss(e.kind)) continue;
      const def = ENEMY[e.kind];
      list.push({ hp: e.hp, max: e.maxHp, name: def.name, color: def.color });
    }
    return list;
  }

  private buildHud(): Hud {
    return {
      mode: this.mode,
      time: this.time,
      intensity: this.intensity,
      hp: Math.max(0, this.player.hp),
      maxHp: this.player.maxHp,
      level: this.level,
      xp: this.xp,
      xpNext: this.xpNext,
      kills: this.kills,
      score: this.liveScore(),
      banner: this.bannerT > 0 ? this.banner : null,
      choices: this.choices,
      loadout: this.buildLoadout(),
      won: this.won,
      best: this.best,
      board: this.board,
      muted: this.audio.muted,
      sfxVol: this.audio.sfxVol,
      musicVol: this.audio.musicVol,
      bosses: this.liveBosses(),
      named: this.named,
      pilot: this.pilot,
    };
  }

  private buildLoadout() {
    const starter = this.weapons.find((w) => w.id === STARTER_ID);
    const guns = this.weapons.filter((w) => w.id !== STARTER_ID);
    const slots: Hud["loadout"] = [];
    if (starter) {
      const def = WEAPON[starter.id];
      slots.push({ id: starter.id, name: def.name, tag: def.tag, level: starter.level, kind: "starter" });
    }
    for (let i = 0; i < MAX_WEAPON_SLOTS; i++) {
      const w = guns[i];
      if (w) {
        const def = WEAPON[w.id];
        slots.push({ id: w.id, name: def.name, tag: def.tag, level: w.level, kind: "weapon" });
      } else {
        slots.push({ id: `w-empty-${i}`, name: "", tag: "Arm", level: 0, kind: "weapon" });
      }
    }
    for (let i = 0; i < MAX_PASSIVE_SLOTS; i++) {
      const p = this.passives[i];
      if (p) {
        const def = PASSIVES[p.id];
        slots.push({ id: p.id, name: def.name, tag: def.tag, level: p.level, kind: "passive" });
      } else {
        slots.push({ id: `p-empty-${i}`, name: "", tag: "Mod", level: 0, kind: "passive" });
      }
    }
    return slots;
  }

  private emit(force = false) {
    const now = performance.now();
    if (!force && this.mode === this.lastMode && now - this.lastEmit < 90) return;
    this.lastEmit = now;
    this.lastMode = this.mode;
    this.hudCache = this.buildHud();
    for (const fn of this.listeners) fn(this.hudCache);
  }

  private bindControlsTest() {
    window.__controlsTest = {
      getYaw: () => this.heading,
      getSpeed: () => Math.hypot(this.player.vx, this.player.vy),
      setKeys: (codes: string[]) => this.input.setKeys(codes),
      setTime: (t: number) => {
        this.time = t;
      },
      grantXp: (n: number) => {
        this.grantXp(n);
      },
      getMode: () => this.mode,
      getXp: () => ({ xp: this.xp, next: this.xpNext, level: this.level, mode: this.mode }),
    };
  }
}

declare global {
  interface Window {
    __controlsTest?: {
      getYaw: () => number;
      getSpeed: () => number;
      setKeys: (codes: string[]) => void;
      setTime?: (t: number) => void;
      grantXp?: (n: number) => void;
      getMode?: () => string;
      getXp?: () => { xp: number; next: number; level: number; mode: string };
    };
  }
}
