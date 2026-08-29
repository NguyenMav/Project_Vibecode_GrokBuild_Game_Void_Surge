import { X } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { ENEMY, PASSIVES, PASSIVE_IDS, STARTER_ID, WEAPON, WEAPON_IDS } from "@/game/config";

export function FieldGuide({ onClose }: { onClose: () => void }) {
  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-bg/80 px-3 py-6 backdrop-blur-[3px]">
      <div className="overlay-in flex max-h-[min(40rem,92dvh)] w-full max-w-3xl flex-col rounded-xl border border-border bg-surface">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <p className="text-[11px] tracking-[0.28em] text-ice">ORBITAL BRIEF</p>
            <h2 className="mt-1 text-xl font-medium tracking-tight">Field Manual</h2>
          </div>
          <Button type="button" variant="ghost" className="size-11 rounded-md p-0" onClick={onClose} aria-label="Close guide">
            <X className="size-4" />
          </Button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 text-left">
          <Section title="How to play">
            <ul className="space-y-2 text-sm leading-relaxed text-muted">
              <li>Move with WASD, or drag anywhere on a phone. Miss the pause button.</li>
              <li>Weapons fire on their own. You only steer.</li>
              <li>Level-ups pause the clock. Press 1 / 2 / 3 or tap a card.</li>
              <li>Loadout cap: 1 CORE, 3 ARMs, 3 MODs. Each ranks to Mk 5.</li>
              <li>Walk into a gold vacuum after a boss. If you wait, it still pulls every gem on the map.</li>
              <li>Off-screen bosses show an arrow in their bar color.</li>
            </ul>
          </Section>

          <Section title="The clock">
            <p className="text-sm leading-relaxed text-muted">
              Ten minutes to extract. Intensity climbs every minute. Unique bosses land at 2:00, 4:00, 6:00 and 8:00. They stack if the last one is still up. In the final minute, spawn rate doubles every ten seconds. Score is kills only. Each kill is worth more every two minutes.
            </p>
          </Section>

          <Section title="Core">
            <GearCard
              tag="CORE"
              name={WEAPON[STARTER_ID].name}
              blurb={WEAPON[STARTER_ID].blurb}
              up={WEAPON[STARTER_ID].up}
              color="var(--color-ice)"
            />
          </Section>

          <Section title="Arms">
            <div className="grid gap-2 sm:grid-cols-2">
              {WEAPON_IDS.map((id) => (
                <GearCard key={id} tag="ARM" name={WEAPON[id].name} blurb={WEAPON[id].blurb} up={WEAPON[id].up} color="var(--color-ember)" />
              ))}
            </div>
          </Section>

          <Section title="Mods">
            <p className="mb-2 text-sm text-muted">Each rank is +5%, except Bait Signal at +10%. Split Chamber is +1 shot, +2 at Mk 5.</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {PASSIVE_IDS.map((id) => (
                <GearCard key={id} tag="MOD" name={PASSIVES[id].name} blurb={PASSIVES[id].blurb} up={PASSIVES[id].up} color="#c9a0ff" />
              ))}
            </div>
          </Section>

          <Section title="Swarm">
            <div className="grid gap-2 sm:grid-cols-2">
              {(["crawler", "brute", "spitter", "elite"] as const).map((id) => (
                <GearCard key={id} tag="MOB" name={id} blurb={ENEMY[id].blurb} color="var(--color-fg)" />
              ))}
            </div>
          </Section>

          <Section title="Bosses">
            <p className="mb-2 text-sm text-muted">They stack if the previous titan is still standing.</p>
            <div className="grid gap-2">
              {(["hearth", "hydra", "colossus", "specter"] as const).map((id) => (
                <GearCard
                  key={id}
                  tag={id === "hearth" ? "2:00" : id === "hydra" ? "4:00" : id === "colossus" ? "6:00" : "8:00"}
                  name={ENEMY[id].name}
                  blurb={ENEMY[id].blurb}
                  color={ENEMY[id].color}
                />
              ))}
            </div>
          </Section>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mb-6 last:mb-1">
      <h3 className="mb-2 text-[11px] tracking-[0.2em] text-muted">{title.toUpperCase()}</h3>
      {children}
    </section>
  );
}

function GearCard({
  tag,
  name,
  blurb,
  up,
  color,
}: {
  tag: string;
  name: string;
  blurb: string;
  up?: string;
  color: string;
}) {
  return (
    <article className="rounded-md border border-border bg-surface-2/70 px-3 py-2.5">
      <div className="mb-1 flex items-center justify-between gap-2">
        <span className="text-[10px] tracking-[0.16em]" style={{ color }}>
          {tag}
        </span>
      </div>
      <h4 className="text-sm font-medium capitalize text-fg">{name}</h4>
      <p className="mt-1 text-sm leading-relaxed text-muted">{blurb}</p>
      {up ? <p className="mt-1 text-xs text-subtle">{up}</p> : null}
    </article>
  );
}
