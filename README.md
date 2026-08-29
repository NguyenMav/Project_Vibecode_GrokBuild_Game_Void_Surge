# VOID SURGE

**[Play it live](https://void-surge-survivor.grok.me/)** · desktop and mobile · no account

A 10-minute bullet-heaven extraction on Station Helix-9. You only steer. Weapons fire themselves. Stack a Mk 5 loadout, hold the pad as intensity climbs, and get out before four bosses stack on top of you.

Helix-9 sat quiet on the edge of a dead sector until the Void Surge hit. The crew came back wrong. You dropped onto the extract pad while the last shuttle warms. The swarm is already in the walls. Hold the pad. Get out.

---

## How a run works

Survive **10:00**. Intensity ticks up every minute (INT 1 → 10). Unique bosses land at **2:00, 4:00, 6:00, 8:00** and **stack** if the last one is still standing. In the final minute, spawn rate doubles every ten seconds.

Kills drop XP gems. Level-ups freeze the clock and offer three cards. Loadout cap is **1 CORE + 3 ARMs + 3 MODs**, each ranked to **Mk 5**. Score is kills only — each kill is worth more as intensity climbs. Last until the shuttle, or die trying.

---

## Controls

You never aim or shoot. Auto-fire handles combat.

| Input | Action |
| --- | --- |
| **WASD** or **arrow keys** | Move |
| **Drag** anywhere on a phone / tablet | Virtual stick (avoid the pause button) |
| **1 / 2 / 3** (or tap a card) | Pick a level-up |
| **Esc** or bottom-right pause | Pause / resume |
| Pause → **Home** | Return to title without killing the server |

Title screen: type a callsign (max 14 characters), set Music / Sounds, open **Field manual**, then **Begin extraction**.

---

## Loadout

You always start with the CORE. New ARMs and MODs appear as level-up cards. You can hold three of each. Ranking an owned piece to Mk 5 is usually stronger than grabbing a fourth you cannot equip.

### CORE

| Gear | What it does | Mk 5 |
| --- | --- | --- |
| **Light Saber** | Close-range energy blade. Swings itself at anything in reach. | The cut opens toward a half-circle. Faster, harder, longer reach. |

### ARMs (weapons)

| Gear | What it does | How it ranks |
| --- | --- | --- |
| **Plasma Shotgun** | Tight burst of plasma pellets. Brutal up close. | More pellets, harder hit (3 → 8). |
| **Laser Beam** | Piercing ray through the swarm. | Cuts through more bodies (2 → 14 pierce). |
| **Fire Trail** | Walking leaves a burning wake. | Hotter, wider, lasts longer. |
| **Energy Orbs** | Charged spheres orbit you and shred what they touch. | More orbs, wider orbit (2 → 6). |
| **Combat Drone** | A piercing disc that flies the field. | Another disc joins the hunt (1 → 5). |
| **Sentry Turret** | Drops a turret that fires, dies on a timer, then auto-redeploys. | More turrets, longer uptime (1 → 3). |
| **Tesla Coil** | Lightning jumps through clustered targets. | The bolt jumps further (2 → 7 chains). |
| **Radiation Cloud** | Toxic field around you. Slows and burns everything inside. | The cloud grows. The burn bites harder. |
| **Orbital Strike** | Random beams drop from above and cook a patch of ground. | More strikes per volley, larger burn (1 → 3). |
| **Cryo Grenade** | Thrown charges that detonate on impact. Damage and a hard slow. | More grenades, bigger freeze (1 → 3). |

### MODs (passives)

Each rank is **+5%**, except where noted. Three slots. Mk 5 is the cap.

| Mod | Effect per rank |
| --- | --- |
| **Servo Haste** | Projectiles fly 5% faster |
| **Overcharge** | All damage +5% |
| **Stride Coil** | Move 5% faster |
| **Magnet Loop** | Pickup radius +5% |
| **Plating** | Max hull +5% |
| **XP Antenna** | Experience +5% |
| **Coolant** | Weapon cooldown −5% |
| **Field Med** | Recover 5% hull every 10 seconds |
| **Kinetic Ward** | Take 5% less damage |
| **Bait Signal** | Enemy spawn **+10%**. More targets, more XP |
| **Lens Array** | Weapon range +5% |
| **Split Chamber** | Fire **+1** projectile. Mk 5 adds a second extra shot |

---

## Swarm

Fodder scales with intensity: more HP, more speed, more contact damage. Later minutes they gain extra tricks.

| Mob | Role |
| --- | --- |
| **Crawler** | Pack runner. From INT 6 they dash. |
| **Brute** | Slow tank. From INT 4 they charge. |
| **Spitter** | Keeps range and lobs spit. Cap of 3 shots in flight. Later they fan extra pellets and can slow. |
| **Elite** | Fast striker. From INT 3 they dash through the line. |

Composition shifts as the clock climbs: crawlers first, then brutes, spitters, then elites take over the mix.

---

## Bosses

One unique titan every two minutes. They **do not despawn** when the next one lands — if you are slow, you fight two, three, then four at once. Off-screen bosses show an arrow in their bar color. Killing a boss drops a gold **vacuum**; walk into it (or wait ~10s) and every gem on the map pulls to you.

| Time | Boss | Kit |
| --- | --- | --- |
| **2:00** | **Hearth Titan** | Fire nova ring plus a close slam that knocks you back. |
| **4:00** | **Ion Hydra** | Triple ion spread (slows) and a body dash. |
| **6:00** | **Siege Colossus** | Alternating shell walls and mortar rings, plus ground strikes. Periodically summons a brute and a crawler. |
| **8:00** | **Phase Specter** | Blink combos that cycle cages, phantom volleys, lattice walls, and a spiral. Homing seekers between patterns. |

**Crown of Null** exists in the data as an unused apex (spinning beam + shot ring). It is not in the 10-minute spawn order.

---

## Pickups and hull

- **XP gems** — drop from kills. Magnet Loop and boss vacuums pull them in.
- **Medkit** — spawns near you on a slow timer. Walk over it for **+28** hull.
- **Boss vacuum** — gold pickup after a titan dies. Collects every gem on the map.
- Base hull is **100**. I-frames after a hit. Kinetic Ward soaks damage. Field Med drips hull back.

---

## Scoring

Score is **kills only**. Intensity 1 kills are worth 8; by INT 10 they are worth 140. Surviving longer is worth more than a greedy early farm. Extracting at 10:00 marks the run **EXT** on the local scoreboard. Scores live in this browser (`localStorage`). Export / import / clear from the title screen or the end card.

---

## Requirements

- Node.js 20 or newer (22 is what the production runtime targets)
- npm 10 or newer (ships with current Node)
- A modern browser (Chrome, Firefox, Safari, Edge)
- Optional: Git, if you cloned the repo

Check versions:

```bash
node -v
npm -v
```

## Install

From the repo root:

```bash
git clone https://github.com/NguyenMav/Project_Vibecode_GrokBuild_Game_Void_Surge.git
cd Project_Vibecode_GrokBuild_Game_Void_Surge
npm install
```

If `package-lock.json` is present and you want a clean, lockfile-exact install:

```bash
npm ci
```

`npm install` is enough for a first run. The first install can take a minute. Nothing else has to be configured. There is no required `.env` file. Auth and Postgres stay optional. The game stores scores in the browser.

## Run (play locally)

Start the live dev server:

```bash
npm run dev
```

Open:

```
http://localhost:8080/
```

The server binds `0.0.0.0:8080`, so phones on the same network can use `http://<your-lan-ip>:8080/`. Port 8080 is fixed. If something else owns that port, stop it first or the start will fail.

On the title screen:

1. Type a callsign (optional, max 14 characters).
2. Drag the Music / Sounds sliders if you want.
3. Click **Field manual** for the full gear and boss list.
4. Click **Begin extraction**.
5. Move. Weapons fire themselves.

### Stop / close the game

In the terminal that is running `npm run dev`, press:

```
Ctrl+C
```

That stops the Vite process. Close the browser tab when you are done.

If a stray process still owns 8080:

```bash
# macOS / Linux
lsof -i :8080
kill <pid>

# or, if you used the built-in preview helper
npm run preview:stop
```

Pause in-game with the bottom-right pause button, or Esc. Pause has **Home**, which returns to the title without killing the server.

## Other commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Live game at http://localhost:8080 |
| `npm run build` | Production client + server bundle, then migrate |
| `npm run preview` | Serve the production build at http://127.0.0.1:8081 |
| `npm run preview:restart` | Kill whatever is on 8081, then serve the latest build |
| `npm run preview:stop` | Stop the 8081 preview process |
| `npm run typecheck` | TypeScript `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm run format` | Prettier write |
| `npm test` | Script and unit tests |
| `npm run db:migrate` | Apply SQL migrations (no-op if `DATABASE_URL` is unset) |
| `npm run check:auth` | Auth invariant check used by the template |

Typical production check on your machine:

```bash
npm run typecheck
npm run build
npm run preview
```

Then open http://127.0.0.1:8081/ and press `Ctrl+C` (or `npm run preview:stop`) when finished.

`npm run build` writes Vercel / Nitro output under `.vercel/`. You do not need a Vercel account to play locally.

## Environment (optional)

The game itself does not need secrets. Template env, if you touch it:

| Variable | Role |
| --- | --- |
| `DATABASE_URL` | Postgres for auth / app data. Unset = skip migrate, PGLite fallback. |
| `VITE_AUTH_ENABLED` | Template auth flag. Not required to play. |

Do not commit `.env` files. See `.gitignore`.

## Project layout

```
public/                 Static files copied as-is
  og.jpg                Share preview (1200x630)
  x-banner.jpg          X feed banner (1200x264)
  sprites/              Player, mobs, bosses, pickups
  favicon.svg
src/
  components/           HUD, title, field manual, pause
  game/                 Loop, weapons, render, audio, save
  routes/               TanStack Start routes (index is the game)
  lib/                  Auth, db, og site.json
scripts/                Dev, preview, migrate, smoke helpers
migrations/             SQL, applied when DATABASE_URL is set
```

Gameplay source of truth:

- [`src/game/game.ts`](src/game/game.ts) loop, spawning, combat
- [`src/game/config.ts`](src/game/config.ts) timing, HP, weapons, mods
- [`src/game/render.ts`](src/game/render.ts) canvas draw
- [`src/game/audio.ts`](src/game/audio.ts) music and SFX
- [`src/game/save.ts`](src/game/save.ts) scoreboard persistence
- [`src/components/game-view.tsx`](src/components/game-view.tsx) HUD and menus
- [`src/components/field-guide.tsx`](src/components/field-guide.tsx) in-game field manual

## Stack

- React 19 + TanStack Start + Vite 8
- Canvas 2D game loop, 60 Hz fixed step
- Tailwind CSS 4
- TypeScript
- Web Audio (procedural music and SFX)
- `localStorage` for scores

## Troubleshooting

**Port 8080 already in use.** Stop the old `npm run dev` with `Ctrl+C`, or kill the process on 8080.

**Blank canvas or missing sprites.** Confirm `public/sprites/` is intact after clone. Hard-refresh the browser (cache can keep an old `player.png`).

**No sound.** Click once on the page. Browsers block AudioContext until a gesture. Check the title-screen mix sliders. They are not muted by default.

**Scores vanished.** They live in this browser only. Export the board before clearing site data, or before switching browsers.

**`npm run preview` fails on 8081.** Something is already bound. Run `npm run preview:stop`, or kill the 8081 process, then preview again.

**Install fails on an old Node.** Upgrade to Node 20+. This repo uses ES modules, Vite 8, and `npm run` scripts that assume a current Node.

## License

[MIT](LICENSE.txt) © 2026 Maverick Nguyen.
