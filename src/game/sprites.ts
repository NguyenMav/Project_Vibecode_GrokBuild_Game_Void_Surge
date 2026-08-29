export type Sheet = {
  img: HTMLImageElement;
  rows: number;
  cols: number;
  fw: number;
  fh: number;
};

export type Atlas = {
  player: Sheet | null;
  crawler: Sheet | null;
  brute: Sheet | null;
  spitter: Sheet | null;
  elite: Sheet | null;
  hearth: Sheet | null;
  hydra: Sheet | null;
  colossus: Sheet | null;
  specter: Sheet | null;
  crown: Sheet | null;
  gem: Sheet | null;
  medkit: Sheet | null;
  floor: HTMLImageElement | null;
};

function loadImg(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function sheet(img: HTMLImageElement | null, rows: number, cols: number): Sheet | null {
  if (!img) return null;
  return { img, rows, cols, fw: img.width / cols, fh: img.height / rows };
}

export async function loadAtlas(): Promise<Atlas> {
  const [player, crawler, brute, spitter, elite, hearth, hydra, colossus, specter, crown, gem, medkit, floor] =
    await Promise.all([
      loadImg("/sprites/player.png"),
      loadImg("/sprites/crawler.png"),
      loadImg("/sprites/brute.png"),
      loadImg("/sprites/spitter.png"),
      loadImg("/sprites/elite.png"),
      loadImg("/sprites/hearth.png"),
      loadImg("/sprites/hydra.png"),
      loadImg("/sprites/colossus.png"),
      loadImg("/sprites/specter.png"),
      loadImg("/sprites/crown.png"),
      loadImg("/sprites/gem.png"),
      loadImg("/sprites/medkit.png"),
      loadImg("/sprites/floor.png"),
    ]);
  return {
    player: sheet(player, 4, 4),
    crawler: sheet(crawler, 2, 2),
    brute: sheet(brute, 2, 2),
    spitter: sheet(spitter, 2, 2),
    elite: sheet(elite, 2, 2),
    hearth: sheet(hearth, 1, 1),
    hydra: sheet(hydra, 1, 1),
    colossus: sheet(colossus, 1, 1),
    specter: sheet(specter, 1, 1),
    crown: sheet(crown, 1, 1),
    gem: sheet(gem, 2, 2),
    medkit: sheet(medkit, 1, 1),
    floor,
  };
}

export function drawSheet(
  ctx: CanvasRenderingContext2D,
  s: Sheet,
  frame: number,
  x: number,
  y: number,
  size: number,
  flipX = false,
  alpha = 1,
) {
  const col = frame % s.cols;
  const row = Math.floor(frame / s.cols) % s.rows;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(x, y);
  if (flipX) ctx.scale(-1, 1);
  ctx.drawImage(s.img, col * s.fw, row * s.fh, s.fw, s.fh, -size / 2, -size / 2, size, size);
  ctx.restore();
}
