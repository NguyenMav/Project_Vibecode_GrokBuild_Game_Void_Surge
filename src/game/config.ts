export const RUN_SECONDS = 600;
export const PHASE_SECONDS = 60;
export const MAX_INTENSITY = 10;
export const WORLD = 4200;
export const KILL_SCORE = [8, 12, 18, 26, 36, 48, 64, 84, 108, 140] as const;
export const FIXED_DT = 1 / 60;
export const MAX_DT = 0.1;

export const MAX_ENEMIES = 180;
export const MAX_BULLETS = 160;
export const MAX_GEMS = 140;
export const MAX_PARTICLES = 180;
export const MAX_FLOATS = 36;
export const MAX_MINES = 24;
export const MAX_BEAMS = 48;
export const MAX_DRONES = 6;
export const MAX_SENTRIES = 4;
export const MAX_STRIKES = 16;
export const MAX_TRAILS = 56;
export const MAX_FODDER_SHOTS = 3;

export const MAX_WEAPON_SLOTS = 3;
export const MAX_PASSIVE_SLOTS = 3;
export const MAX_GEAR_LEVEL = 5;

export const SAVE_KEY = "void-surge-v1";

export const PLAYER = {
  r: 16,
  speed: 198,
  hp: 100,
  iFrames: 0.55,
  pickup: 74,
  contactCd: 0.55,
};

export const ENEMY = {
  crawler: { r: 13, hp: 16, speed: 76, dmg: 5, xp: 1, draw: 22, blurb: "Pack runner. Later minutes they dash." },
  brute: { r: 22, hp: 64, speed: 46, dmg: 16, xp: 4, draw: 38, blurb: "Slow tank. Charges once intensity climbs." },
  spitter: { r: 16, hp: 32, speed: 54, dmg: 8, xp: 3, draw: 28, shotCd: 2.4, shotDmg: 10, shotSpd: 210, blurb: "Keeps range and lobs spit. Cap of 3 shots." },
  elite: { r: 17, hp: 96, speed: 94, dmg: 13, xp: 8, draw: 30, blurb: "Fast striker. Dashes through the line." },
  hearth: { r: 44, hp: 2240, speed: 34, dmg: 18, xp: 70, draw: 96, name: "HEARTH TITAN", color: "#ff5a4a", blurb: "2:00. Fire nova plus a close slam." },
  hydra: { r: 40, hp: 2880, speed: 56, dmg: 16, xp: 80, draw: 90, name: "ION HYDRA", color: "#5ec8d8", blurb: "4:00. Triple ion spread and a body dash." },
  colossus: { r: 52, hp: 3680, speed: 26, dmg: 22, xp: 95, draw: 108, name: "SIEGE COLOSSUS", color: "#e08a4c", blurb: "6:00. Shell walls, mortars, and summons." },
  specter: { r: 36, hp: 4480, speed: 70, dmg: 15, xp: 110, draw: 86, name: "PHASE SPECTER", color: "#c9a0ff", blurb: "8:00. Blink combos: cages, phantoms, lattice, spiral." },
  crown: { r: 50, hp: 5760, speed: 38, dmg: 26, xp: 150, draw: 116, name: "CROWN OF NULL", color: "#ffe08a", blurb: "Unused apex. Spinning beam and a shot ring." },
} as const;

export type EnemyKind = keyof typeof ENEMY;
export type BossKind = "hearth" | "hydra" | "colossus" | "specter" | "crown";
export const BOSS_ORDER: BossKind[] = ["hearth", "hydra", "colossus", "specter"];

export function isBoss(kind: EnemyKind): kind is BossKind {
  return (BOSS_ORDER as readonly string[]).includes(kind);
}

export const STARTER_ID = "saber" as const;

export const WEAPON = {
  saber: {
    name: "Light Saber",
    tag: "Saber",
    slot: "starter",
    blurb: "Close-range energy blade. Swings itself at anything in reach.",
    up: "The cut opens toward a half-circle.",
    cd: [0.36, 0.32, 0.28, 0.24, 0.2],
    dmg: [28, 38, 52, 70, 92],
    range: [78, 90, 104, 120, 138],
    arc: [Math.PI / 3, Math.PI / 3 + Math.PI / 24, Math.PI / 3 + Math.PI / 12, Math.PI / 3 + Math.PI / 8, Math.PI / 2],
  },
  shotgun: {
    name: "Plasma Shotgun",
    tag: "Shotgun",
    slot: "weapon",
    blurb: "Three plasma pellets in a tight burst. Brutal up close.",
    up: "More pellets, harder hit.",
    cd: [0.62, 0.54, 0.48, 0.4, 0.34],
    dmg: [16, 22, 30, 40, 54],
    pellets: [3, 4, 5, 6, 8],
    spread: [0.28, 0.3, 0.32, 0.34, 0.36],
    speed: 520,
    range: 280,
    r: 4.5,
  },
  laser: {
    name: "Laser Beam",
    tag: "Laser",
    slot: "weapon",
    blurb: "A piercing ray. Each rank cuts through more of the swarm.",
    up: "The beam cuts through more bodies.",
    cd: [0.72, 0.64, 0.56, 0.48, 0.4],
    dmg: [32, 42, 56, 74, 96],
    pierce: [2, 3, 5, 8, 14],
    range: [420, 460, 500, 540, 600],
    width: [4, 5, 6, 7, 9],
  },
  flamer: {
    name: "Fire Trail",
    tag: "Trail",
    slot: "weapon",
    blurb: "Walking leaves a burning wake. Enemies that step in it cook.",
    up: "Hotter, wider, lasts longer.",
    cd: [0.11, 0.1, 0.09, 0.08, 0.07],
    dmg: [9, 13, 18, 24, 32],
    radius: [24, 28, 34, 40, 48],
    life: [1.7, 2.1, 2.6, 3.2, 3.9],
    gap: [20, 18, 16, 14, 12],
  },
  orbs: {
    name: "Energy Orbs",
    tag: "Orbs",
    slot: "weapon",
    blurb: "Charged spheres orbit you and shred what they touch.",
    up: "More orbs, wider orbit.",
    cd: [0.16, 0.14, 0.12, 0.1, 0.08],
    dmg: [14, 20, 28, 38, 50],
    radius: [58, 68, 80, 94, 110],
    count: [2, 3, 4, 5, 6],
  },
  drone: {
    name: "Combat Drone",
    tag: "Drone",
    slot: "weapon",
    blurb: "A piercing disc that flies the field and cuts through enemies.",
    up: "Another disc joins the hunt.",
    cd: [0.4, 0.4, 0.4, 0.4, 0.4],
    dmg: [16, 24, 34, 46, 62],
    count: [1, 2, 3, 4, 5],
    speed: [380, 430, 490, 560, 640],
    r: [16, 18, 21, 24, 28],
  },
  sentry: {
    name: "Sentry Turret",
    tag: "Sentry",
    slot: "weapon",
    blurb: "Drops a turret that fires, dies on a timer, then auto-redeploys.",
    up: "More turrets in the field, longer uptime.",
    cd: [2.1, 1.9, 1.7, 1.5, 1.3],
    dmg: [18, 24, 32, 42, 56],
    count: [1, 1, 2, 2, 3],
    life: [5.5, 6, 6.5, 7, 8],
    range: 280,
  },
  tesla: {
    name: "Tesla Coil",
    tag: "Tesla",
    slot: "weapon",
    blurb: "Lightning jumps through clustered targets. Ranks add chains.",
    up: "The bolt jumps further through the pack.",
    cd: [0.64, 0.56, 0.48, 0.4, 0.34],
    dmg: [24, 34, 46, 62, 82],
    chains: [2, 3, 4, 5, 7],
    range: [200, 220, 240, 265, 300],
  },
  rad: {
    name: "Radiation Cloud",
    tag: "Cloud",
    slot: "weapon",
    blurb: "A toxic field around you. Slows and burns everything inside.",
    up: "The cloud grows. The burn bites harder.",
    cd: [0.22, 0.2, 0.18, 0.16, 0.13],
    dmg: [8, 12, 16, 22, 30],
    radius: [72, 86, 102, 120, 142],
    slow: [0.9, 1.1, 1.3, 1.5, 1.8],
  },
  orbit: {
    name: "Orbital Strike",
    tag: "Orbit",
    slot: "weapon",
    blurb: "Random beams drop from above and cook a patch of ground.",
    up: "More strikes per volley, larger burn.",
    cd: [1.5, 1.32, 1.16, 1.0, 0.86],
    dmg: [36, 48, 64, 84, 110],
    count: [1, 1, 2, 2, 3],
    radius: [42, 48, 54, 62, 72],
  },
  cryo: {
    name: "Cryo Grenade",
    tag: "Cryo",
    slot: "weapon",
    blurb: "Thrown charges that detonate on impact. Damage and a hard slow.",
    up: "More grenades, bigger freeze.",
    cd: [1.3, 1.16, 1.02, 0.9, 0.76],
    dmg: [28, 38, 50, 66, 86],
    count: [1, 1, 2, 2, 3],
    radius: [46, 52, 58, 66, 76],
    speed: 320,
    slow: [1.4, 1.6, 1.8, 2.1, 2.5],
  },
} as const;

export type WeaponId = keyof typeof WEAPON;

export const PASSIVES = {
  haste: { name: "Servo Haste", tag: "Haste", blurb: "Projectiles fly 5% faster.", up: "Another 5% of shot speed.", proj: 0.05 },
  might: { name: "Overcharge", tag: "Might", blurb: "All damage +5%.", up: "Another 5% damage.", damage: 0.05 },
  stride: { name: "Stride Coil", tag: "Stride", blurb: "Move 5% faster.", up: "Another 5% move speed.", speed: 0.05 },
  magnet: { name: "Magnet Loop", tag: "Magnet", blurb: "Pickup radius +5%.", up: "Another 5% of pull.", pickup: 0.05 },
  plating: { name: "Plating", tag: "Plate", blurb: "Max hull +5%.", up: "Another 5% of hull.", hpPct: 0.05 },
  xp: { name: "XP Antenna", tag: "XP", blurb: "Experience +5%.", up: "Another 5% XP.", xp: 0.05 },
  cool: { name: "Coolant", tag: "Cool", blurb: "Weapon cooldown −5%.", up: "Another 5% faster cycles.", cooldown: 0.05 },
  regen: { name: "Field Med", tag: "Regen", blurb: "Recover 5% hull every 10 seconds.", up: "The drip heals another 5%.", regenPct: 0.05 },
  ward: { name: "Kinetic Ward", tag: "Ward", blurb: "Take 5% less damage.", up: "Another 5% soak.", armor: 0.05 },
  swarm: { name: "Bait Signal", tag: "Swarm", blurb: "Enemy spawn +10%. More targets, more XP.", up: "The swarm thickens another 10%.", spawn: 0.1 },
  reach: { name: "Lens Array", tag: "Reach", blurb: "Weapon range +5%.", up: "Another 5% of reach.", range: 0.05 },
  salvo: {
    name: "Split Chamber",
    tag: "Salvo",
    blurb: "Fire +1 projectile. Mk 5 adds a second extra shot.",
    up: "Mk 5 unlocks +2 extra projectiles.",
    extra: 1,
  },
} as const;

export type PassiveId = keyof typeof PASSIVES;

export const WEAPON_IDS = (Object.keys(WEAPON) as WeaponId[]).filter((id) => id !== STARTER_ID);
export const PASSIVE_IDS = Object.keys(PASSIVES) as PassiveId[];
