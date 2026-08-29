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
