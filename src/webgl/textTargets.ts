// Rasterize text to an offscreen canvas, sample its pixels, and map them into
// 3D world-space target positions for the particle formation.

export interface TextTargetOptions {
  text: string;
  count: number; // number of particles (simSize * simSize)
  worldWidth: number; // how wide the formation should be, in world units
  twoLines?: boolean; // stack words on two lines (good for narrow viewports)
}

export function buildTextTargets(opts: TextTargetOptions): Float32Array {
  const { text, count, worldWidth, twoLines } = opts;

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d")!;

  // High-res raster so we get plenty of sample points.
  const W = 1024;
  const H = twoLines ? 512 : 320;
  canvas.width = W;
  canvas.height = H;

  const lines = twoLines ? text.split(" ") : [text];
  const setFont = (px: number) =>
    (ctx.font = `700 ${px}px "Space Grotesk", system-ui, sans-serif`);

  // Auto-fit: shrink the font until the widest line fits the raster with margin,
  // so long names like "MILAD FARAZIAN" are never clipped off the canvas.
  let fontSize = twoLines ? 170 : 190;
  setFont(fontSize);
  const maxW = W * 0.92;
  const widest = Math.max(...lines.map((l) => ctx.measureText(l).width));
  if (widest > maxW) {
    fontSize = Math.floor(fontSize * (maxW / widest));
    setFont(fontSize);
  }
  const lineGap = fontSize * 1.08;

  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = "#fff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  if (twoLines && lines.length > 1) {
    ctx.fillText(lines[0], W / 2, H / 2 - lineGap / 2);
    ctx.fillText(lines.slice(1).join(" "), W / 2, H / 2 + lineGap / 2);
  } else {
    ctx.fillText(text, W / 2, H / 2);
  }

  const img = ctx.getImageData(0, 0, W, H).data;

  // Collect lit pixels.
  const pts: Array<[number, number]> = [];
  const step = 2; // sampling stride — lower = denser
  for (let y = 0; y < H; y += step) {
    for (let x = 0; x < W; x += step) {
      const a = img[(y * W + x) * 4]; // red channel (text is white)
      if (a > 130) pts.push([x, y]);
    }
  }

  // Deterministic shuffle so the formation looks organic but is stable.
  let s = 9301;
  const rand = () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
  for (let i = pts.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [pts[i], pts[j]] = [pts[j], pts[i]];
  }

  const worldHeight = (worldWidth * H) / W;
  const out = new Float32Array(count * 3);

  if (pts.length === 0) {
    // Fallback: scatter on a disc.
    for (let i = 0; i < count; i++) {
      const ang = rand() * Math.PI * 2;
      const r = Math.sqrt(rand()) * worldWidth * 0.4;
      out[i * 3] = Math.cos(ang) * r;
      out[i * 3 + 1] = Math.sin(ang) * r;
      out[i * 3 + 2] = (rand() - 0.5) * 0.3;
    }
    return out;
  }

  for (let i = 0; i < count; i++) {
    const [px, py] = pts[i % pts.length];
    // Map pixel space → centered world space.
    const wx = (px / W - 0.5) * worldWidth;
    const wy = -(py / H - 0.5) * worldHeight;
    // Jitter so wrapped duplicates don't stack perfectly.
    const jx = (rand() - 0.5) * (worldWidth / W) * step * 1.4;
    const jy = (rand() - 0.5) * (worldHeight / H) * step * 1.4;
    out[i * 3] = wx + jx;
    out[i * 3 + 1] = wy + jy;
    out[i * 3 + 2] = (rand() - 0.5) * 0.35;
  }

  return out;
}
