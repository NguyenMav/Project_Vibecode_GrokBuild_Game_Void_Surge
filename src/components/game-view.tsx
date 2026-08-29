import { BookOpen, Home, Pause, Play, Rocket, Volume2, VolumeX } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { FieldGuide } from "@/components/field-guide";
import { Button } from "@/components/ui/button";
import { RUN_SECONDS } from "@/game/config";
import { Game } from "@/game/game";
import type { Choice, Hud, RunEntry } from "@/game/types";

const EMPTY: Hud = {
  mode: "title",
  time: 0,
  intensity: 1,
  hp: 100,
  maxHp: 100,
  level: 0,
  xp: 0,
  xpNext: 8,
  kills: 0,
  score: 0,
  banner: null,
  choices: [],
  loadout: [],
  won: false,
  best: { time: 0, kills: 0, wins: 0, level: 0, score: 0 },
  board: [],
  muted: false,
  sfxVol: 0.85,
  musicVol: 0.8,
  bosses: [],
  named: true,
  pilot: "OPERATIVE",
};

function fmtRemain(t: number) {
  const s = Math.max(0, Math.ceil(RUN_SECONDS - t));
  const m = Math.floor(s / 60);
  return `${m}:${(s % 60).toString().padStart(2, "0")}`;
}

function fmtBest(t: number) {
  const s = Math.floor(t);
  const m = Math.floor(s / 60);
  return `${m}:${(s % 60).toString().padStart(2, "0")}`;
}

function fmtScore(n: number) {
  return Math.max(0, Math.floor(n)).toLocaleString("en-US");
}

const TIER: Record<"starter" | "weapon" | "passive", readonly string[]> = {
  starter: ["#7aa8b0", "#5ec8d8", "#7fd0dc", "#b8f0ff", "#ffe08a"],
  weapon: ["#c48458", "#e08a4c", "#ff7a45", "#ffb070", "#ffe08a"],
  passive: ["#8b78b8", "#9b7fd4", "#c9a0ff", "#e8c4ff", "#ff9ed6"],
};

function tierColor(kind: "starter" | "weapon" | "passive", level: number) {
  const row = TIER[kind];
  return row[Math.max(0, Math.min(row.length - 1, level - 1))];
}

function hexA(hex: string, a: number) {
  const n = Number.parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

function choiceFamily(c: Choice): "starter" | "weapon" | "passive" {
  if (c.kind === "passive" || c.kind === "passup") return "passive";
  if (c.id === "saber") return "starter";
  return "weapon";
}

function downloadBoard(text: string) {
  if (!text) return;
  const blob = new Blob([text], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "void-surge-board.txt";
  a.click();
  URL.revokeObjectURL(url);
}

type BoardFns = {
  onExport: () => void;
  onImport: (text: string) => void;
  onClear: () => void;
};

export function GameView() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<Game | null>(null);
  const [hud, setHud] = useState<Hud>(EMPTY);
  const [ready, setReady] = useState(false);
  const [touch, setTouch] = useState(false);
  const [guide, setGuide] = useState(false);

  useEffect(() => {
    const sync = () => {
      setTouch(window.matchMedia("(pointer: coarse)").matches || window.innerWidth < 720);
    };
    sync();
    window.addEventListener("resize", sync);
    const mq = window.matchMedia("(pointer: coarse)");
    mq.addEventListener("change", sync);
    const canvas = canvasRef.current;
    if (!canvas) {
      return () => {
        window.removeEventListener("resize", sync);
        mq.removeEventListener("change", sync);
      };
    }
    const game = new Game(canvas);
    gameRef.current = game;
    let live = true;
    void game.start().then(() => {
      if (!live) return;
      setReady(true);
    });
    const unsub = game.subscribe(setHud);
    const vis = () => game.audio.resume();
    document.addEventListener("visibilitychange", vis);
    return () => {
      live = false;
      unsub();
      window.removeEventListener("resize", sync);
      mq.removeEventListener("change", sync);
      document.removeEventListener("visibilitychange", vis);
      game.destroy();
      gameRef.current = null;
    };
  }, []);

  const begin = (name?: string) => {
    gameRef.current?.audio.unlock();
    gameRef.current?.beginRun(name ?? hud.pilot);
  };
  const retry = () => {
    gameRef.current?.audio.unlock();
    gameRef.current?.retry();
  };
  const mix = {
    muted: hud.muted,
    sfx: hud.sfxVol,
    music: hud.musicVol,
    onMute: () => {
      gameRef.current?.audio.unlock();
      gameRef.current?.setMuted(!hud.muted);
    },
    onSfx: (v: number) => {
      gameRef.current?.audio.unlock();
      gameRef.current?.setSfxVol(v);
    },
    onMusic: (v: number) => {
      gameRef.current?.audio.unlock();
      gameRef.current?.setMusicVol(v);
    },
  };

  return (
    <div className="relative h-dvh w-full overflow-hidden bg-bg text-fg">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 h-full w-full touch-none"
        style={{ touchAction: "none" }}
      />

      {hud.mode === "playing" || hud.mode === "paused" || hud.mode === "levelup" ? (
        <HudChrome hud={hud} onPause={() => gameRef.current?.togglePause()} />
      ) : null}

      {hud.banner && hud.mode === "over" ? (
        <div className="pointer-events-none absolute inset-x-0 top-[28%] z-20 flex justify-center px-3">
          <p className="banner-in font-mono text-xs tracking-[0.28em] text-ice">{hud.banner}</p>
        </div>
      ) : null}

      {hud.mode === "playing" && touch ? <Stick onVec={(x, y) => gameRef.current?.setStick(x, y)} /> : null}

      {hud.mode === "title" ? (
        <Title
          hud={hud}
          ready={ready}
          onBegin={begin}
          mix={mix}
          onPilot={(n) => gameRef.current?.setPilot(n)}
          onGuide={() => setGuide(true)}
          onExport={() => downloadBoard(gameRef.current?.exportBoard() ?? "")}
          onImport={(text) => gameRef.current?.importBoard(text)}
          onClear={() => gameRef.current?.clearBoard()}
        />
      ) : null}
      {hud.mode === "levelup" ? <LevelUp choices={hud.choices} onPick={(i) => gameRef.current?.choose(i)} /> : null}
      {hud.mode === "paused" ? (
        <PauseMenu
          mix={mix}
          onResume={() => gameRef.current?.togglePause()}
          onRetry={retry}
          onGuide={() => setGuide(true)}
          onHome={() => gameRef.current?.goHome()}
        />
      ) : null}
      {hud.mode === "over" ? (
        <Over
          hud={hud}
          onRetry={retry}
          onHome={() => gameRef.current?.goHome()}
          onExport={() => downloadBoard(gameRef.current?.exportBoard() ?? "")}
          onImport={(text) => gameRef.current?.importBoard(text)}
          onClear={() => gameRef.current?.clearBoard()}
        />
      ) : null}
      {guide ? <FieldGuide onClose={() => setGuide(false)} /> : null}
    </div>
  );
}

function HudChrome({ hud, onPause }: { hud: Hud; onPause: () => void }) {
  const hp = hud.maxHp <= 0 ? 0 : hud.hp / hud.maxHp;
  const xp = hud.xpNext <= 0 ? 0 : hud.xp / hud.xpNext;
  return (
    <div className="pointer-events-none absolute inset-0 z-10 p-3 pt-[max(12px,env(safe-area-inset-top))] sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center justify-between gap-2">
            <span className="truncate text-[11px] font-medium tracking-[0.16em] text-ice">{hud.pilot || "OPERATIVE"}</span>
            <span className="hud-num text-[11px] text-muted">
              {Math.ceil(hud.hp)}/{Math.ceil(hud.maxHp)}
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-surface-2">
            <div
              className="h-full rounded-full bg-fg transition-[width] duration-150"
              style={{ width: `${Math.max(0, Math.min(1, hp)) * 100}%`, background: hp < 0.28 ? "var(--color-danger)" : "var(--color-fg)" }}
            />
          </div>
        </div>
        <div className="flex flex-col items-center px-2">
          <span className="hud-num text-2xl font-medium tracking-tight sm:text-3xl">{fmtRemain(hud.time)}</span>
          <span className="hud-num text-[11px] text-ice">{fmtScore(hud.score)}</span>
          <span className="text-[10px] tracking-[0.22em] text-muted">INT {hud.intensity}/10</span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center justify-between gap-2">
            <span className="hud-num text-[11px] text-muted">LV {hud.level}</span>
            <span className="hud-num text-[11px] text-muted">
              {Math.floor(hud.xp)}/{Math.ceil(hud.xpNext)}
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-surface-2">
            <div className="h-full rounded-full bg-ice transition-[width] duration-150" style={{ width: `${Math.max(0, Math.min(1, xp)) * 100}%` }} />
          </div>
        </div>
      </div>

      {hud.bosses.length > 0 ? (
        <div className="mx-auto mt-2 flex w-full max-w-lg flex-col gap-1.5">
          {hud.bosses.map((b) => (
            <div key={b.name}>
              <div className="mb-1 flex items-center justify-between gap-2">
                <span className="truncate text-[10px] tracking-[0.2em]" style={{ color: b.color }}>
                  {b.name}
                </span>
                <span className="hud-num shrink-0 text-[10px] text-muted">
                  {Math.ceil(b.hp)}/{Math.ceil(b.max)}
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-surface-2">
                <div
                  className="h-full rounded-full transition-[width] duration-150"
                  style={{
                    width: `${Math.max(0, Math.min(1, b.hp / b.max)) * 100}%`,
                    background: b.color,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {hud.banner ? (
        <div className="mt-3 flex justify-center px-3">
          <p className="banner-in font-mono text-xs tracking-[0.28em] text-ice">{hud.banner}</p>
        </div>
      ) : null}

      <button
        type="button"
        data-hud-hit="pause"
        onClick={onPause}
        className="pointer-events-auto absolute right-3 bottom-[max(8px,env(safe-area-inset-bottom))] z-30 flex size-11 items-center justify-center rounded-md border border-border-strong bg-surface text-fg sm:right-5"
        aria-label="Pause"
      >
        <Pause className="size-4" />
      </button>

      <div className="absolute bottom-[max(8px,env(safe-area-inset-bottom))] left-3 right-16 grid grid-cols-7 gap-0.5 sm:left-5 sm:right-20 sm:gap-1">
        {hud.loadout.map((slot) => {
          const filled = slot.level > 0;
          const col = filled ? tierColor(slot.kind, slot.level) : undefined;
          return (
            <div
              key={slot.id}
              className={`flex h-11 min-w-0 flex-col items-center justify-center rounded-md border px-0.5 leading-none sm:px-1.5 ${
                filled ? "" : "border-dashed border-border bg-surface/30"
              }`}
              style={
                filled
                  ? {
                      borderColor: col,
                      background: hexA(col!, 0.16),
                      boxShadow: slot.level >= 4 ? `0 0 10px ${hexA(col!, 0.45)}` : undefined,
                    }
                  : undefined
              }
            >
              <div
                className="truncate text-[8px] tracking-[0.08em] sm:text-[9px] sm:tracking-[0.12em]"
                style={{ color: col ?? "var(--color-subtle)" }}
              >
                {slot.kind === "starter" ? "CORE" : slot.kind === "weapon" ? "ARM" : "MOD"}
              </div>
              <div className="mt-0.5 truncate text-[9px] tracking-[0.04em] text-fg sm:text-[10px] sm:tracking-[0.08em]">
                {filled ? slot.tag : "-"}
              </div>
              <div className="hud-num mt-0.5 text-[9px] sm:text-[10px]" style={{ color: col ?? "var(--color-muted)" }}>
                {filled ? `Mk ${slot.level}` : "\u00a0"}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Title({
  hud,
  ready,
  onBegin,
  mix,
  onPilot,
  onGuide,
  onExport,
  onImport,
  onClear,
}: {
  hud: Hud;
  ready: boolean;
  onBegin: (name?: string) => void;
  mix: MixProps;
  onPilot: (name: string) => void;
  onGuide: () => void;
} & BoardFns) {
  const [name, setName] = useState(hud.pilot);
  return (
    <div className="absolute inset-0 z-30 overflow-y-auto overscroll-y-contain bg-bg/50 px-5 py-6 text-center backdrop-blur-[2px]">
      <div className="mx-auto flex min-h-full w-full max-w-5xl flex-col justify-start pt-[max(0.5rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))] lg:justify-center lg:text-left">
      <div className="overlay-in flex w-full flex-col items-center gap-8 lg:flex-row lg:items-start">
        <div className="flex-1">
          <p className="mb-3 text-[11px] tracking-[0.32em] text-ice">STATION HELIX-9</p>
          <h1 className="text-4xl font-semibold tracking-[-0.04em] text-fg sm:text-6xl">
            VOID SURGE
            <span className="mt-1 block text-[0.42em] font-medium tracking-[0.22em] text-ice">SURVIVOR</span>
          </h1>
          <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-muted lg:mx-0">
            Helix-9 sat quiet on the edge of a dead sector until the Void Surge hit. The crew came back wrong. You dropped onto the extract pad while the last shuttle warms. The swarm is already in the walls. Hold the pad. Get out.
          </p>
          <div className="mx-auto mt-6 w-full max-w-md text-left lg:mx-0">
            <label className="block">
              <span className="text-[11px] tracking-[0.18em] text-muted">CALLSIGN</span>
              <input
                maxLength={14}
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  onPilot(e.target.value);
                }}
                className="mt-1 h-11 w-full rounded-md border border-border-strong bg-surface-2 px-3 font-mono text-sm text-fg outline-none focus-visible:border-ice"
                placeholder="OPERATIVE"
                aria-label="Callsign"
              />
            </label>
            <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
              <Button size="lg" onClick={() => onBegin(name)} disabled={!ready} className="w-full rounded-lg">
                <Rocket className="size-4" />
                {ready ? "Begin extraction" : "Calibrating…"}
              </Button>
              <Button type="button" variant="outline" size="lg" className="w-full rounded-lg" onClick={onGuide}>
                <BookOpen className="size-4" />
                Field manual
              </Button>
            </div>
          </div>
        </div>
        <div className="flex w-full max-w-lg flex-col gap-4">
          <Scoreboard runs={hud.board} best={hud.best.score} compact onExport={onExport} onImport={onImport} onClear={onClear} />
          <MixPanel mix={mix} />
        </div>
      </div>
      </div>
    </div>
  );
}

function LevelUp({ choices, onPick }: { choices: Choice[]; onPick: (i: number) => void }) {
  return (
    <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-bg/70 px-4 backdrop-blur-[2px]">
      <p className="mb-5 text-[11px] tracking-[0.28em] text-ice">SYSTEM UPGRADE</p>
      <div className="grid w-full max-w-3xl gap-3 sm:grid-cols-3">
        {choices.map((c, i) => {
          const family = choiceFamily(c);
          const col = tierColor(family, c.next);
          const label =
            c.kind === "weapon"
              ? "NEW ARM"
              : c.kind === "passive"
                ? "NEW MOD"
                : c.kind === "passup"
                  ? "MOD MK UP"
                  : c.id === "saber"
                    ? "CORE MK UP"
                    : "ARM MK UP";
          return (
            <button
              key={`${c.kind}-${c.title}-${i}`}
              type="button"
              onClick={() => onPick(i)}
              className="overlay-in rounded-xl border bg-surface p-4 text-left transition-colors duration-150 hover:bg-surface-2"
              style={{
                animationDelay: `${i * 40}ms`,
                borderColor: col,
                boxShadow: `inset 0 3px 0 ${col}, 0 0 18px ${hexA(col, 0.18)}`,
              }}
            >
              <div className="mb-3 flex items-center justify-between">
                <span className="hud-num text-xs" style={{ color: col }}>
                  {i + 1}
                </span>
                <span className="text-[10px] tracking-[0.16em]" style={{ color: col }}>
                  {label}
                </span>
              </div>
              <h3 className="text-base font-medium text-fg">{c.title}</h3>
              <p className="mt-1 hud-num text-[11px]" style={{ color: col }}>
                {family === "starter" ? "CORE" : family === "weapon" ? "ARM" : "MOD"} · Mk {c.next}
              </p>
              <p className="mt-2 text-sm leading-relaxed text-muted">{c.blurb}</p>
            </button>
          );
        })}
      </div>
      <p className="mt-4 text-xs text-subtle">Press 1 / 2 / 3</p>
    </div>
  );
}

function PauseMenu({
  mix,
  onResume,
  onRetry,
  onGuide,
  onHome,
}: {
  mix: MixProps;
  onResume: () => void;
  onRetry: () => void;
  onGuide: () => void;
  onHome: () => void;
}) {
  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-bg/70 px-6 backdrop-blur-[2px]">
      <div className="overlay-in w-full max-w-sm rounded-xl border border-border bg-surface p-6">
        <h2 className="text-xl font-medium tracking-tight">Paused</h2>
        <p className="mt-1 text-sm text-muted">The clock is frozen.</p>
        <div className="mt-5">
          <MixPanel mix={mix} />
        </div>
        <div className="mt-5 flex flex-col gap-2">
          <Button onClick={onResume} className="w-full rounded-lg">
            <Play className="size-4" />
            Resume
          </Button>
          <Button variant="outline" onClick={onGuide} className="w-full rounded-lg">
            <BookOpen className="size-4" />
            Field manual
          </Button>
          <Button variant="outline" onClick={onHome} className="w-full rounded-lg">
            <Home className="size-4" />
            Home
          </Button>
          <Button variant="ghost" onClick={onRetry} className="w-full rounded-lg">
            Restart run
          </Button>
        </div>
      </div>
    </div>
  );
}

type MixProps = {
  muted: boolean;
  sfx: number;
  music: number;
  onMute: () => void;
  onSfx: (v: number) => void;
  onMusic: (v: number) => void;
};

function MixPanel({ mix }: { mix: MixProps }) {
  return (
    <div className="rounded-lg border border-border bg-surface-2/60 p-3 text-left">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-[11px] tracking-[0.18em] text-muted">AUDIO</p>
        <button
          type="button"
          onClick={mix.onMute}
          className="flex h-11 items-center gap-2 rounded-md px-2 text-xs text-fg"
          aria-label={mix.muted ? "Unmute" : "Mute"}
        >
          {mix.muted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
          {mix.muted ? "Muted" : "Live"}
        </button>
      </div>
      <MixSlider label="Music" value={mix.music} onChange={mix.onMusic} />
      <MixSlider label="Sounds" value={mix.sfx} onChange={mix.onSfx} />
    </div>
  );
}

function MixSlider({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  const pct = Math.round(value * 100);
  return (
    <label className="block">
      <div className="flex items-center justify-between text-[11px]">
        <span className="text-muted">{label}</span>
        <span className="hud-num text-fg">{pct}</span>
      </div>
      <input
        type="range"
        min={0}
        max={100}
        step={1}
        value={pct}
        onChange={(e) => onChange(Number(e.target.value) / 100)}
        className="mix-range"
        aria-label={label}
      />
    </label>
  );
}

function Over({
  hud,
  onRetry,
  onHome,
  onExport,
  onImport,
  onClear,
}: { hud: Hud; onRetry: () => void; onHome: () => void } & BoardFns) {
  return (
    <div className={`absolute inset-0 z-30 flex items-center justify-center px-4 py-6 backdrop-blur-[2px] ${hud.won ? "bg-bg/75" : "bg-danger/20"}`}>
      <div className="overlay-in w-full max-w-lg rounded-xl border border-border bg-surface p-5 text-center sm:p-6">
        <p className="text-[11px] tracking-[0.28em] text-ice">{hud.won ? "DROPZONE SECURE" : "SIGNAL LOST"}</p>
        <h2 className="mt-2 text-2xl font-medium tracking-tight">{hud.won ? "Extraction complete" : "Operative down"}</h2>
        <p className="mt-2 font-mono text-sm tracking-[0.14em] text-ice">{hud.pilot}</p>
        <p className="hud-num mt-4 text-4xl text-ice">{fmtScore(hud.score)}</p>
        <p className="mt-1 text-[10px] tracking-[0.18em] text-subtle">KILL SCORE</p>
        <dl className="mt-5 grid grid-cols-3 gap-3 text-center">
          <Stat label="Survived" value={fmtBest(hud.time)} />
          <Stat label="Kills" value={String(hud.kills)} />
          <Stat label="Level" value={String(hud.level)} />
        </dl>
        <div className="mt-5">
          <Scoreboard runs={hud.board} best={hud.best.score} onExport={onExport} onImport={onImport} onClear={onClear} />
        </div>
        <div className="mt-5 grid grid-cols-2 gap-2">
          <Button type="button" variant="outline" className="w-full rounded-lg" size="lg" onClick={onHome}>
            Home
          </Button>
          <Button type="button" className="w-full rounded-lg" size="lg" onClick={onRetry}>
            Deploy again
          </Button>
        </div>
      </div>
    </div>
  );
}

function Scoreboard({
  runs,
  best,
  compact,
  onExport,
  onImport,
  onClear,
}: {
  runs: RunEntry[];
  best: number;
  compact?: boolean;
} & Partial<BoardFns>) {
  const fileRef = useRef<HTMLInputElement>(null);
  const rows = [...runs].sort((a, b) => b.score - a.score || b.at - a.at).slice(0, compact ? 6 : 10);
  return (
    <div className={`w-full ${compact ? "max-w-lg rounded-xl border border-border bg-surface/90 p-4 text-left" : "text-left"}`}>
      <div className="mb-2 flex items-baseline justify-between">
        <h3 className="text-[11px] tracking-[0.2em] text-muted">SCOREBOARD</h3>
        {best > 0 ? <span className="hud-num text-[11px] text-ice">BEST {fmtScore(best)}</span> : null}
      </div>
      <table className="w-full table-fixed border-collapse text-sm">
        <thead>
          <tr className="text-[10px] tracking-[0.12em] text-muted">
            <th className="w-8 py-1.5 pr-2 font-medium">#</th>
            <th className="py-1.5 pr-2 text-left font-medium">Name</th>
            <th className="w-[4.5rem] py-1.5 pr-2 text-right font-medium">Score</th>
            <th className="w-14 py-1.5 pr-2 text-right font-medium">Time</th>
            <th className="w-12 py-1.5 text-right font-medium">Kills</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr className="border-t border-border/70">
              <td colSpan={5} className="py-3 text-sm text-subtle">
                No runs yet. First extraction writes the board.
              </td>
            </tr>
          ) : (
            rows.map((r, i) => (
              <tr key={`${r.at}-${i}`} className="border-t border-border/70">
                <td className="hud-num py-1.5 pr-2 text-subtle">{i + 1}</td>
                <td className="min-w-0 truncate py-1.5 pr-2 text-fg">
                  {r.name || "OPERATIVE"}
                  {r.won ? <span className="ml-1.5 text-[9px] tracking-[0.12em] text-ice">EXT</span> : null}
                </td>
                <td className="hud-num py-1.5 pr-2 text-right text-ice">{fmtScore(r.score)}</td>
                <td className="hud-num py-1.5 pr-2 text-right text-muted">{fmtBest(r.time)}</td>
                <td className="hud-num py-1.5 text-right text-muted">{r.kills}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
      {onExport && onImport && onClear ? (
        <div className="relative mt-3">
          <input
            ref={fileRef}
            type="file"
            accept=".txt,text/plain"
            className="pointer-events-none absolute h-0 w-0 opacity-0"
            tabIndex={-1}
            aria-label="Import scoreboard"
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (!file) return;
              void file.text().then((t) => onImport(t));
            }}
          />
          <div className="grid grid-cols-3 gap-2">
            <Button type="button" variant="outline" size="sm" className="w-full min-w-0 px-1" onClick={onExport}>
              Export
            </Button>
            <Button type="button" variant="outline" size="sm" className="w-full min-w-0 px-1" onClick={() => fileRef.current?.click()}>
              Import
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full min-w-0 px-1"
              onClick={() => {
                if (window.confirm("Clear the scoreboard and local run history?")) onClear();
              }}
            >
              Clear
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-surface-2 px-2 py-3">
      <dt className="text-[10px] tracking-[0.16em] text-subtle">{label}</dt>
      <dd className="hud-num mt-1 text-lg text-fg">{value}</dd>
    </div>
  );
}

function Stick({ onVec }: { onVec: (x: number, y: number) => void }) {
  const origin = useRef<{ id: number; x: number; y: number } | null>(null);
  const [pos, setPos] = useState<{ x: number; y: number; kx: number; ky: number } | null>(null);

  const end = useCallback(
    (id: number) => {
      if (origin.current?.id !== id) return;
      origin.current = null;
      setPos(null);
      onVec(0, 0);
    },
    [onVec],
  );

  return (
    <div
      className="absolute inset-0 z-[5] touch-none"
      style={{ touchAction: "none" }}
      onPointerDown={(e) => {
        if (origin.current) return;
        const hit = document.elementFromPoint(e.clientX, e.clientY);
        if (hit?.closest("[data-hud-hit]")) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        origin.current = { id: e.pointerId, x, y };
        setPos({ x, y, kx: 0, ky: 0 });
        e.currentTarget.setPointerCapture(e.pointerId);
      }}
      onPointerMove={(e) => {
        const o = origin.current;
        if (!o || o.id !== e.pointerId) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const dx = e.clientX - rect.left - o.x;
        const dy = e.clientY - rect.top - o.y;
        const max = 46;
        const len = Math.hypot(dx, dy);
        const s = len > max ? max / len : 1;
        const kx = dx * s;
        const ky = dy * s;
        setPos({ x: o.x, y: o.y, kx, ky });
        onVec(kx / max, ky / max);
      }}
      onPointerUp={(e) => end(e.pointerId)}
      onPointerCancel={(e) => end(e.pointerId)}
    >
      {pos ? (
        <div
          className="pointer-events-none absolute size-[92px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-border-strong bg-surface/40"
          style={{ left: pos.x, top: pos.y }}
        >
          <div
            className="absolute left-1/2 top-1/2 size-11 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent/90"
            style={{ transform: `translate(calc(-50% + ${pos.kx}px), calc(-50% + ${pos.ky}px))` }}
          />
        </div>
      ) : null}
    </div>
  );
}
