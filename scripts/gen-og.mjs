// Generates a branded 1200×630 Open Graph card for every project page.
// Runs LOCALLY (needs Chrome) — outputs are committed to public/og/ so the
// Cloudflare build never needs a browser. Re-run after adding a project:
//   node scripts/gen-og.mjs
import { mkdirSync, writeFileSync, rmSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import { PAGES } from "./gen-pages.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const OUT = resolve(ROOT, "public", "og");
const TMP = resolve(ROOT, ".og-tmp");

const ACCENT = {
  "AI / ML": ["#b06bff", "176,107,255"],
  Software: ["#2af5ff", "42,245,255"],
  Games: ["#7cff8b", "124,255,139"],
  Web: ["#6bb8ff", "107,184,255"],
  Writing: ["#ffc35e", "255,195,94"],
};

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;");

const card = (p) => {
  const [hex, rgb] = ACCENT[p.category] || ACCENT.Software;
  const title = esc(p.title);
  const size = title.length > 26 ? 64 : title.length > 14 ? 84 : 104;
  const sub = esc(p.sub.length > 150 ? p.sub.slice(0, 147).trimEnd() + "…" : p.sub);
  const sans = resolve(ROOT, "public/fonts/space-grotesk-latin.woff2");
  const mono = resolve(ROOT, "public/fonts/jetbrains-mono-latin.woff2");
  return `<!doctype html><html><head><meta charset="utf-8"><style>
    @font-face { font-family: SG; src: url("file://${sans}") format("woff2"); font-weight: 300 700; }
    @font-face { font-family: JB; src: url("file://${mono}") format("woff2"); font-weight: 400 700; }
    * { margin: 0; box-sizing: border-box; }
    body {
      width: 1200px; height: 630px; overflow: hidden; position: relative;
      display: flex; flex-direction: column; justify-content: space-between;
      padding: 64px 72px 56px;
      background:
        radial-gradient(58% 78% at 84% 6%, rgba(${rgb},0.20), transparent 65%),
        radial-gradient(45% 60% at 8% 100%, rgba(45,60,130,0.35), transparent 70%),
        #04060a;
      font-family: SG, sans-serif; color: #e8f0ff;
    }
    body::before {
      content: ""; position: absolute; inset: 0;
      background:
        repeating-linear-gradient(0deg, transparent 0 59px, rgba(120,150,220,0.055) 59px 60px),
        repeating-linear-gradient(90deg, transparent 0 59px, rgba(120,150,220,0.055) 59px 60px);
    }
    body::after {
      content: ""; position: absolute; left: 0; right: 0; top: 0; height: 5px;
      background: linear-gradient(90deg, ${hex}, transparent 70%);
    }
    .eyebrow { font-family: JB, monospace; font-size: 21px; letter-spacing: 0.28em; color: #72829a; text-transform: uppercase; }
    .eyebrow b { color: ${hex}; font-weight: 500; }
    .mid { position: relative; }
    h1 { font-size: ${size}px; font-weight: 600; letter-spacing: -0.015em; line-height: 1.04; margin-bottom: 26px; max-width: 1020px; }
    .sub { font-size: 27px; line-height: 1.5; color: #8aa0c0; max-width: 940px; font-weight: 300; }
    .foot { position: relative; display: flex; justify-content: space-between; align-items: center; font-family: JB, monospace; }
    .url { font-size: 22px; color: #72829a; }
    .url b { color: #e8f0ff; font-weight: 500; }
    .chip { font-size: 19px; letter-spacing: 0.16em; text-transform: uppercase; color: ${hex}; border: 2px solid rgba(${rgb},0.45); border-radius: 999px; padding: 10px 26px; background: rgba(${rgb},0.07); }
  </style></head><body>
    <div class="eyebrow"><b>MILAD FARAZIAN</b> · SELECTED WORK</div>
    <div class="mid"><h1>${title}</h1><div class="sub">${sub}</div></div>
    <div class="foot"><div class="url">farazian.com<b>/work/${p.slug}/</b></div><div class="chip">${esc(p.category)} · ${p.year}</div></div>
  </body></html>`;
};

mkdirSync(OUT, { recursive: true });
mkdirSync(TMP, { recursive: true });
for (const p of PAGES) {
  const html = resolve(TMP, `${p.slug}.html`);
  writeFileSync(html, card(p));
  execFileSync(CHROME, [
    "--headless=new", "--disable-gpu", "--force-device-scale-factor=1",
    "--window-size=1200,630", "--hide-scrollbars", "--default-background-color=04060aff",
    `--screenshot=${resolve(OUT, `${p.slug}.png`)}`, `file://${html}`,
  ], { stdio: "pipe" });
  console.log(`og/${p.slug}.png`);
}
rmSync(TMP, { recursive: true, force: true });
console.log(`\n${PAGES.length} OG cards generated.`);
