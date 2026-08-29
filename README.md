# Void Surge Survivor

Ten minute sci-fi survivor. You are the last operative on Station Helix-9. The Void Surge turned the crew. Hold the extract pad until the shuttle doors slam shut.

Weapons fire on their own. You only steer. Intensity climbs every minute. Unique bosses land at 2:00, 4:00, 6:00, and 8:00. They stack if the last one is still up. In the final minute, spawn rate doubles every ten seconds.

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
cd void-surge-survivor
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

## Play

### Controls

| Input | Action |
| --- | --- |
| W A S D | Move |
| Arrow keys | Move |
| Drag anywhere on a phone | Virtual stick. Avoid HUD hits (pause, bars) |
| 1 / 2 / 3 | Pick a level-up card |
| Click / tap a card | Pick a level-up card |
| Pause button or Esc | Pause, mix, or return home |

Weapons fire on their own. You only steer.

### Run rules

- One run is 10:00. The clock is the extract window.
- Intensity goes 1 to 10. It ticks up every 60 seconds.
- Unique bosses at 2:00, 4:00, 6:00, 8:00. Alive bosses stay. Several can share the field.
- Last minute (9:00 to 10:00): spawn rate doubles every 10 seconds.
- Loadout cap: 1 CORE, 3 ARMs, 3 MODs. Each ranks to Mk 5.
- Level-ups pause the clock. Pick one of three cards.
- Score is kills only. Each kill is worth more as intensity climbs (every two minutes the kill payout steps up).
- A defeated boss drops a gold vacuum. Walk into it, or wait. It pulls every XP gem on the map.
- Off-screen bosses show an arrow in their health-bar color.

### Core

| Gear | What it does |
| --- | --- |
| Light Saber | Close-range energy blade. The cut opens toward a half-circle by Mk 5. |

You always start with this. It is the only CORE.

### Arms

| Gear | What it does |
| --- | --- |
| Plasma Shotgun | Burst of plasma pellets. Starts at 3. More pellets as it ranks. |
| Laser Beam | Piercing ray. Higher Mk cuts through more of the swarm. |
| Fire Trail | Walking leaves a burning wake. Enemies that step in it cook. |
| Energy Orbs | Spheres orbit you and shred what they touch. |
| Combat Drone | Piercing discs that fly the whole field. |
| Sentry Turret | Drops a turret, times out, then auto-redeploys. |
| Tesla Coil | Lightning that chains through clustered targets. |
| Radiation Cloud | Zone around you. Slows and burns. |
| Orbital Strike | Beams from above. Strikes do not stack on the same patch. |
| Cryo Grenade | Explodes on impact. Damage plus a hard slow. |

### Mods

Each rank is +5%, except **Bait Signal** at +10%. **Split Chamber** is +1 extra projectile, +2 at Mk 5.

| Mod | Effect |
| --- | --- |
| Servo Haste | Projectile speed |
| Overcharge | Damage |
| Stride Coil | Move speed |
| Magnet Loop | Pickup radius |
| Plating | Max hull |
| XP Antenna | Experience gain |
| Coolant | Weapon cooldown |
| Field Med | Hull recovery over time |
| Kinetic Ward | Damage taken |
| Bait Signal | Enemy spawn rate (more targets, more XP) |
| Lens Array | Weapon range |
| Split Chamber | Extra projectiles |

### Swarm

| Mob | Notes |
| --- | --- |
| Crawler | Pack runner. Later minutes they dash. |
| Brute | Slow tank. Charges once intensity climbs. |
| Spitter | Keeps range and lobs spit. Cap of 3 shots (bosses are uncapped). |
| Elite | Fast striker. Dashes through the line. |

### Bosses

They stack if the previous titan is still standing.

| Time | Name | Notes |
| --- | --- | --- |
| 2:00 | Hearth Titan | Fire nova plus a close slam. |
| 4:00 | Ion Hydra | Triple ion spread and a body dash. |
| 6:00 | Siege Colossus | Shell walls, mortars, and summons. |
| 8:00 | Phase Specter | Blink combos: cages, phantoms, lattice, spiral. |

### Scoreboard

- Callsign is set on the title screen and written to the board when a run ends.
- Scores live in `localStorage` under `void-surge-v1`. Callsign is `void-surge-pilot`.
- **Export** downloads a simple `.txt` board.
- **Import** merges a previously exported file.
- **Clear** wipes the stored board.

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

No license file is included. Treat the repo as source you cloned. Add a license before you publish if you need one.
