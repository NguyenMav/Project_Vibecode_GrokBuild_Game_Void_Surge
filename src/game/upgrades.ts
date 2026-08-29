import {
  MAX_GEAR_LEVEL,
  MAX_PASSIVE_SLOTS,
  MAX_WEAPON_SLOTS,
  PASSIVES,
  PASSIVE_IDS,
  STARTER_ID,
  WEAPON,
  WEAPON_IDS,
  type PassiveId,
  type WeaponId,
} from "./config";
import type { Choice, PassiveInst, WeaponInst } from "./types";

function isGun(id: WeaponId) {
  return id !== STARTER_ID;
}

export function rollChoices(weapons: WeaponInst[], passives: PassiveInst[], level: number): Choice[] {
  const pool: { c: Choice; w: number }[] = [];
  const guns = weapons.filter((w) => isGun(w.id));
  const haveGun = new Set(guns.map((w) => w.id));
  const havePass = new Set(passives.map((p) => p.id));

  if (guns.length < MAX_WEAPON_SLOTS) {
    for (const id of WEAPON_IDS) {
      if (haveGun.has(id)) continue;
      const def = WEAPON[id];
      pool.push({
        c: { kind: "weapon", id, title: def.name, blurb: def.blurb, next: 1 },
        w: level < 8 ? 2.6 : 1.5,
      });
    }
  }

  for (const w of weapons) {
    if (w.level >= MAX_GEAR_LEVEL) continue;
    const def = WEAPON[w.id];
    const next = w.level + 1;
    pool.push({
      c: {
        kind: "upgrade",
        id: w.id,
        title: `${def.name} Mk ${next}`,
        blurb: next >= MAX_GEAR_LEVEL ? "Final form." : def.up,
        next,
      },
      w: w.id === STARTER_ID ? 1.8 : 1.7,
    });
  }

  if (passives.length < MAX_PASSIVE_SLOTS) {
    for (const id of PASSIVE_IDS) {
      if (havePass.has(id)) continue;
      const p = PASSIVES[id];
      pool.push({
        c: { kind: "passive", id, title: p.name, blurb: p.blurb, next: 1 },
        w: 1.15,
      });
    }
  }

  for (const p of passives) {
    if (p.level >= MAX_GEAR_LEVEL) continue;
    const def = PASSIVES[p.id];
    const next = p.level + 1;
    pool.push({
      c: {
        kind: "passup",
        id: p.id,
        title: `${def.name} Mk ${next}`,
        blurb: next >= MAX_GEAR_LEVEL ? "Final form." : def.up,
        next,
      },
      w: 1.4,
    });
  }

  const picked: Choice[] = [];
  const used = new Set<string>();
  while (picked.length < 3 && pool.length) {
    const total = pool.reduce((s, x) => s + x.w, 0);
    let r = Math.random() * total;
    let i = 0;
    for (; i < pool.length; i++) {
      r -= pool[i].w;
      if (r <= 0) break;
    }
    i = Math.min(i, pool.length - 1);
    const item = pool.splice(i, 1)[0];
    const key = `${item.c.kind}:${item.c.id}`;
    if (used.has(key)) continue;
    used.add(key);
    picked.push(item.c);
  }
  return picked;
}

export function xpToNext(level: number) {
  return Math.round(8 + level * 6 + level * level * 0.85);
}
