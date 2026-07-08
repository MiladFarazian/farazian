// Generates the cohesive /work/<slug>/index.html project pages from data.
// Run via the "prebuild" npm hook (and committed for dev). Single source of
// truth for project-page content.
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const esc = (s) =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// JSON-LD for a project page. JSON.stringify handles quote escaping; we only
// need to neutralize any "</script>" sequence inside the data.
const jsonLd = (p) =>
  JSON.stringify({
    "@context": "https://schema.org",
    "@type": "CreativeWork",
    name: p.title,
    description: p.sub,
    url: `https://farazian.com/work/${p.slug}/`,
    image: "https://farazian.com/og.png",
    author: { "@type": "Person", name: "Milad Farazian", url: "https://farazian.com/" },
  }).replace(/</g, "\\u003c");

// ---- block renderers ----
const figure = ({ src, title, caption }) =>
  `<figure class="proj-figure" data-reveal><img src="${src}" alt="${title || ""}" loading="lazy" />` +
  (title || caption
    ? `<figcaption>${title ? `<b>${title}</b>` : "<span></span>"}${caption ? `<span>${caption}</span>` : ""}</figcaption>`
    : "") +
  `</figure>`;

const renderBlock = (b) => {
  switch (b.t) {
    case "text":
      return `<section class="proj__section" data-reveal>${b.h ? `<h2>${b.h}</h2>` : ""}${b.html}</section>`;
    case "figure":
      return `<section class="proj__section">${b.h ? `<h2 data-reveal>${b.h}</h2>` : ""}${b.html ? `<div data-reveal>${b.html}</div>` : ""}${figure(b)}</section>`;
    case "gallery":
      return `<section class="proj__section">${b.h ? `<h2 data-reveal>${b.h}</h2>` : ""}<div class="proj-gallery">${b.items.map(figure).join("")}</div></section>`;
    case "shots":
      return `<section class="proj__section">${b.h ? `<h2 data-reveal>${b.h}</h2>` : ""}<div class="proj-shots" data-reveal>${b.items
        .map((s) => `<figure><img src="${s.src}" alt="${s.title || ""}" loading="lazy" />${s.title ? `<figcaption>${s.title}</figcaption>` : ""}</figure>`)
        .join("")}</div>${b.note ? `<p class="proj-note">${b.note}</p>` : ""}</section>`;
    case "features":
      return `<section class="proj__section" data-reveal><h2>${b.h}</h2><div class="proj-features">${b.items
        .map((f) => `<div class="proj-feature"><h3>${f.title}</h3><p>${f.desc}</p></div>`)
        .join("")}</div></section>`;
    case "code":
      return `<section class="proj__section" data-reveal><h2>${b.h}</h2><div class="proj-code"><div class="proj-code__bar"><i></i><i></i><i></i><span>${b.file}</span></div><pre>${esc(b.code)}</pre></div></section>`;
    case "embed":
      return `<section class="proj__section">${b.h ? `<h2 data-reveal>${b.h}</h2>` : ""}<div class="proj-embed" data-reveal>${b.html}</div></section>`;
    case "game":
      return `<section class="proj__section" data-reveal><div class="proj-game"${b.ratio ? ` style="aspect-ratio:${b.ratio}"` : ""}><iframe src="${b.src}" title="${b.title || ""}" loading="lazy" allow="autoplay; fullscreen"></iframe></div>${b.note ? `<p class="proj-note">${b.note}</p>` : ""}</section>`;
    case "controls":
      return `<section class="proj__section" data-reveal><h2>Controls</h2><div class="proj-controls">${b.items
        .map((c) => `<div class="proj-control"><kbd>${c.key}</kbd><span>${c.label}</span></div>`)
        .join("")}</div></section>`;
    case "raw":
      return b.html;
    default:
      return "";
  }
};

const linkBtn = (l) =>
  `<a class="btn btn--ghost" href="${l.href}"${l.internal ? "" : ' target="_blank" rel="noopener"'} data-magnetic data-scramble>${l.label}${l.internal ? "" : " ↗"}</a>`;

const page = (p) => {
  const hero = `<section class="proj__hero">
      ${p.icon ? `<img class="proj-appicon" src="${p.icon}" alt="${p.title} icon" data-reveal />` : ""}
      <p class="proj__eyebrow" data-reveal>${p.category} · ${p.year}</p>
      <h1 class="proj__title" data-reveal>${p.title}</h1>
      <p class="proj__sub" data-reveal>${p.sub}</p>
      ${p.meta ? `<p class="proj__meta" data-reveal>${p.meta}</p>` : ""}
      <div class="proj__tags" data-reveal>${p.tags.map((t) => `<span class="tag">${t}</span>`).join("")}</div>
      ${p.links?.length ? `<div class="proj__links" data-reveal>${p.links.map(linkBtn).join("")}</div>` : ""}
    </section>`;

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
    <meta name="theme-color" content="#04060a" />
    <title>${p.title} — Milad Farazian</title>
    <meta name="description" content="${esc(p.sub)}" />
    <link rel="canonical" href="https://farazian.com/work/${p.slug}/" />
    <meta property="og:type" content="article" />
    <meta property="og:site_name" content="Milad Farazian" />
    <meta property="og:title" content="${esc(p.title)} — Milad Farazian" />
    <meta property="og:description" content="${esc(p.sub)}" />
    <meta property="og:url" content="https://farazian.com/work/${p.slug}/" />
    <meta property="og:image" content="https://farazian.com/og.png" />
    <meta property="og:image:width" content="2400" />
    <meta property="og:image:height" content="1260" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${esc(p.title)} — Milad Farazian" />
    <meta name="twitter:description" content="${esc(p.sub)}" />
    <meta name="twitter:image" content="https://farazian.com/og.png" />
    <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
    <link rel="apple-touch-icon" href="/icon-180.png" />
    <link rel="manifest" href="/site.webmanifest" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;700&display=swap" rel="stylesheet" />
    <script type="application/ld+json">${jsonLd(p)}</script>
  </head>
  <body>
    <a class="skip-link" href="#content">Skip to content</a>
    <div class="cursor" id="cursor" aria-hidden="true"><div class="cursor__dot"></div><div class="cursor__ring"></div></div>
    <div class="fx-overlay" aria-hidden="true"></div>
    <header class="nav">
      <a class="nav__brand" href="/" data-magnetic><span class="nav__brand-mark">MF</span></a>
      <a class="nav__back" href="/#work" data-magnetic data-scramble><span class="arrow">←</span> all work</a>
    </header>
    <main class="proj" id="content" tabindex="-1">
      ${hero}
      ${p.blocks.map(renderBlock).join("\n      ")}
      <footer class="footer">
        <span>© <span id="year">2026</span> Milad Farazian</span>
        <a href="/#work" data-scramble>← back to work</a>
      </footer>
    </main>
    <script type="module" src="/src/project/main.ts"></script>
  </body>
</html>
`;
};

// ============================================================
// PAGE CONTENT
// ============================================================
const RT_CODE = `// For each pixel, cast a ray into the scene and shade what it hits.
Vec3 trace(const Ray& ray, int depth) {
    if (depth >= MAX_DEPTH) return background(ray);

    HitRecord rec;
    if (!scene.hit(ray, BIAS, 1e9, rec)) return background(ray);

    Vec3 color = rec.material.color * ambient;

    for (const auto& light : lights) {
        // Shadow ray — skip this light if the point is occluded.
        Ray shadow(rec.point, light.dir);
        if (scene.hit(shadow, BIAS, light.dist)) continue;

        // Blinn-Phong: diffuse + specular contribution.
        color += diffuse(rec, light) + specular(rec, light);
    }

    // Recursive mirror reflection.
    if (rec.material.reflectivity > 0.0f) {
        Ray refl(rec.point, reflect(ray.dir, rec.normal));
        color += trace(refl, depth + 1) * rec.material.reflectivity;
    }
    return color;
}`;

const RT_DEMO = `<section class="proj__section" data-reveal>
        <h2>Interactive Demo</h2>
        <p>Drag to orbit the camera. This real-time ray tracer runs entirely in your browser, implementing the same algorithms as the C++ version above.</p>
        <div class="rt-demo" data-demo="raytracer">
          <div class="rt-stage"><canvas id="rt-canvas" width="480" height="270"></canvas></div>
          <div class="rt-controls">
            <button id="btn-add" class="demo-btn">Add Sphere</button>
            <button id="btn-remove" class="demo-btn">Remove</button>
            <button id="btn-reset" class="demo-btn">Reset</button>
            <div class="rt-swatches">
              <button class="swatch" data-color="0.85,0.15,0.1" style="background:#d92619" title="Red"></button>
              <button class="swatch" data-color="0.1,0.3,0.85" style="background:#1a4dd9" title="Blue"></button>
              <button class="swatch" data-color="0.15,0.7,0.2" style="background:#26b333" title="Green"></button>
              <button class="swatch" data-color="0.85,0.65,0.1" style="background:#d9a619" title="Gold"></button>
              <button class="swatch active" data-color="0.7,0.2,0.8" style="background:#b333cc" title="Purple"></button>
            </div>
          </div>
          <p class="proj-note">Renders at 480×270 with progressive refinement. Reflections limited to 3 bounces for real-time performance.</p>
        </div>
      </section>`;

const LMBIS_DEMO = `<section class="proj__section" data-reveal>
        <h2>See it segment</h2>
        <p>Drag across the retina to reveal what the network traced — every vessel it found in a raw CHASE_DB1 fundus photograph. Then switch to the expert's hand-labeled ground truth to see how close it got.</p>
        <div class="lmbis-demo" id="lmbis-demo" data-demo="lmbis-net">
          <div class="lmbis-stage" id="lmbis-stage" data-accent="cyan">
            <img class="lmbis-img lmbis-base" src="lmbis-input.png" alt="Raw retinal fundus photograph" draggable="false" />
            <div class="lmbis-reveal">
              <img class="lmbis-img" src="lmbis-input.png" alt="" draggable="false" />
              <img class="lmbis-img lmbis-overlay" id="lmbis-overlay" src="lmbis-pred-overlay.png" alt="AI vessels" draggable="false" />
            </div>
            <div class="lmbis-divider" id="lmbis-divider"><span class="lmbis-handle">⟷</span></div>
            <span class="lmbis-tag lmbis-tag--l">retina</span>
            <span class="lmbis-tag lmbis-tag--r" id="lmbis-tag-r">AI vessels</span>
          </div>
          <div class="lmbis-toggle" role="group" aria-label="Overlay source">
            <button class="lmbis-btn is-active" data-src="lmbis-pred-overlay.png" data-accent="cyan" data-label="AI vessels" aria-pressed="true">Prediction</button>
            <button class="lmbis-btn" data-src="lmbis-gt-overlay.png" data-accent="violet" data-label="Ground truth" aria-pressed="false">Ground truth</button>
          </div>
          <p class="proj-note">A held-out CHASE_DB1 image — the model's own output, overlaid on the source photograph. Cyan is the network's prediction; violet is the expert label.</p>
        </div>
      </section>`;

const bar = (k, cls, v) =>
  `<div class="lmbis-row"><span class="lmbis-row__k">${k}</span><div class="lmbis-track"><i class="lmbis-fill lmbis-fill--${cls}" data-val="${v}"></i></div><span class="lmbis-row__v">${v}</span></div>`;
const metric = (name, note, ours, paper, win) =>
  `<div class="lmbis-metric${win ? " lmbis-metric--win" : ""}"><div class="lmbis-metric__head"><span>${name}</span><span class="lmbis-metric__note">${note}</span></div>${bar("Ours", "ours", ours)}${bar("Paper", "paper", paper)}</div>`;

const LMBIS_BENCH = `<section class="proj__section" data-reveal>
        <h2>Benchmark — CHASE_DB1</h2>
        <p>Our from-scratch implementation, measured against the figures reported in the original paper. We reproduced its segmentation quality — and edged past it on sensitivity, the rate of true vessels caught.</p>
        <div class="lmbis-bench" id="lmbis-bench">
          ${metric("AUC", "", "0.8688", "0.9897", false)}
          ${metric("Sensitivity", "▲ ours +0.0161", "0.8766", "0.8605", true)}
          ${metric("Specificity", "", "0.9493", "0.9896", false)}
        </div>
      </section>`;

const llmCol = (name, role, acc, f1, win) =>
  `<div class="llm-col${win ? " llm-col--win" : ""}" data-acc="${acc}" data-f1="${f1}">
            <div class="llm-bar-wrap"><span class="llm-val">${acc}</span><i class="llm-bar"></i></div>
            <span class="llm-name">${name}</span><span class="llm-role">${role}</span>
          </div>`;

// Animated distillation pipeline (replaces the static Fig. 1 screenshot).
const LLM_PIPE = `<section class="proj__section" data-reveal>
        <h2>Methodology — The Pipeline</h2>
        <p>Take a large unified financial dataset, preprocess it, and hand it to big, renowned LLMs — <strong>Meta's LLaMA 3</strong> and <strong>Claude 3.5 Haiku</strong>. The teachers don't just answer: they produce a <em>label</em> and a <em>rationale</em>. The student — a much smaller model like <strong>Flan-T5</strong> or GPT-2 — trains on both. It learns the reasoning, not just the answers.</p>
        <div class="llm-pipe" role="img" aria-label="Distillation pipeline: financial text flows through teacher LLMs producing labels and rationales, which train a small student model">
          <div class="llm-stage"><b>Financial text</b><span>FPB dataset, preprocessed</span></div>
          <span class="llm-pipe__arr" aria-hidden="true">→</span>
          <div class="llm-stage llm-stage--teacher"><b>Teacher LLMs</b><span>LLaMA 3 · Claude 3.5 Haiku</span></div>
          <span class="llm-pipe__arr" aria-hidden="true">→</span>
          <div class="llm-stage llm-stage--twin"><b>label + rationale</b><span>the answer <em>and</em> the why</span></div>
          <span class="llm-pipe__arr" aria-hidden="true">→</span>
          <div class="llm-stage llm-stage--student"><b>Student — Flan-T5</b><span>a fraction of the parameters</span></div>
          <span class="llm-pipe__arr" aria-hidden="true">→</span>
          <div class="llm-stage"><b>Predictions</b><span>fast, cheap, specialized</span></div>
        </div>
      </section>`;

// "Watch the model think" — real example outputs from the poster, verbatim.
const LLM_PLAY = `<section class="proj__section" data-reveal>
        <h2>Watch It Think</h2>
        <p>Real outputs from our runs, verbatim — the standing prompt is <em>“What is the sentiment of this news? Please choose an answer from {negative/neutral/positive}.”</em> Note the student doesn't just classify; it explains itself, the way its teachers taught it to.</p>
        <div class="llm-play" id="llm-play">
          <div class="llm-term">
            <div class="llm-term__bar"><i></i><i></i><i></i><span id="llm-term-title">distilled T5 — student</span></div>
            <div class="llm-term__body">
              <p class="llm-q"><span class="llm-prompt">›</span> <span id="llm-input"></span><span class="llm-caret" aria-hidden="true"></span></p>
              <p class="llm-a">sentiment: <span class="llm-badge" id="llm-badge"></span></p>
              <p class="llm-r" id="llm-rationale"></p>
            </div>
          </div>
          <div class="llm-examples" role="group" aria-label="Example">
            <button class="llm-ex is-active" data-ex="0" aria-pressed="true">Student · “Bitcoin just crashed…”</button>
            <button class="llm-ex" data-ex="1" aria-pressed="false">Teacher · “Amazon opens a store…”</button>
          </div>
        </div>
        <p class="proj-note">Quirks included — “disaastah” is the actual test sentence, and the student's explanation is untouched.</p>
      </section>`;

const LLM_DEMO = `<section class="proj__section" data-reveal>
        <div class="llm-stats">
          <div class="llm-stat"><b>&lt;12%</b><span>of the original training data</span></div>
          <div class="llm-stat"><b>+0.14</b><span>accuracy over its own teacher</span></div>
          <div class="llm-stat"><b>faster</b><span>inference — runs where LLMs can't</span></div>
        </div>
      </section>
      <section class="proj__section" data-reveal>
        <h2>Distilled, and still winning</h2>
        <p>On the Financial Phrase Bank benchmark, the distilled T5 doesn't just approach its teachers — it edges past them, at a fraction of the size and trained on under 12% of the data. Toggle the metric:</p>
        <div class="llm-demo" id="llm-demo" data-demo="llm-distillation">
          <div class="llm-toggle" role="group" aria-label="Metric">
            <button class="llm-btn is-active" data-metric="acc" aria-pressed="true">Accuracy</button>
            <button class="llm-btn" data-metric="f1" aria-pressed="false">F1 Score</button>
          </div>
          <div class="llm-chart" id="llm-chart">
            ${llmCol("LLaMA 3", "teacher", "0.68", "0.74", false)}
            ${llmCol("FinGPT", "baseline", "0.77", "0.76", false)}
            ${llmCol("T5-Distilled", "ours", "0.82", "0.82", true)}
          </div>
          <p class="proj-note">Financial Phrase Bank — 3-class financial sentiment. T5-Distilled is our model; LLaMA 3 is the teacher it learns from, FinGPT the specialized baseline.</p>
        </div>
      </section>`;

// ---- How Machines Learn to Discriminate: bespoke illustrated sections ----

// Feedback loop: real-world bias → training → algorithmic bias → decisions → world.
const HML_LOOP = `<section class="proj__section" data-reveal>
        <h2>The Feedback Loop</h2>
        <p>Data collected from the real world carries the real world's bias — and algorithms develop by training on that data. When the data is biased, <strong>the algorithm inherits the bias</strong>. Then its decisions flow back into the world, generating the next round of biased data.</p>
        <div class="hml-loop">
          <svg viewBox="0 0 640 210" role="img" aria-label="Feedback loop between real-world data bias and algorithmic bias">
            <defs>
              <marker id="hml-arr" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                <path d="M0,0 L10,5 L0,10 z" fill="#2af5ff"/>
              </marker>
            </defs>
            <path class="hml-flow" d="M 232 74 C 290 22, 350 22, 408 74" fill="none" stroke="#2af5ff" stroke-width="2" marker-end="url(#hml-arr)"/>
            <path class="hml-flow hml-flow--back" d="M 408 136 C 350 188, 290 188, 232 136" fill="none" stroke="#b06bff" stroke-width="2" marker-end="url(#hml-arr2)"/>
            <defs>
              <marker id="hml-arr2" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                <path d="M0,0 L10,5 L0,10 z" fill="#b06bff"/>
              </marker>
            </defs>
            <text x="320" y="36" text-anchor="middle" class="hml-svg-label">training</text>
            <text x="320" y="186" text-anchor="middle" class="hml-svg-label">decisions reshape the world</text>
            <g>
              <rect x="26" y="74" width="206" height="62" rx="14" class="hml-node hml-node--data"/>
              <text x="129" y="99" text-anchor="middle" class="hml-node-title">REAL-WORLD</text>
              <text x="129" y="117" text-anchor="middle" class="hml-node-title">DATA BIAS</text>
            </g>
            <g>
              <rect x="408" y="74" width="206" height="62" rx="14" class="hml-node hml-node--algo"/>
              <text x="511" y="99" text-anchor="middle" class="hml-node-title">ALGORITHMIC</text>
              <text x="511" y="117" text-anchor="middle" class="hml-node-title">BIAS</text>
            </g>
          </svg>
        </div>
        <p class="hml-note"><b>Note:</b> this is how biased algorithms don't just reflect systems of oppression — they <em>reinforce</em> them.</p>
      </section>`;

// The black-box transparency problem.
const HML_BB = `<section class="proj__section" data-reveal>
        <h2>The Lack-of-Transparency Problem</h2>
        <div class="hml-bb">
          <div class="hml-bb__col">
            <div class="hml-chips"><span>résumé</span><span>zip code</span><span>photo</span><span>history</span></div>
            <label>input data</label>
          </div>
          <span class="hml-bb__arrow">→</span>
          <div class="hml-bb__box"><span>?</span><label>“black box”</label></div>
          <span class="hml-bb__arrow">→</span>
          <div class="hml-bb__col">
            <div class="hml-verdict"><i class="ok">approved</i><i class="no">denied</i><i class="no">denied</i><i class="ok">approved</i></div>
            <label>predicted results</label>
          </div>
        </div>
        <p>The model can't articulate <strong>why</strong> its predictions are what they are — and when it encodes bias, that opacity hides it. Transparency about <strong>who designs these systems</strong> is what makes accountability possible.</p>
      </section>`;

// Two ways to define fairness.
const HML_DEFS = `<section class="proj__section" data-reveal>
        <h2>What Is Fairness, Anyway?</h2>
        <p>Fairness can be defined many ways. The talk focuses on two families — and they pull in different directions:</p>
        <div class="hml-defs">
          <div class="hml-def" data-accent="violet">
            <span class="hml-def__icon">＝</span>
            <h3>Individual Fairness</h3>
            <p>People are treated <em>equally</em> to one another despite varying protected traits. Prioritizes <strong>equal treatment</strong> — the same rule for everybody.</p>
          </div>
          <div class="hml-def" data-accent="cyan">
            <span class="hml-def__icon">≈</span>
            <h3>Group Fairness</h3>
            <p>People are treated <em>equitably</em> to one another despite varying protected traits. Prioritizes <strong>equal outcome</strong> — the results even out across groups.</p>
          </div>
        </div>
      </section>`;

// The interactive fairness playground.
const HML_DEMO = `<section class="proj__section" data-reveal>
        <h2>The Fairness Playground</h2>
        <p>Two groups of candidates with <strong>identical true talent</strong>. But history depressed the recorded scores of most of group B — the world was biased, so the data is biased. Now <em>you</em> run the hiring model. Pick a policy and watch who gets in, who gets wrongly rejected, and what each definition of fairness trades away.</p>
        <div class="hml-demo" id="hml-demo" data-demo="how-machines-learn">
          <div class="hml-stage"><canvas id="hml-canvas" aria-label="Hiring simulation: candidates as dots with per-group score cutoffs"></canvas></div>
          <div class="hml-legend">
            <span><i class="hml-sw hml-sw--fill"></i> truly qualified</span>
            <span><i class="hml-sw hml-sw--hollow"></i> not qualified</span>
            <span><i class="hml-sw hml-sw--red"></i> qualified — but rejected</span>
          </div>
          <div class="hml-toggle" role="group" aria-label="Hiring policy">
            <button class="hml-btn is-active" data-policy="raw" aria-pressed="true">Biased model</button>
            <button class="hml-btn" data-policy="blind" aria-pressed="false">Equal treatment</button>
            <button class="hml-btn" data-policy="eo" aria-pressed="false">Equal opportunity</button>
            <button class="hml-btn" data-policy="dp" aria-pressed="false">Demographic parity</button>
          </div>
          <div class="hml-metrics">
            <div class="hml-metric"><span class="hml-k">group a hired</span><div class="hml-track"><i class="hml-fill hml-fill--a" id="hml-bar-a"></i></div><span class="hml-v" id="hml-val-a">–</span></div>
            <div class="hml-metric"><span class="hml-k">group b hired</span><div class="hml-track"><i class="hml-fill hml-fill--b" id="hml-bar-b"></i></div><span class="hml-v" id="hml-val-b">–</span></div>
            <div class="hml-wrong">qualified, but rejected → <b>group a: <span id="hml-wrong-a">–</span></b> · <b>group b: <span id="hml-wrong-b">–</span></b></div>
          </div>
          <div class="hml-read"><code id="hml-formula"></code><p id="hml-expl"></p></div>
        </div>
        <p class="proj-note">An illustrative simulation — 160 synthetic candidates, same talent distribution in both groups. Fairness definitions from Fu, Aseri, Singh &amp; Srinivasan [3].</p>
      </section>`;

// Equality / Equity / Justice triptych (original SVG line-art in the site style).
const hmlPerson = (x, h, crates, sees) => {
  const baseY = 196 - crates * 20;
  const headTop = baseY - h;
  const col = sees ? "#2af5ff" : "rgba(255,255,255,0.30)";
  let s = "";
  for (let i = 0; i < crates; i++)
    s += `<rect x="${x - 11}" y="${196 - (i + 1) * 20 + 1}" width="22" height="18" rx="2" class="hml-crate"/>`;
  s += `<circle cx="${x}" cy="${headTop + 9}" r="8" fill="none" stroke="${col}" stroke-width="2"/>`;
  s += `<rect x="${x - 8}" y="${headTop + 20}" width="16" height="${h - 20}" rx="7" fill="none" stroke="${col}" stroke-width="2"/>`;
  return s;
};
const hmlFence = (mesh) => {
  let s = `<line x1="12" y1="96" x2="208" y2="96" stroke="rgba(255,255,255,0.4)" stroke-width="1.5"/>`;
  if (mesh) {
    for (let x = -88; x < 220; x += 14) {
      s += `<line x1="${x}" y1="196" x2="${x + 100}" y2="96" stroke="rgba(255,255,255,0.13)"/>`;
      s += `<line x1="${x + 100}" y1="196" x2="${x}" y2="96" stroke="rgba(255,255,255,0.13)"/>`;
    }
  } else {
    s += `<rect x="12" y="96" width="196" height="100" fill="rgba(255,255,255,0.05)"/>`;
    for (let x = 26; x < 208; x += 14)
      s += `<line x1="${x}" y1="96" x2="${x}" y2="196" stroke="rgba(255,255,255,0.14)"/>`;
  }
  return s;
};
const hmlField = `<circle cx="150" cy="52" r="4" fill="#7cff8b" opacity="0.9"/>
      <path d="M 138 44 q 8 -8 16 -2" fill="none" stroke="rgba(124,255,139,0.4)" stroke-dasharray="2 3"/>
      <rect x="30" y="34" width="52" height="34" fill="none" stroke="rgba(255,255,255,0.14)"/>
      <line x1="12" y1="80" x2="208" y2="80" stroke="rgba(255,255,255,0.10)" stroke-dasharray="3 5"/>`;
const hmlPanel = (title, accent, caption, fig) => `<figure class="hml-panel">
          <svg viewBox="0 0 220 210" role="img" aria-label="${title}">${hmlField}${fig}</svg>
          <figcaption><b style="color:${accent}">${title}</b><span>${caption}</span></figcaption>
        </figure>`;
const HML_TRIPTYCH = `<section class="proj__section" data-reveal>
        <h2>Equality, Equity, Justice</h2>
        <p>The classic picture, and the reason “treat everyone the same” isn't the end of the conversation <b>[2]</b>:</p>
        <div class="hml-triptych">
        ${hmlPanel(
          "Equality",
          "#2af5ff",
          "Everyone gets the same support — equal treatment. The shortest fan still can't see.",
          hmlFence(false) + hmlPerson(55, 104, 1, true) + hmlPerson(110, 88, 1, true) + hmlPerson(165, 64, 1, false)
        )}
        ${hmlPanel(
          "Equity",
          "#7cff8b",
          "Everyone gets the support they need — equal outcome.",
          hmlFence(false) + hmlPerson(55, 104, 0, true) + hmlPerson(110, 88, 1, true) + hmlPerson(165, 64, 2, true)
        )}
        ${hmlPanel(
          "Justice",
          "#b06bff",
          "The barrier itself is fixed. Nobody needs support at all.",
          hmlFence(true) + hmlPerson(55, 104, 0, true) + hmlPerson(110, 88, 0, true) + hmlPerson(165, 64, 0, true)
        )}
        </div>
      </section>`;

const PAGES = [
  {
    slug: "raytracer",
    title: "C++ Ray Tracer",
    category: "Software",
    year: "2024",
    sub: "A from-scratch ray tracer built in pure C++17 with no external libraries — recursive ray tracing, Blinn-Phong shading, shadow casting, mirror reflections, and 4× anti-aliasing.",
    tags: ["C++17", "3D Rendering", "Zero Dependencies"],
    links: [{ label: "Source", href: "https://github.com/MiladFarazian/MiladFarazian2025/tree/main/raytracer" }],
    blocks: [
      {
        t: "gallery",
        h: "Rendered Output",
        items: [
          { src: "scene_main.png", title: "Showcase Scene", caption: "Reflections, Phong shading, shadows, checkerboard" },
          { src: "scene_reflections.png", title: "Mirror Reflections", caption: "Recursive ray tracing up to 5 bounces" },
          { src: "scene_shadows.png", title: "Shadow Casting", caption: "Shadow rays with a single directional light" },
        ],
      },
      { t: "raw", html: RT_DEMO },
      {
        t: "features",
        h: "Features",
        items: [
          { title: "Blinn-Phong Lighting", desc: "Ambient, diffuse, and specular components with configurable materials." },
          { title: "Shadow Casting", desc: "Shadow rays to each light source with bias to prevent surface acne." },
          { title: "Recursive Reflections", desc: "Recursive ray tracing with configurable depth and per-material reflectivity." },
          { title: "Primitives", desc: "Spheres and infinite planes, with checkerboard patterns." },
          { title: "Anti-Aliasing", desc: "4× supersampling for smooth, clean edges." },
          { title: "Configurable Camera", desc: "FOV, position, and look-at targeting with viewport projection." },
        ],
      },
      { t: "code", h: "Architecture", file: "renderer.h — core shading loop", code: RT_CODE },
    ],
  },

  {
    slug: "lmbis-net",
    title: "LMBiS-Net",
    category: "AI / ML",
    year: "2024",
    sub: "An implementation of Abbasi et al.'s “LMBiS-Net: A Lightweight Multipath Bidirectional Skip Connection based CNN for Retinal Blood Vessel Segmentation.”",
    meta: "Milad Farazian · Charlie Floeder · Rizq Khateeb · Harshit Shah · Yash Sharma",
    tags: ["Python", "PyTorch", "CNN", "Medical Imaging"],
    links: [{ label: "Original Paper", href: "https://arxiv.org/pdf/2309.04968" }],
    blocks: [
      { t: "text", h: "Project Goal", html: "<p>To implement the LMBiS-Net model and confirm the findings presented in the original paper. Additionally, we aimed to apply our implementation to a different dataset that was not used in the paper.</p>" },
      { t: "text", h: "Why It Matters", html: "<p>LMBiS-Net's primary benefit is an accurate retinal blood-vessel segmentation model that is computationally efficient compared to state-of-the-art models. This efficiency can assist ophthalmologists in the early detection and treatment of retinal diseases, reducing manual effort and potential human error.</p><p>Retinal diseases are a major cause of visual impairment and blindness — studies show that <strong>5%–20% of the global population aged 40+</strong> has retinal disorders. Examining retinal vessels provides critical insight into the underlying conditions that contribute to these diseases.</p>" },
      { t: "raw", html: LMBIS_DEMO },
      { t: "figure", h: "The Model", html: "<p>LMBiS-Net is a CNN consisting of three encoder blocks, a bottleneck layer, and three decoder blocks. It uses multipath feature-extraction blocks and bidirectional skip connections to enhance information flow between the encoders and decoders.</p>", src: "LMBiS.png", title: "LMBiS-Net architecture" },
      { t: "figure", h: "Multi-Path Feature Extraction", html: "<p>This component introduces feature diversity into the model, reducing overfitting and improving generalization. By using different-sized convolutions, the network captures both low-level and high-level features crucial for blood-vessel segmentation.</p>", src: "multipath.png", title: "Multi-path feature extraction block" },
      { t: "text", h: "Our Contribution", html: "<p>We created the <strong>first publicly available implementation</strong> of LMBiS-Net and developed code to augment retinal images, increasing the size of training datasets. Our findings support the original paper's claims that LMBiS-Net is a computationally efficient and accurate state-of-the-art model for retinal blood-vessel segmentation.</p>" },
      { t: "raw", html: LMBIS_BENCH },
    ],
  },

  {
    slug: "llm-distillation",
    title: "LLM Distillation for Financial Reports",
    category: "AI / ML",
    year: "2024",
    sub: "Using knowledge distillation to build a financial-analysis model that is computationally efficient and specialized for financial contexts — without the cost of hosting a full-size LLM.",
    meta: "Finance Bros — Harshit Shah · Sebastian Escalante · Milad Farazian · Rizq Khateeb",
    tags: ["Python", "LLMs", "Distillation", "NLP", "Interactive"],
    blocks: [
      { t: "text", h: "Problem", html: "<p>We used distillation to develop a financial-analysis tool that is computationally efficient and simpler than traditional LLMs, while being specialized for financial contexts. LLMs cannot be efficiently used and hosted on an ad-hoc basis — so we aimed to train smaller models that are easily accessible.</p>" },
      { t: "text", h: "Why It Matters", html: "<p>Financial-analysis tools are essential for evaluating a company's fiscal health. Current tools demand significant computational resources while remaining too general to stay consistently accurate in financial contexts. Distillation combines the strengths of multiple models while being far more resource-efficient — making advanced financial analysis accessible, and improving decision-making across industries.</p>" },
      { t: "raw", html: LLM_PIPE },
      { t: "raw", html: LLM_PLAY },
      { t: "text", h: "Discussion", html: "<p>LLaMA 3 and Claude 3.5 excel in similar areas, making distillation effective for combining their strengths. T5 distilled from LLaMA 3 outperforms FinGPT — indicating that <strong>step-by-step distillation is more effective than fine-tuning or LoRAs</strong>, offering cost-efficient performance and suggesting distillation is a promising optimization strategy.</p>" },
      { t: "text", h: "Results", html: "<p>We provided a model that outperforms current LoRAs and fine-tuned GPTs using <strong>less than 12% of the original dataset</strong> (Sentiment Train FinGPT) on the FPB benchmark. It not only takes less training time, but inference is dramatically faster — making the model usable in resource-constrained systems.</p>" },
      { t: "raw", html: LLM_DEMO },
    ],
  },

  {
    slug: "usurper",
    title: "Usurper",
    category: "Web",
    year: "2025",
    sub: "A promo site for the debut short film USURPER by Edward Avalos — scroll-triggered reveals and a mouse-tracking parallax title over the film's trailer.",
    meta: "A film by Edward Avalos · Starring Matthew Frietze",
    tags: ["HTML", "CSS", "JavaScript"],
    links: [{ label: "Watch on Vimeo", href: "https://vimeo.com/1070369663" }],
    blocks: [
      {
        t: "raw",
        html: `<section class="proj__section" data-reveal>
        <h2>Trailer</h2>
        <a class="film-poster" href="https://vimeo.com/1070369663" target="_blank" rel="noopener" data-magnetic>
          <span class="film-poster__play">▶</span>
          <span class="film-poster__title">USURPER</span>
          <span class="film-poster__cta">Watch the trailer on Vimeo ↗</span>
        </a>
        <p class="proj-note">The trailer is a private screener hosted on the filmmaker's Vimeo.</p>
      </section>`,
      },
      { t: "text", h: "Synopsis", html: "<p>Starring Matthew Frietze, <strong>USURPER</strong> stalks a withdrawn Abel, who becomes consumed by addiction and anxiety. He begins to struggle to face an unsettling truth when his friend Seth intervenes.</p>" },
      { t: "text", html: '<p class="proj-note">© 2025 Usurper Film. All rights reserved.</p>' },
    ],
  },

  {
    slug: "katsuya",
    title: "Katsuya's Revenge",
    category: "Games",
    year: "2025",
    sub: "Katsuya, a banished Samurai, dons a hidden persona as a ninja to avenge the death of his sensei by the corrupted Samurai Kapudo. A 2D platformer adventure through feudal Japan — playable right here.",
    meta: "Created by Kobe Shavolian, Milad Farazian, Brittany Dakoske, Keon Etebari, Shelby Cohen, Keegan Sly & Mr. Enfield in AP Computer Science. Restored & re-presented by Milad Farazian.",
    tags: ["Originally Java", "Web Port", "Canvas"],
    blocks: [
      { t: "game", src: "/games/katsuya/index.html", title: "Katsuya's Revenge", note: "▶ Click the game to focus it — A / D or ← → to move, Space to jump, click to shoot (on-screen pad on mobile). Best with sound on." },
      {
        t: "controls",
        items: [
          { key: "A / D", label: "Move left / right" },
          { key: "SPACE", label: "Jump" },
          { key: "CLICK", label: "Throw shuriken" },
        ],
      },
    ],
  },

  {
    slug: "bound",
    title: "Bound",
    category: "Games",
    year: "2020",
    sub: "The first game I built entirely on my own — a Java / Processing (PApplet) platformer, made with libraries and techniques I picked up while teaching Java to iDTech campers at UCLA.",
    tags: ["Java", "Processing", "PApplet"],
    links: [{ label: "Source on GitHub", href: "https://github.com/MiladFarazian/Bound" }],
    blocks: [
      { t: "game", src: "/games/bound/index.html", title: "Bound", ratio: "3 / 2", note: "▶ Steer with your mouse (drag on mobile), click/tap Start to play. A p5.js web port of the original Java game." },
      { t: "text", h: "About", html: "<p>Bound started as a teaching exercise and grew into a full platformer — handwritten physics, collision, and level logic on top of the Processing (PApplet) drawing loop. It's where I first learned how to architect a game from an empty <code>setup()</code> and <code>draw()</code>.</p><p>The original is a desktop Java application; the version above is the p5.js web port, and the full source lives on GitHub.</p>" },
    ],
  },

  {
    slug: "parkzy",
    title: "Parkzy",
    category: "Software",
    year: "2025",
    sub: "Find parking. Anywhere. Anytime. A peer-to-peer marketplace that connects drivers who need a spot with property owners who have space to spare — turning empty driveways into revenue and helping drivers skip the circling.",
    tags: ["React Native", "Supabase", "Stripe", "Maps", "i18n"],
    links: [{ label: "Visit useparkzy.com", href: "https://useparkzy.com" }],
    blocks: [
      {
        t: "features",
        h: "For spot hosts",
        items: [
          { title: "List in seconds", desc: "Put an unused driveway, lot, or private space online in under a minute." },
          { title: "Earn automatically", desc: "Get paid every time a driver parks — scheduling, pricing, and availability all in your control." },
          { title: "Parkzy signage", desc: "Optional physical signage so passing drivers know your spot is available." },
        ],
      },
      {
        t: "features",
        h: "For drivers",
        items: [
          { title: "Guaranteed parking", desc: "Find a spot when you actually need it — book last-minute or reserve ahead." },
          { title: "Filter what matters", desc: "Search by location, price, and availability to land the right spot." },
          { title: "Skip the circling", desc: "No more laps around the block hunting for street parking." },
        ],
      },
      { t: "text", h: "Status", html: "<p>Live in production — payments, maps, search, host tools, a mobile app, and English/Spanish localization, all running at <a href=\"https://useparkzy.com\" target=\"_blank\" rel=\"noopener\" style=\"color:var(--cyan)\">useparkzy.com ↗</a>.</p>" },
    ],
  },

  {
    slug: "gosan",
    title: "Gosan",
    category: "Software",
    year: "2025",
    icon: "gosan-icon.png",
    sub: "A native macOS DAW (GarageBand-class) with a taste engine. Named for the gōsān — the minstrel poet-musicians of Parthian and Persian folklore who carried songs by ear and made them their own. Suno generates ideas, Moises dissects and finishes audio, and you stay the producer.",
    tags: ["Swift", "macOS", "AVAudioEngine", "AI"],
    links: [{ label: "Source on GitHub", href: "https://github.com/MiladFarazian/daw" }],
    blocks: [
      {
        t: "features",
        h: "What it does",
        items: [
          { title: "DAW bones", desc: "Multitrack timeline with waveforms and a bars/beats grid, recording + overdub, clip editing (trim, split, quantize, time-stretch), a full mixer (EQ, compressor, reverb, delay), and offline WAV export." },
          { title: "Moises integration", desc: "Right-click any clip to split into stems, analyze key / BPM / chords, de-reverb, master, or run the one-step Vocal Rescue recipe." },
          { title: "Suno generation", desc: "Describe a vibe in the transport bar, audition candidates in a variant tray, and drop the keepers straight onto the timeline." },
          { title: "Taste engine", desc: "Keeping or discarding candidates trains a local taste profile that quietly nudges future prompts toward your strongest descriptors — and shows you exactly what it changed." },
        ],
      },
      { t: "text", h: "Portable projects", html: "<p>New / Open / Save persist the arrangement to a portable <code>.gosan</code> package — a self-contained folder with the project plus copies of every clip, so sessions move cleanly between machines.</p>" },
    ],
  },

  {
    slug: "mehdi",
    title: "Mehdi",
    category: "AI / ML",
    year: "2025",
    sub: "A personal financial-intelligence assistant. It securely links your bank and credit-card accounts (read-only), builds a deep model of your spending, and surfaces proactive advice — in plain language.",
    tags: ["Next.js", "Supabase", "Plaid", "Claude"],
    links: [{ label: "Source on GitHub", href: "https://github.com/MiladFarazian/mehdi" }],
    blocks: [
      {
        t: "features",
        h: "What it surfaces",
        items: [
          { title: "Runaway subscriptions", desc: "Price creep, free trials converted to paid, duplicate services, and annual renewals before they hit." },
          { title: "Cut-back recommendations", desc: "Categories and merchants where you're overspending vs. your own baseline, shown annualized." },
          { title: "Patterns to rein in", desc: "Lifestyle creep, spending spikes, and the small recurring leaks." },
          { title: "Advisor", desc: "Ask anything about your spending — answers are grounded in your real transactions, never guessed." },
        ],
      },
      { t: "text", h: "Privacy by design", html: "<p>Plaid sits between the app and your bank, providing <strong>read-only</strong> transaction and balance data through a revocable token. The app never sees your bank credentials, requests no payment or transfer scopes, and stores the token server-side only.</p>" },
      { t: "text", h: "Under the hood", html: "<p>Next.js + Supabase + Plaid + Claude. The analysis engine detects recurring charges by cadence and amount stability, and builds per-category median baselines to flag overspend. The advisor runs on the local Claude CLI — grounded in your data, with no separate API bill.</p>" },
    ],
  },

  {
    slug: "wax",
    title: "Wax",
    category: "Software",
    year: "2025",
    sub: "Silence the noise. Keep the connection. A calm, fast Instagram experience without the Reels rabbit hole — named for the beeswax Odysseus' crew used to drown out the Sirens' song. Keep the feed, stories, and DMs you love; lose the algorithmic pull.",
    tags: ["React Native", "Expo", "TypeScript"],
    links: [{ label: "Source on GitHub", href: "https://github.com/MiladFarazian/wax" }],
    blocks: [
      {
        t: "features",
        h: "Why Wax",
        items: [
          { title: "Speed", desc: "Virtualized feeds, on-device caching, image prefetch, and optimistic UI for 60fps scrolling." },
          { title: "Fairness", desc: "Every “use Instagram normally” feature is free, forever — no paywalls on the basics." },
          { title: "Craft", desc: "Instagram-1:1 inside, wrapped in a calm honey-and-wax brand at the edges." },
        ],
      },
      {
        t: "shots",
        h: "Phase 0",
        items: [
          { src: "home.png", title: "Home" },
          { src: "profile.png", title: "Profile" },
          { src: "inbox.png", title: "Inbox" },
          { src: "search.png", title: "Search" },
        ],
        note: "Running on the web target with mock data — note the four-tab bar with no Reels tab, the core of the Wax thesis.",
      },
      { t: "text", h: "Architecture", html: "<p>The UI talks only to a single <code>SocialProvider</code> interface, and the active backend is chosen in one file — so Wax can swap data sources (mock → IG private API → Graph API → a Wax-native network) <strong>without rewriting the app</strong>. Built on Expo Router, Shopify FlashList, TanStack Query, and expo-image; session tokens stay on-device via expo-secure-store.</p>" },
    ],
  },

  {
    slug: "emotion-translation",
    title: "Emotion Translation with Transformers",
    category: "AI / ML",
    year: "2024",
    sub: "A transformer model that rewrites the emotion of a sentence while preserving its underlying meaning.",
    meta: "Milad Farazian · Charlie Floeder · Rizq Khateeb · Harshit Shah · Yash Sharma",
    tags: ["Python", "Transformers", "NLP"],
    blocks: [
      { t: "text", h: "Overview", html: "<p>We developed a model that can change the emotion of a particular statement without changing the context of the sentence — taking a neutral piece of text and re-rendering it as joyful, angry, or melancholic while keeping its factual meaning intact. The project explores controllable text generation and the boundary between sentiment and semantics.</p>" },
    ],
  },

  {
    slug: "studybuddy",
    title: "StudyBuddy",
    category: "Web",
    year: "2025",
    sub: "A USC-based tutoring and mentoring app that matches students to the help they need.",
    tags: ["React", "Next.js", "Tailwind", "Prisma"],
    blocks: [
      { t: "text", h: "Overview", html: "<p>StudyBuddy pairs students with tutors and mentors based on their specific needs — the courses they're taking, the topics they're stuck on, and how they like to learn. A matching layer connects the right people, so finding help on campus stops being a group-chat scavenger hunt.</p>" },
    ],
  },

  {
    slug: "innsaei",
    title: "Innsæi",
    category: "Web",
    year: "2024",
    sub: "A Twitter-esque social app reclaiming the original mission — give everyone the power to create and share ideas instantly, without barriers. Innsæi is Icelandic for “the sea within.”",
    tags: ["React", "JavaScript"],
    links: [{ label: "Live demo", href: "https://innsaei.lovable.app" }],
    blocks: [
      { t: "text", h: "Overview", html: "<p>Innsæi is a social web app built around broadcasting the thoughts that matter — a lightweight, fast feed for sharing ideas and information instantly. It takes its name from the Icelandic word for intuition, literally “the sea within.”</p>" },
    ],
  },

  {
    slug: "canvas-year-in-review",
    title: "Canvas Year in Review",
    category: "Web",
    year: "2024",
    sub: "A Spotify-Wrapped for school — a Chrome extension that scrapes your Canvas account and turns your semester into a stats recap.",
    tags: ["JavaScript", "Chrome Extension"],
    links: [{ label: "View on Devpost", href: "https://devpost.com/software/canvas-year-in-review" }],
    blocks: [
      { t: "text", h: "Overview", html: "<p>Canvas Year in Review pulls the data Canvas already has on you — grades, submissions, deadlines met (and missed) — and presents it as a fun, shareable end-of-semester recap. A quick gauge of how the term actually went, in the spirit of Spotify Wrapped.</p>" },
    ],
  },

  {
    slug: "snake",
    title: "Snake",
    category: "Games",
    year: "2024",
    sub: "The arcade classic, rebuilt — and playable right here. Eat, grow, and don't bite yourself.",
    tags: ["JavaScript", "Canvas"],
    blocks: [
      { t: "game", src: "/games/snake/index.html", title: "Snake", ratio: "3 / 2", note: "▶ Click the board, then steer with the arrow keys or WASD (swipe / d-pad on mobile). Space pauses." },
      { t: "text", h: "Overview", html: "<p>An implementation of the arcade classic — grid movement, a growing tail, self-collision, and the one rule everyone knows. Not really much else to say. Sometimes you build a thing just because it's satisfying to build.</p>" },
    ],
  },

  {
    slug: "how-machines-learn",
    title: "How Machines Learn to Discriminate",
    category: "Writing",
    year: "2024",
    sub: "Embedding fairness into machine-learning algorithms — how models trained on real-world data automate existing bias along race and sex, even absent any ill intent. And what it takes to push back.",
    meta: "A talk by Milad Farazian · Inspired by CSE 146: Ethics and Algorithms with Lise Getoor",
    tags: ["Ethics", "ML", "Fairness", "Interactive"],
    blocks: [
      { t: "text", h: "The Thesis", html: "<p>Nobody has to <em>design</em> a discriminatory algorithm. Inspired by Professor Lise Getoor's <em>Ethics &amp; Algorithms</em> course and Ruha Benjamin's <em>The New Jim Code</em>, this talk shows how models trained on past real-world data tend to automate — and amplify — existing discrimination on the basis of race and sex. Bias doesn't have to be written in; it's <strong>inherited from the data we feed the machine</strong>.</p>" },
      { t: "raw", html: HML_LOOP },
      { t: "figure", h: "Data Bias in Action", html: "<p>The same photo of a hand holding a thermometer, run through Google Vision — once as-is, once with the skin tone edited light. The dark-skinned hand is labeled <strong>“Gun” at 61% confidence</strong>; the light-skinned hand, <strong>“Monocular” at 60%</strong>. Nobody programmed that. The training data did <b>[1]</b>.</p>", src: "google-vision.png", title: "Google Vision, April 2020", caption: "Same object, different skin tone — different label [1]" },
      { t: "raw", html: HML_BB },
      { t: "raw", html: HML_DEFS },
      { t: "raw", html: HML_DEMO },
      { t: "raw", html: HML_TRIPTYCH },
      {
        t: "features",
        h: "Correcting Bias in the Process",
        items: [
          { title: "Pre-Processing", desc: "Detect and remove bias in the data where possible, add corrective sampling, and embed features carefully before training ever starts." },
          { title: "Processing", desc: "Evaluate the model's rankings for bias while it works — and search for inference: is it reconstructing protected attributes from proxies?" },
          { title: "Post-Processing", desc: "Examine causal relations in the outputs and verify results for the accuracy-versus-fairness trade-off before anything ships." },
          { title: "Question Your Own Bias", desc: "The people building the pipeline are part of the pipeline. Fairness constraints in the algorithm can't compensate for never asking the question." },
        ],
      },
      { t: "text", h: "The Takeaway", html: "<p><strong>There is no one correct way to define fairness.</strong> Equal treatment and equal outcome are both principled — and, as the playground above shows, they can be mutually exclusive on biased data. The choice between them is not a technical decision; it's an ethical one. The danger isn't choosing wrong — it's letting the data choose by default.</p><h2 style=\"margin-top:2.4rem\">References</h2><ol class=\"hml-refs\"><li>Kayser-Bril, N. (2020). <a href=\"https://algorithmwatch.org/en/google-vision-racism/\" target=\"_blank\" rel=\"noopener\">Google apologizes after its Vision AI produced racist results</a>. AlgorithmWatch.</li><li>MobilizeGreen (2021). <a href=\"https://www.mobilizegreen.org/blog/2018/9/30/environmental-equity-vs-environmental-justice-whats-the-difference\" target=\"_blank\" rel=\"noopener\">Environmental equity vs. environmental justice</a>.</li><li>Fu, R., Aseri, M., Singh, P. V., &amp; Srinivasan, K. (2021). <a href=\"https://doi.org/10.1287/mnsc.2021.4065\" target=\"_blank\" rel=\"noopener\">“Un”Fair Machine Learning Algorithms</a>. Management Science.</li></ol>" },
    ],
  },
];

// ---- write ----
for (const p of PAGES) {
  const dir = resolve(ROOT, "work", p.slug);
  mkdirSync(dir, { recursive: true });
  writeFileSync(resolve(dir, "index.html"), page(p));
  console.log(`generated work/${p.slug}/index.html`);
}

// ---- sitemap + robots (kept in sync with the generated pages) ----
const BASE = "https://farazian.com";
const urls = [`${BASE}/`, ...PAGES.map((p) => `${BASE}/work/${p.slug}/`)];
const sitemap =
  `<?xml version="1.0" encoding="UTF-8"?>\n` +
  `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
  urls
    .map((u) => `  <url><loc>${u}</loc><changefreq>monthly</changefreq></url>`)
    .join("\n") +
  `\n</urlset>\n`;
mkdirSync(resolve(ROOT, "public"), { recursive: true });
writeFileSync(resolve(ROOT, "public", "sitemap.xml"), sitemap);
writeFileSync(
  resolve(ROOT, "public", "robots.txt"),
  `User-agent: *\nAllow: /\n\nSitemap: ${BASE}/sitemap.xml\n`
);

console.log(`\n${PAGES.length} project pages + sitemap.xml + robots.txt generated.`);
