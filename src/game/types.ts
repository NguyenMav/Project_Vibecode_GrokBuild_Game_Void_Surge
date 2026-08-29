import type { EnemyKind, PassiveId, WeaponId } from "./config";

export type Mode = "title" | "playing" | "levelup" | "paused" | "over";

export type WeaponInst = { id: WeaponId; level: number; cd: number };
export type PassiveInst = { id: PassiveId; level: number };

export type Enemy = {
  alive: boolean;
  kind: EnemyKind;
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  hp: number;
  maxHp: number;
  speed: number;
  dmg: number;
  xp: number;
  flash: number;
  hitCd: number;
  shotCd: number;
  slow: number;
  facing: number;
  phase: number;
  aim: number;
  burst: number;
};

export type Bullet = {
  alive: boolean;
  team: 0 | 1;
  owner: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  dmg: number;
  life: number;
  pierce: number;
  homing: boolean;
  kind: "shotgun" | "flame" | "drone" | "sentry" | "spit" | "cryo" | "siege" | "phase";
  slow: number;
  aoe: number;
};

export type Gem = {
  alive: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  value: number;
  magnet: boolean;
};

export type Mine = {
  alive: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  dmg: number;
  life: number;
  arm: number;
  slow: number;
};

export type Drone = {
  alive: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  shotCd: number;
  phase: number;
};

export type Sentry = {
  alive: boolean;
  x: number;
  y: number;
  life: number;
  shotCd: number;
  dmg: number;
  range: number;
};

export type Strike = {
  alive: boolean;
  x: number;
  y: number;
  wait: number;
  r: number;
  dmg: number;
  flash: number;
  team: 0 | 1;
};

export type FlameTrail = {
  alive: boolean;
  x: number;
  y: number;
  r: number;
  dmg: number;
  life: number;
  max: number;
};

export type Particle = {
  alive: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  size: number;
  color: string;
};

export type FloatText = {
  alive: boolean;
  x: number;
  y: number;
  vy: number;
  life: number;
  text: string;
  color: string;
};

export type Beam = {
  alive: boolean;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  life: number;
  width: number;
  color: string;
};

export type Choice =
  | { kind: "weapon"; id: WeaponId; title: string; blurb: string; next: number }
  | { kind: "upgrade"; id: WeaponId; title: string; blurb: string; next: number }
  | { kind: "passive"; id: PassiveId; title: string; blurb: string; next: number }
  | { kind: "passup"; id: PassiveId; title: string; blurb: string; next: number };

export type LoadoutSlot = { id: string; name: string; tag: string; level: number; kind: "starter" | "weapon" | "passive" };

export type Best = { time: number; kills: number; wins: number; level: number; score: number };

export type RunEntry = {
  name: string;
  score: number;
  time: number;
  kills: number;
  level: number;
  bosses: number;
  won: boolean;
  at: number;
};

export type Hud = {
  mode: Mode;
  time: number;
  intensity: number;
  hp: number;
  maxHp: number;
  level: number;
  xp: number;
  xpNext: number;
  kills: number;
  score: number;
  banner: string | null;
  choices: Choice[];
  loadout: LoadoutSlot[];
  won: boolean;
  best: Best;
  board: RunEntry[];
  muted: boolean;
  sfxVol: number;
  musicVol: number;
  bosses: { hp: number; max: number; name: string; color: string }[];
  named: boolean;
  pilot: string;
};
