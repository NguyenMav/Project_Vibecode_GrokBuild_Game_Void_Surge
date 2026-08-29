import { KILL_SCORE, SAVE_KEY } from "./config";
import type { Best, RunEntry } from "./types";

export type SaveState = {
  best: Best;
  runs: RunEntry[];
};

export const EMPTY_BEST: Best = { time: 0, kills: 0, wins: 0, level: 0, score: 0 };
export const PILOT_KEY = "void-surge-pilot";

export function killPoints(intensity: number) {
  const i = Math.max(1, Math.min(KILL_SCORE.length, Math.floor(intensity))) - 1;
  return KILL_SCORE[i];
}

export function sanitizePilot(raw: string) {
  const t = raw.replace(/\s+/g, " ").trim().slice(0, 14);
  return t || "OPERATIVE";
}

export function loadPilot() {
  try {
    const n = localStorage.getItem(PILOT_KEY);
    if (n) return sanitizePilot(n);
  } catch {
    /* ignore */
  }
  return "OPERATIVE";
}

export function persistPilot(name: string) {
  try {
    localStorage.setItem(PILOT_KEY, name);
  } catch {
    /* ignore */
  }
}

export function loadSave(): SaveState {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return { best: { ...EMPTY_BEST }, runs: [] };
    const p = JSON.parse(raw) as Partial<SaveState> & Partial<Best>;
    if (Array.isArray(p.runs) || p.best) {
      const best = p.best ?? EMPTY_BEST;
      return {
        best: {
          time: best.time ?? 0,
          kills: best.kills ?? 0,
          wins: best.wins ?? 0,
          level: best.level ?? 0,
          score: best.score ?? 0,
        },
        runs: Array.isArray(p.runs)
          ? p.runs.map((r) => ({
              name: r.name || "OPERATIVE",
              score: r.score ?? 0,
              time: r.time ?? 0,
              kills: r.kills ?? 0,
              level: r.level ?? 0,
              bosses: r.bosses ?? 0,
              won: !!r.won,
              at: r.at ?? 0,
            }))
          : [],
      };
    }
    return {
      best: {
        time: p.time ?? 0,
        kills: p.kills ?? 0,
        wins: p.wins ?? 0,
        level: p.level ?? 0,
        score: 0,
      },
      runs: [],
    };
  } catch {
    return { best: { ...EMPTY_BEST }, runs: [] };
  }
}

export function persistSave(state: SaveState) {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
  } catch {
    /* ignore */
  }
}

export function serializeBoard(runs: RunEntry[]) {
  const lines = [
    "VOID SURGE SURVIVOR BOARD v1",
    "callsign|score|kills|time|level|bosses|extract|at",
    ...runs.map(
      (r) =>
        `${sanitizePilot(r.name)}|${Math.floor(r.score)}|${Math.floor(r.kills)}|${Math.round(r.time)}|${Math.floor(r.level)}|${Math.floor(r.bosses)}|${r.won ? 1 : 0}|${Math.floor(r.at)}`,
    ),
  ];
  return `${lines.join("\n")}\n`;
}

export function parseBoard(raw: string): RunEntry[] | null {
  const text = raw.replace(/^\uFEFF/, "").trim();
  if (!text) return null;
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const rows: RunEntry[] = [];
  for (const line of lines) {
    if (line.startsWith("VOID SURGE") || line.startsWith("callsign|")) continue;
    const p = line.split("|");
    if (p.length < 8) continue;
    const score = Number(p[1]);
    const kills = Number(p[2]);
    const time = Number(p[3]);
    const level = Number(p[4]);
    const bosses = Number(p[5]);
    const at = Number(p[7]);
    if (![score, kills, time, level, bosses, at].every((n) => Number.isFinite(n))) continue;
    rows.push({
      name: sanitizePilot(p[0]),
      score,
      time,
      kills,
      level,
      bosses,
      won: p[6] === "1" || p[6].toLowerCase() === "true",
      at,
    });
  }
  return rows.length || text.includes("VOID SURGE BOARD") ? rows : null;
}

export function bestFromRuns(runs: RunEntry[]): Best {
  const best = { ...EMPTY_BEST };
  for (const r of runs) {
    best.time = Math.max(best.time, r.time);
    best.kills = Math.max(best.kills, r.kills);
    best.wins += r.won ? 1 : 0;
    best.level = Math.max(best.level, r.level);
    best.score = Math.max(best.score, r.score);
  }
  return best;
}

export function mergeRuns(a: RunEntry[], b: RunEntry[]) {
  const seen = new Set<string>();
  const out: RunEntry[] = [];
  const all = [...a, ...b].sort((x, y) => y.score - x.score || y.at - x.at);
  for (const r of all) {
    const k = `${r.at}|${r.name}|${r.score}|${r.kills}`;
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(r);
    if (out.length >= 24) break;
  }
  return out;
}

export function pushRun(state: SaveState, run: RunEntry): SaveState {
  const runs = [run, ...state.runs].slice(0, 24);
  const best: Best = {
    time: Math.max(state.best.time, run.time),
    kills: Math.max(state.best.kills, run.kills),
    wins: state.best.wins + (run.won ? 1 : 0),
    level: Math.max(state.best.level, run.level),
    score: Math.max(state.best.score, run.score),
  };
  const next = { best, runs };
  persistSave(next);
  return next;
}
