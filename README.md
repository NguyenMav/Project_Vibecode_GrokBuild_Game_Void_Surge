# Void Surge

Ten-minute extraction survivor set on Station Helix-9. The Void Surge hit, the crew came back wrong, and the last shuttle is warming on the pad. Hold it. Get out.

I vibe-coded this for fun with Grok Build. Works on phone and desktop.

## Play

- Move with WASD, or drag anywhere on a phone.
- Weapons fire on their own. You only steer.
- Level-ups freeze the clock. Press 1 / 2 / 3 or tap a card.
- Loadout cap: 1 Core, 3 Arms, 3 Mods. Each ranks to Mk 5.
- Off-screen bosses show an arrow in their bar color.

Type a callsign on the title screen and hit Begin extraction. Last ten minutes and you extract. Hull hits zero and you don't.

The in-game Field manual has the rest.

## The clock

Intensity climbs every minute. Unique bosses land at 2:00, 4:00, 6:00, and 8:00. They stack if the last one is still standing.

| Time | Boss |
| --- | --- |
| 2:00 | Hearth Titan |
| 4:00 | Ion Hydra |
| 6:00 | Siege Colossus |
| 8:00 | Phase Specter |

In the final minute, spawn rate doubles every ten seconds. Score is kills only. Each kill is worth more every two minutes.

## Loadout

Starter Core is the Light Saber. Arms and Mods show up as upgrade cards mid-run.

**Arms:** plasma shotgun, laser, fire trail, orbs, drone, sentry, tesla, radiation cloud, orbital strike, cryo grenades.

**Mods:** shot speed, damage, move speed, magnet, plating, XP, cooldown, regen, armor, spawn rate, extra projectiles.

## Run it

Needs Node.js and npm.

```bash
git clone https://github.com/NguyenMav/Project_Vibecode_GrokBuild_Game_Void_Surge.git
cd Project_Vibecode_GrokBuild_Game_Void_Surge
npm install
npm run dev
```

Open http://localhost:8080

```bash
npm run build      # production build
npm run preview    # serve the build
npm run typecheck
npm run lint
```

Runs save in the browser. The title screen scoreboard can export, import, and clear history.

## Stack

TypeScript, React 19, Vite, TanStack Router, Tailwind. Game loop lives in `src/game`.

## License

MIT. See `LICENSE.txt`.
