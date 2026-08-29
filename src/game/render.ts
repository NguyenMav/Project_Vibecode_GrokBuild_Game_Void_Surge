import { ENEMY, WEAPON, WORLD, isBoss } from "./config";
import type { Game } from "./game";
import { drawSheet } from "./sprites";

function noise1(n: number) {
  const x = Math.sin(n * 127.1) * 43758.5453;
  return x - Math.floor(x);
}

export function renderFrame(g: Game, now: number) {
  const ctx = g.ctx;
  const w = g.viewW;
  const h = g.viewH;
  ctx.fillStyle = "#07080c";
  ctx.fillRect(0, 0, w, h);

  const shake = g.trauma * g.trauma;
  const ox = g.reduced ? 0 : (noise1(now * 0.013) - 0.5) * 22 * shake;
  const oy = g.reduced ? 0 : (noise1(now * 0.017 + 9) - 0.5) * 22 * shake;
  ctx.save();
  ctx.translate(ox, oy);

  drawFloor(g, ctx, w, h);
  drawWorldBorder(g, ctx);
  drawTrails(g, ctx);
  drawAtmosphere(g, ctx, w, h, now);
  drawMines(g, ctx);
  drawStrikes(g, ctx);
  drawGems(g, ctx, now);
  if (g.medkit.alive) drawMedkit(g, ctx);
  if (g.vacuum.alive) drawVacuum(g, ctx);
  drawRad(g, ctx);
  drawSaber(g, ctx);
  drawOrbs(g, ctx);
  drawSentries(g, ctx);
  drawDrones(g, ctx);
  drawBeams(g, ctx);
  drawBullets(g, ctx);
  drawActors(g, ctx, now);
  drawParticles(g, ctx);
  drawFloats(g, ctx);
  ctx.restore();

  drawVignette(g, ctx, w, h);
  drawScreenFrame(ctx, w, h);
  drawBossArrows(g, ctx, w, h);
  drawHurtDeath(g, ctx, w, h);
  if (g.flashT > 0) {
    ctx.fillStyle = `rgba(255,90,74,${Math.min(0.28, g.flashT * 0.7)})`;
    ctx.fillRect(0, 0, w, h);
  }
}

function toS(g: Game, x: number, y: number) {
  return {
    x: x - g.camX + g.viewW / 2,
    y: y - g.camY + g.viewH / 2,
  };
}

function onScreen(g: Game, x: number, y: number, pad = 72) {
  const s = toS(g, x, y);
  return s.x > -pad && s.y > -pad && s.x < g.viewW + pad && s.y < g.viewH + pad;
}

function drawWorldBorder(g: Game, ctx: CanvasRenderingContext2D) {
  const a = toS(g, 0, 0);
  const b = toS(g, WORLD, WORLD);
  const w = b.x - a.x;
  const h = b.y - a.y;
  ctx.strokeStyle = "rgba(224,138,76,0.35)";
  ctx.lineWidth = 18;
  ctx.strokeRect(a.x, a.y, w, h);
  ctx.strokeStyle = "#5ec8d8";
  ctx.lineWidth = 5;
  ctx.strokeRect(a.x, a.y, w, h);
  ctx.strokeStyle = "rgba(232,234,239,0.7)";
  ctx.lineWidth = 1.5;
  ctx.strokeRect(a.x + 8, a.y + 8, w - 16, h - 16);
}

function drawScreenFrame(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.save();
  ctx.strokeStyle = "#5ec8d8";
  ctx.lineWidth = 3;
  ctx.strokeRect(1.5, 1.5, w - 3, h - 3);
  ctx.strokeStyle = "rgba(224,138,76,0.55)";
  ctx.lineWidth = 1;
  ctx.strokeRect(7, 7, w - 14, h - 14);
  const arm = Math.min(28, w * 0.04);
  ctx.strokeStyle = "#e8eaef";
  ctx.lineWidth = 2;
  ctx.beginPath();
  const corners: [number, number, number, number][] = [
    [6, 6, 6 + arm, 6],
    [6, 6, 6, 6 + arm],
    [w - 6, 6, w - 6 - arm, 6],
    [w - 6, 6, w - 6, 6 + arm],
    [6, h - 6, 6 + arm, h - 6],
    [6, h - 6, 6, h - 6 - arm],
    [w - 6, h - 6, w - 6 - arm, h - 6],
    [w - 6, h - 6, w - 6, h - 6 - arm],
  ];
  for (const [x1, y1, x2, y2] of corners) {
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
  }
  ctx.stroke();
  ctx.restore();
}

function drawBossArrows(g: Game, ctx: CanvasRenderingContext2D, w: number, h: number) {
  const padX = 28;
  const padTop = 82;
  const padBot = 72;
  const cx = w / 2;
  const cy = h / 2;
  for (const e of g.enemies) {
    if (!e.alive || !isBoss(e.kind)) continue;
    const s = toS(g, e.x, e.y);
    if (s.x >= padX && s.x <= w - padX && s.y >= padTop && s.y <= h - padBot) continue;
    const dx = s.x - cx;
    const dy = s.y - cy;
    const hw = w / 2 - padX;
    const hh = dy < 0 ? cy - padTop : h - padBot - cy;
    const ax = Math.abs(dx) || 0.001;
    const ay = Math.abs(dy) || 0.001;
    const k = ax / hw > ay / Math.max(8, hh) ? hw / ax : Math.max(8, hh) / ay;
    const x = cx + dx * k;
    const y = cy + dy * k;
    const ang = Math.atan2(dy, dx);
    const color = ENEMY[e.kind].color;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(ang);
    ctx.beginPath();
    ctx.moveTo(12, 0);
    ctx.lineTo(-9, -9);
    ctx.lineTo(-4, 0);
    ctx.lineTo(-9, 9);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.strokeStyle = "rgba(7,8,12,0.55)";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fill();
    ctx.restore();
  }
}

function drawFloor(g: Game, ctx: CanvasRenderingContext2D, w: number, h: number) {
  const tile = g.atlas?.floor;
  const size = 192;
  const ox = g.camX - w / 2;
  const oy = g.camY - h / 2;
  const x0 = Math.floor(ox / size) * size;
  const y0 = Math.floor(oy / size) * size;
  if (tile) {
    for (let y = y0; y < oy + h + size; y += size) {
      for (let x = x0; x < ox + w + size; x += size) {
        ctx.drawImage(tile, x - ox, y - oy, size, size);
      }
    }
  } else {
    ctx.fillStyle = "#0c0e14";
    ctx.fillRect(0, 0, w, h);
  }
  ctx.strokeStyle =
    g.intensity >= 4
      ? "rgba(224,138,76,0.14)"
      : g.intensity >= 2
        ? "rgba(94,200,216,0.12)"
        : "rgba(94,200,216,0.07)";
  ctx.lineWidth = 1;
  const gs = 64;
  const gx0 = Math.floor(ox / gs) * gs;
  const gy0 = Math.floor(oy / gs) * gs;
  ctx.beginPath();
  for (let x = gx0; x < ox + w + gs; x += gs) {
    ctx.moveTo(x - ox, 0);
    ctx.lineTo(x - ox, h);
  }
  for (let y = gy0; y < oy + h + gs; y += gs) {
    ctx.moveTo(0, y - oy);
    ctx.lineTo(w, y - oy);
  }
  ctx.stroke();
  const wash = ctx.createRadialGradient(w / 2, h / 2, 40, w / 2, h / 2, Math.max(w, h) * 0.7);
  const tint =
    g.intensity >= 4 ? "rgba(224,90,70,0.16)" : g.intensity >= 2 ? "rgba(94,200,216,0.12)" : "rgba(50,90,110,0.10)";
  wash.addColorStop(0, "rgba(7,8,12,0)");
  wash.addColorStop(1, tint);
  ctx.fillStyle = wash;
  ctx.fillRect(0, 0, w, h);
}

function drawAtmosphere(g: Game, ctx: CanvasRenderingContext2D, w: number, h: number, now: number) {
  const n = g.mobile ? 10 : 18;
  const hot = g.intensity >= 3 || g.titans > g.bossesKilled;
  for (let i = 0; i < n; i++) {
    const drift = now * (0.018 + (i % 7) * 0.004);
    let px = noise1(i * 13.7) * (w + 80) + drift;
    let py = noise1(i * 29.1) * (h + 80) - drift * 0.6;
    px = ((px % (w + 80)) + (w + 80)) % (w + 80) - 40;
    py = ((py % (h + 80)) + (h + 80)) % (h + 80) - 40;
    const hot = g.intensity >= 3 || g.titans > g.bossesKilled;
    ctx.fillStyle = hot ? `rgba(255,122,69,${0.2 + (i % 4) * 0.06})` : `rgba(94,200,216,${0.18 + (i % 4) * 0.05})`;
    const sz = 2 + (i % 3);
    ctx.fillRect(px, py, sz, sz);
  }
}

function drawTrails(g: Game, ctx: CanvasRenderingContext2D) {
  for (const t of g.trails) {
    if (!t.alive) continue;
    if (!onScreen(g, t.x, t.y, t.r + 8)) continue;
    const s = toS(g, t.x, t.y);
    const fade = Math.max(0.12, t.life / t.max);
    const flicker = 0.82 + Math.sin(t.life * 14 + t.x * 0.05) * 0.18;
    ctx.beginPath();
    ctx.ellipse(s.x, s.y + 4, t.r * 1.05, t.r * 0.62, 0, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255,90,40,${0.22 * fade * flicker})`;
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(s.x, s.y, t.r * 0.72, t.r * 0.42, 0, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255,170,70,${0.38 * fade})`;
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(s.x, s.y - 3, t.r * 0.32, t.r * 0.22, 0, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255,230,160,${0.5 * fade * flicker})`;
    ctx.fill();
  }
}

function drawMines(g: Game, ctx: CanvasRenderingContext2D) {
  for (const m of g.mines) {
    if (!m.alive) continue;
    const s = toS(g, m.x, m.y);
    const pulse = 0.55 + Math.sin(m.life * 10) * 0.25;
    ctx.beginPath();
    ctx.arc(s.x, s.y, m.r * 0.35, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(125,154,160,${0.35 * pulse})`;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(s.x, s.y, 5, 0, Math.PI * 2);
    ctx.fillStyle = m.arm > 0 ? "#5c6170" : "#c5d0d6";
    ctx.fill();
  }
}

function drawGems(g: Game, ctx: CanvasRenderingContext2D, now: number) {
  const sheet = g.atlas?.gem;
  const frame = Math.floor(now / 140) % 4;
  for (const gem of g.gems) {
    if (!gem.alive) continue;
    const s = toS(g, gem.x, gem.y);
    ctx.beginPath();
    ctx.arc(s.x, s.y, 10, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(94,200,216,0.28)";
    ctx.fill();
    if (sheet) drawSheet(ctx, sheet, frame, s.x, s.y, 18 + Math.min(8, gem.value));
    else {
      ctx.beginPath();
      ctx.arc(s.x, s.y, 4, 0, Math.PI * 2);
      ctx.fillStyle = "#7d9aa0";
      ctx.fill();
    }
  }
}

function drawMedkit(g: Game, ctx: CanvasRenderingContext2D) {
  const s = toS(g, g.medkit.x, g.medkit.y);
  const sheet = g.atlas?.medkit;
  if (sheet) drawSheet(ctx, sheet, 0, s.x, s.y, 28);
  else {
    ctx.fillStyle = "#c5d0d6";
    ctx.fillRect(s.x - 8, s.y - 8, 16, 16);
  }
}

function drawVacuum(g: Game, ctx: CanvasRenderingContext2D) {
  const s = toS(g, g.vacuum.x, g.vacuum.y);
  const pulse = 0.7 + Math.sin(g.time * 10) * 0.3;
  ctx.beginPath();
  ctx.arc(s.x, s.y, 16 * pulse, 0, Math.PI * 2);
  ctx.strokeStyle = `rgba(255,224,138,${0.35 + pulse * 0.25})`;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(s.x, s.y, 9, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(94,200,216,0.35)";
  ctx.fill();
  ctx.beginPath();
  ctx.arc(s.x, s.y, 5, 0, Math.PI * 2);
  ctx.fillStyle = "#ffe08a";
  ctx.fill();
}

function drawHurtDeath(g: Game, ctx: CanvasRenderingContext2D, w: number, h: number) {
  if (g.hurtT > 0) {
    const a = Math.min(0.55, g.hurtT * 1.5);
    const rad = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.18, w / 2, h / 2, Math.max(w, h) * 0.72);
    rad.addColorStop(0, "rgba(255,90,74,0)");
    rad.addColorStop(0.55, `rgba(255,50,40,${a * 0.12})`);
    rad.addColorStop(1, `rgba(220,28,32,${a})`);
    ctx.fillStyle = rad;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = `rgba(255,210,200,${a * 0.12})`;
    ctx.fillRect(0, 0, w, h);
  }
  if (g.deathT > 0) {
    const a = Math.min(1, g.deathT);
    ctx.fillStyle = `rgba(12,2,4,${a * 0.55})`;
    ctx.fillRect(0, 0, w, h);
    const rad = ctx.createRadialGradient(w / 2, h / 2, 20, w / 2, h / 2, Math.max(w, h) * 0.7);
    rad.addColorStop(0, `rgba(80,8,12,${a * 0.15})`);
    rad.addColorStop(1, `rgba(180,20,28,${a * 0.55})`);
    ctx.fillStyle = rad;
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = `rgba(255,90,74,${a * 0.45})`;
    ctx.lineWidth = 10;
    ctx.strokeRect(0, 0, w, h);
  }
}

function drawSaber(g: Game, ctx: CanvasRenderingContext2D) {
  const wpn = g.weapons.find((w) => w.id === "saber");
  if (!wpn || g.saberSweep <= 0) return;
  const def = WEAPON.saber;
  const lv = wpn.level - 1;
  const p = toS(g, g.player.x, g.player.y);
  const aim = g.player.aim;
  const range = def.range[lv] * g.player.rangeMul;
  const arc = def.arc[lv];
  ctx.beginPath();
  ctx.moveTo(p.x, p.y);
  ctx.arc(p.x, p.y, range, aim - arc, aim + arc);
  ctx.closePath();
  ctx.fillStyle = `rgba(127,208,220,${0.12 + g.saberSweep * 0.28})`;
  ctx.fill();
  ctx.strokeStyle = `rgba(232,234,239,${0.4 + g.saberSweep * 0.5})`;
  ctx.lineWidth = 3;
  ctx.stroke();
}

function drawOrbs(g: Game, ctx: CanvasRenderingContext2D) {
  const wpn = g.weapons.find((w) => w.id === "orbs");
  if (!wpn) return;
  const def = WEAPON.orbs;
  const lv = wpn.level - 1;
  const rad = def.radius[lv] * g.player.rangeMul;
  const n = Math.min(12, def.count[lv] + g.player.extraProj);
  const p = toS(g, g.player.x, g.player.y);
  ctx.beginPath();
  ctx.arc(p.x, p.y, rad, 0, Math.PI * 2);
  ctx.strokeStyle = "rgba(127,208,220,0.22)";
  ctx.lineWidth = 1.5;
  ctx.stroke();
  for (let i = 0; i < n; i++) {
    const a = g.haloAngle + (i / n) * Math.PI * 2;
    ctx.beginPath();
    ctx.arc(p.x + Math.cos(a) * rad, p.y + Math.sin(a) * rad, 7, 0, Math.PI * 2);
    ctx.fillStyle = "#7fd0dc";
    ctx.fill();
    ctx.beginPath();
    ctx.arc(p.x + Math.cos(a) * rad, p.y + Math.sin(a) * rad, 12, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(127,208,220,0.25)";
    ctx.fill();
  }
}

function drawRad(g: Game, ctx: CanvasRenderingContext2D) {
  const wpn = g.weapons.find((w) => w.id === "rad");
  if (!wpn) return;
  const rad = WEAPON.rad.radius[wpn.level - 1] * g.player.rangeMul;
  const p = toS(g, g.player.x, g.player.y);
  const pulse = 0.16 + Math.sin(g.haloAngle * 3) * 0.05;
  ctx.beginPath();
  ctx.arc(p.x, p.y, rad, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(125,255,179,${pulse})`;
  ctx.fill();
  ctx.strokeStyle = "rgba(125,255,179,0.45)";
  ctx.lineWidth = 1.5;
  ctx.stroke();
}

function drawDrones(g: Game, ctx: CanvasRenderingContext2D) {
  const wpn = g.weapons.find((w) => w.id === "drone");
  const lv = wpn ? wpn.level - 1 : 0;
  const rad = WEAPON.drone.r[lv] ?? 16;
  for (const d of g.drones) {
    if (!d.alive) continue;
    const s = toS(g, d.x, d.y);
    const ang = Math.atan2(d.vy, d.vx);
    ctx.save();
    ctx.translate(s.x, s.y);
    ctx.rotate(ang + d.phase);
    ctx.beginPath();
    ctx.ellipse(-rad * 0.9, 0, rad * 1.15, rad * 0.38, 0, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(94,200,216,0.28)";
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(0, 0, rad, rad * 0.42, 0, 0, Math.PI * 2);
    ctx.fillStyle = "#e8eaef";
    ctx.fill();
    ctx.strokeStyle = "#5ec8d8";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, 0, 3.5, 0, Math.PI * 2);
    ctx.fillStyle = "#7fd0dc";
    ctx.fill();
    ctx.restore();
  }
}

function drawSentries(g: Game, ctx: CanvasRenderingContext2D) {
  for (const s of g.sentries) {
    if (!s.alive) continue;
    const p = toS(g, s.x, s.y);
    ctx.fillStyle = "rgba(7,8,12,0.4)";
    ctx.fillRect(p.x - 8, p.y + 6, 16, 4);
    ctx.fillStyle = "#8b90a0";
    ctx.fillRect(p.x - 7, p.y - 6, 14, 12);
    ctx.fillStyle = "#7fd0dc";
    ctx.fillRect(p.x - 3, p.y - 9, 6, 5);
    const t = s.life / 8;
    ctx.fillStyle = "rgba(7,8,12,0.6)";
    ctx.fillRect(p.x - 8, p.y + 10, 16, 2);
    ctx.fillStyle = "#6f9e86";
    ctx.fillRect(p.x - 8, p.y + 10, 16 * Math.max(0, Math.min(1, t)), 2);
  }
}

function drawStrikes(g: Game, ctx: CanvasRenderingContext2D) {
  for (const s of g.strikes) {
    if (!s.alive) continue;
    const p = toS(g, s.x, s.y);
    const warn = 1 - Math.max(0, s.wait) / 0.5;
    ctx.beginPath();
    ctx.arc(p.x, p.y, s.r, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(255,224,138,${0.25 + warn * 0.55})`;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
    ctx.fillStyle = "#ffe08a";
    ctx.fill();
  }
}

function drawBeams(g: Game, ctx: CanvasRenderingContext2D) {
  for (const b of g.beams) {
    if (!b.alive) continue;
    const a = toS(g, b.x1, b.y1);
    const c = toS(g, b.x2, b.y2);
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(c.x, c.y);
    ctx.strokeStyle = b.color;
    ctx.globalAlpha = Math.max(0.15, b.life * 6);
    ctx.lineWidth = b.width;
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
}

function drawBullets(g: Game, ctx: CanvasRenderingContext2D) {
  for (const b of g.bullets) {
    if (!b.alive) continue;
    if (!onScreen(g, b.x, b.y, 28)) continue;
    const s = toS(g, b.x, b.y);
    if (b.kind === "siege") {
      const rad = b.r + 2;
      ctx.save();
      ctx.translate(s.x, s.y);
      ctx.rotate(Math.atan2(b.vy, b.vx));
      ctx.fillStyle = "rgba(224,138,76,0.28)";
      ctx.fillRect(-rad - 3, -rad - 2, rad * 2 + 8, rad * 2 + 4);
      ctx.fillStyle = "#e08a4c";
      ctx.fillRect(-rad, -rad * 0.7, rad * 2, rad * 1.4);
      ctx.fillStyle = "#ffe08a";
      ctx.fillRect(rad * 0.15, -rad * 0.28, rad * 0.7, rad * 0.56);
      ctx.restore();
      continue;
    }
    if (b.kind === "phase") {
      ctx.save();
      ctx.translate(s.x, s.y);
      ctx.rotate(Math.PI / 4 + Math.atan2(b.vy, b.vx) * 0.2);
      const rad = b.r + 1;
      ctx.fillStyle = "rgba(201,160,255,0.32)";
      ctx.fillRect(-rad - 3, -rad - 3, rad * 2 + 6, rad * 2 + 6);
      ctx.fillStyle = "#c9a0ff";
      ctx.fillRect(-rad, -rad, rad * 2, rad * 2);
      ctx.fillStyle = "#f0e6ff";
      ctx.fillRect(-rad * 0.35, -rad * 0.35, rad * 0.7, rad * 0.7);
      ctx.restore();
      continue;
    }
    const rad = b.team === 1 ? 5 : b.kind === "cryo" ? 7 : 5;
    ctx.beginPath();
    ctx.arc(s.x, s.y, rad + 5, 0, Math.PI * 2);
    if (b.team === 1) ctx.fillStyle = "rgba(255,90,74,0.32)";
    else if (b.kind === "cryo") ctx.fillStyle = "rgba(127,208,220,0.4)";
    else if (b.kind === "drone") ctx.fillStyle = "rgba(125,255,179,0.32)";
    else if (b.kind === "sentry") ctx.fillStyle = "rgba(255,224,138,0.32)";
    else ctx.fillStyle = "rgba(94,200,216,0.38)";
    ctx.fill();
    ctx.beginPath();
    ctx.arc(s.x, s.y, rad, 0, Math.PI * 2);
    if (b.team === 1) ctx.fillStyle = "#ff7a45";
    else if (b.kind === "cryo") ctx.fillStyle = "#b8f0ff";
    else if (b.kind === "drone") ctx.fillStyle = "#7dffb3";
    else if (b.kind === "sentry") ctx.fillStyle = "#ffe08a";
    else ctx.fillStyle = "#7fd0dc";
    ctx.fill();
  }
}

type DrawItem = { y: number; z: number; fn: () => void };

function drawActors(g: Game, ctx: CanvasRenderingContext2D, now: number) {
  const list: DrawItem[] = [];
  const atlas = g.atlas;
  const t = now / 1000;

  for (const e of g.enemies) {
    if (!e.alive) continue;
    if (!onScreen(g, e.x, e.y, ENEMY[e.kind].draw)) continue;
    const kind = e.kind;
    list.push({
      y: e.y,
      z: 0,
      fn: () => {
        const s = toS(g, e.x, e.y);
        const size = ENEMY[kind].draw;
        const sheet = atlas?.[kind] ?? null;
        const boss = isBoss(kind);
        const frames = boss ? 1 : 4;
        const frame = Math.floor(t * (boss ? 4 : 8) + e.x * 0.02) % frames;
        ctx.fillStyle = "rgba(0,0,0,0.35)";
        ctx.beginPath();
        ctx.ellipse(s.x, s.y + size * 0.32, size * 0.28, size * 0.1, 0, 0, Math.PI * 2);
        ctx.fill();
        if (boss) {
          const col = "color" in ENEMY[kind] ? ENEMY[kind].color : "#ff5a4a";
          const pulse = 0.32 + Math.sin(t * 6 + e.x) * 0.14;
          ctx.beginPath();
          ctx.arc(s.x, s.y, size * 0.58, 0, Math.PI * 2);
          ctx.strokeStyle = col;
          ctx.globalAlpha = pulse;
          ctx.lineWidth = 3;
          ctx.stroke();
          ctx.globalAlpha = 1;
          if (kind === "specter" && e.phase > 0) ctx.globalAlpha = 0.4;
          if (kind === "hydra") {
            for (let k = 0; k < 3; k++) {
              const a = t * 2 + (k * Math.PI * 2) / 3;
              ctx.beginPath();
              ctx.arc(s.x + Math.cos(a) * 18, s.y - 10 + Math.sin(a) * 6, 4, 0, Math.PI * 2);
              ctx.fillStyle = col;
              ctx.fill();
            }
          }
          if (kind === "crown") {
            ctx.beginPath();
            ctx.arc(s.x, s.y, size * 0.72, 0, Math.PI * 2);
            ctx.strokeStyle = "rgba(255,224,138,0.35)";
            ctx.lineWidth = 2;
            ctx.stroke();
          }
        }
        if (sheet) {
          drawSheet(ctx, sheet, frame, s.x, s.y, size, e.facing < 0, ctx.globalAlpha);
          if (e.flash > 0) {
            ctx.globalCompositeOperation = "lighter";
            drawSheet(ctx, sheet, frame, s.x, s.y, size, e.facing < 0, 0.55);
            ctx.globalCompositeOperation = "source-over";
          }
        } else {
          ctx.beginPath();
          ctx.arc(s.x, s.y, e.r, 0, Math.PI * 2);
          ctx.fillStyle = kind === "crawler" ? "#c47a52" : "#8b90a0";
          ctx.fill();
        }
        ctx.globalAlpha = 1;
        if (e.maxHp > 40) {
          const bw = size * 0.7;
          const hp = Math.max(0, e.hp / e.maxHp);
          ctx.fillStyle = "rgba(7,8,12,0.7)";
          ctx.fillRect(s.x - bw / 2, s.y - size * 0.48, bw, 3);
          ctx.fillStyle = hp > 0.4 ? "#6f9e86" : "#c45c58";
          ctx.fillRect(s.x - bw / 2, s.y - size * 0.48, bw * hp, 3);
        }
      },
    });
  }

  list.push({
    y: g.player.y,
    z: 1,
    fn: () => {
      const p = g.player;
      const s = toS(g, p.x, p.y);
      const size = 36;
      ctx.fillStyle = "rgba(0,0,0,0.4)";
      ctx.beginPath();
      ctx.ellipse(s.x, s.y + 14, 10, 4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(s.x, s.y, 22, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(94,200,216,0.16)";
      ctx.fill();
      const moving = Math.hypot(p.vx, p.vy) > 8;
      const frame = p.dir * 4 + (moving ? Math.floor(p.walk) % 4 : 0);
      const bob = moving ? Math.abs(Math.sin((p.walk * Math.PI) / 2)) * 2 : 0;
      const sheet = atlas?.player ?? null;
      const alpha = p.iFrames > 0 && Math.floor(t * 18) % 2 === 0 ? 0.45 : 1;
      if (sheet) drawSheet(ctx, sheet, frame, s.x, s.y - bob, size, false, alpha);
      else {
        ctx.globalAlpha = alpha;
        ctx.fillStyle = "#c5d0d6";
        ctx.beginPath();
        ctx.arc(s.x, s.y, p.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
    },
  });

  list.sort((a, b) => a.y - b.y || a.z - b.z);
  for (const item of list) item.fn();
}

function drawParticles(g: Game, ctx: CanvasRenderingContext2D) {
  for (const q of g.particles) {
    if (!q.alive) continue;
    if (!onScreen(g, q.x, q.y, 12)) continue;
    const s = toS(g, q.x, q.y);
    ctx.globalAlpha = Math.max(0, q.life / q.max);
    ctx.fillStyle = q.color;
    ctx.fillRect(s.x, s.y, q.size, q.size);
    ctx.globalAlpha = 1;
  }
}

function drawFloats(g: Game, ctx: CanvasRenderingContext2D) {
  ctx.font = "600 11px 'IBM Plex Mono', monospace";
  ctx.textAlign = "center";
  for (const f of g.floats) {
    if (!f.alive) continue;
    const s = toS(g, f.x, f.y);
    ctx.globalAlpha = Math.max(0, f.life / 0.55);
    ctx.fillStyle = f.color;
    ctx.fillText(f.text, s.x, s.y);
    ctx.globalAlpha = 1;
  }
  ctx.textAlign = "left";
}

function drawVignette(g: Game, ctx: CanvasRenderingContext2D, w: number, h: number) {
  const grd = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.22, w / 2, h / 2, Math.max(w, h) * 0.72);
  grd.addColorStop(0, "rgba(7,8,12,0)");
  grd.addColorStop(
    1,
    g.intensity >= 4 ? "rgba(48,12,10,0.62)" : g.intensity >= 2 ? "rgba(8,28,36,0.58)" : "rgba(7,8,12,0.55)",
  );
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, w, h);
}
