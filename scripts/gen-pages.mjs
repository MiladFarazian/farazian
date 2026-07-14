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
    image: `https://farazian.com/og/${p.slug}.png`,
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
    case "video":
      return `<section class="proj__section">${b.h ? `<h2 data-reveal>${b.h}</h2>` : ""}${b.html ? `<div data-reveal>${b.html}</div>` : ""}<div class="proj-embed" data-reveal><video src="${b.src}"${b.poster ? ` poster="${b.poster}"` : ""} controls playsinline preload="metadata"${b.title ? ` aria-label="${b.title}"` : ""}></video></div>${b.note ? `<p class="proj-note">${b.note}</p>` : ""}</section>`;
    case "game":
      return `<section class="proj__section" data-reveal><div class="proj-game"${b.ratio ? ` style="aspect-ratio:${b.ratio}"` : ""}><iframe src="${b.src}" title="${b.title || ""}" loading="lazy" allow="autoplay; fullscreen"></iframe></div>${b.note ? `<p class="proj-note">${b.note}</p>` : ""}</section>`;
    case "controls":
      return `<section class="proj__section" data-reveal><h2>Controls</h2><div class="proj-controls">${b.items
        .map((c) => `<div class="proj-control"><kbd>${c.key}</kbd><span>${c.label}</span></div>`)
        .join("")}</div></section>`;
    case "award":
      return `<section class="proj__section" data-reveal><div class="proj-award"><span class="proj-award__badge">${b.badge || "🏆 winner"}</span><div class="proj-award__body"><b>${b.prize}</b><span>${b.lead || "Submitted to"} <a href="${b.href}" target="_blank" rel="noopener">${b.event}</a></span></div></div></section>`;
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
    <meta property="og:image" content="https://farazian.com/og/${p.slug}.png" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${esc(p.title)} — Milad Farazian" />
    <meta name="twitter:description" content="${esc(p.sub)}" />
    <meta name="twitter:image" content="https://farazian.com/og/${p.slug}.png" />
    <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
    <link rel="apple-touch-icon" href="/icon-180.png" />
    <link rel="manifest" href="/site.webmanifest" />
    <link rel="preload" href="/fonts/space-grotesk-latin.woff2" as="font" type="font/woff2" crossorigin />
    <link rel="preload" href="/fonts/jetbrains-mono-latin.woff2" as="font" type="font/woff2" crossorigin />
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

// ---- Parkzy: interactive product page ----


const PK_APPCARD = `<section class="proj__section" data-reveal>
        <div class="pk-appcard">
          <img src="pk-icon.png" alt="" width="72" height="72" />
          <div class="pk-appcard__body">
            <b>Parkzy: Find Parking Nearby</b>
            <span>Book Spots or Earn From Yours.</span>
            <div class="pk-appcard__meta"><span class="pk-stars" aria-label="Rated 5.0 out of 5">★★★★★</span> 5.0 · Travel · Free · v2.2</div>
          </div>
          <a class="btn btn--primary" href="https://apps.apple.com/us/app/parkzy-find-parking-nearby/id6758564230" target="_blank" rel="noopener" data-magnetic data-scramble>App Store ↗</a>
        </div>
      </section>`;

const PK_DEMO = `<section class="proj__section" data-reveal>
        <h2>Skip the Search. Ping a Host Instead.</h2>
        <p>The whole product, frame-accurate: this walkthrough is <strong>rendered from code with Remotion</strong> — the same pipeline that renders Parkzy's App Store previews — so it's always the current app. The steps follow along as it plays; tap one (or scrub) to jump anywhere.</p>
        <div class="pk-walk" id="pk-walk" data-demo="parkzy">
          <div class="pk-side">
            <div class="pk-phone">
              <video id="pk-video" src="parkzy-ping-demo.mp4" poster="pk-poster.jpg" muted loop playsinline preload="metadata" aria-label="Code-rendered walkthrough of pinging a host and booking a spot in the Parkzy app"></video>
            </div>
            <input type="range" class="pk-scrub" id="pk-scrub" min="0" max="1000" value="0" step="1" aria-label="Scrub the walkthrough" />
          </div>
          <ol class="pk-flow" aria-label="Booking flow">
            <li><button data-t="2.2" class="is-active" aria-current="step"><i>01</i><div><b>Search</b><span>Where to? SoFi Stadium, game night.</span></div></button></li>
            <li><button data-t="6.9" aria-current="false"><i>02</i><div><b>Explore the map</b><span>Hosts within walking distance, live prices.</span></div></button></li>
            <li><button data-t="11.0" aria-current="false"><i>03</i><div><b>Name your price</b><span>What's it worth to you? You set the number.</span></div></button></li>
            <li><button data-t="14.9" aria-current="false"><i>04</i><div><b>Ping hosts</b><span>One request to every host you pick — at once.</span></div></button></li>
            <li><button data-t="24.0" aria-current="false"><i>05</i><div><b>A host accepts</b><span>Real humans on the other side — one tap to earn.</span></div></button></li>
            <li><button data-t="30.5" aria-current="false"><i>06</i><div><b>You're booked</b><span>Address, hours, your car. Drive up, pull in, done.</span></div></button></li>
          </ol>
        </div>
        <div class="pk-stats">
          <div class="pk-stat"><b>$15</b><span>average spot — vs $40+ in stadium lots</span></div>
          <div class="pk-stat"><b>&lt;60s</b><span>the accept target — built for sub-60-second responses</span></div>
          <div class="pk-stat"><b>100%</b><span>in-app payment — no cash, no Venmo</span></div>
        </div>
        <p class="proj-note">Live map at <a href="https://useparkzy.com" target="_blank" rel="noopener" style="color:var(--cyan)">useparkzy.com ↗</a></p>
      </section>`;

const PK_STEPS = `<section class="proj__section" data-reveal>
        <h2>How It Works</h2>
        <div class="pk-steps">
          <div class="pk-step"><i>01</i><b>Drop a pin</b><p>Tell us where you're going. Search a destination — SoFi, USC, a friend's apartment in Echo Park. We surface hosts within walking distance.</p></div>
          <div class="pk-step"><i>02</i><b>Ping hosts</b><p>One tap. Real humans respond. Parkzy pings every nearby host at once — hosts accept in real time — the matching system is built for sub-60-second accepts.</p></div>
          <div class="pk-step"><i>03</i><b>Park &amp; go</b><p>Drive up. Pull in. Done. Your host's address, access notes, and a live chat thread are waiting.</p></div>
        </div>
      </section>`;

const PK_REVIEW = `<section class="proj__section" data-reveal>
        <div class="pk-review">
          <span class="pk-stars pk-stars--lg" aria-hidden="true">★★★★★</span>
          <blockquote>“I listed 12 of my spots on Parkzy and was able to successfully rent out all of them. They earned me <b>$600 in just one night</b> from an event.”</blockquote>
          <cite>— App Store review, 5.0★ rating</cite>
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

export const PAGES = [
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
    icon: "pk-icon.png",
    sub: "Driveways, garages, and private lots — booked in seconds from real people in your neighborhood. A peer-to-peer parking marketplace, live on the App Store with a 5.0★ rating. My company; built end-to-end.",
    meta: "Parkzy, Inc. · useparkzy.com",
    tags: ["React Native", "Supabase", "Stripe", "Maps", "i18n"],
    links: [
      { label: "Download on the App Store", href: "https://apps.apple.com/us/app/parkzy-find-parking-nearby/id6758564230" },
      { label: "Visit useparkzy.com", href: "https://useparkzy.com" },
    ],
    blocks: [
      { t: "award", badge: "★ 5.0", prize: "Rated 5.0 on the App Store — live in production", lead: "Shipping as", event: "Parkzy: Find Parking Nearby", href: "https://apps.apple.com/us/app/parkzy-find-parking-nearby/id6758564230" },
      { t: "raw", html: PK_DEMO },
      { t: "raw", html: PK_STEPS },
      { t: "raw", html: PK_REVIEW },
      {
        t: "shots",
        h: "On the App Store",
        items: [
          { src: "pk-shot-1.png", title: "Find a spot" },
          { src: "pk-shot-2.png", title: "Booked" },
          { src: "pk-shot-3.png", title: "Host earnings" },
          { src: "pk-shot-4.png", title: "Get started" },
        ],
        note: "The real App Store listing — “Stop Circling for Parking. Name your price and book a private spot in seconds.”",
      },
      { t: "raw", html: PK_APPCARD },
      {
        t: "features",
        h: "For spot hosts",
        items: [
          { title: "List in seconds", desc: "Put an unused driveway, lot, or private space online in under a minute." },
          { title: "Earn automatically", desc: "Get paid every time a driver parks — pricing, scheduling, and availability all in your control." },
          { title: "Accept from the lock screen", desc: "v2.2 — approve or decline a parking request straight from the notification, without opening the app." },
        ],
      },
      {
        t: "features",
        h: "For drivers",
        items: [
          { title: "Guaranteed parking", desc: "Find a spot when you actually need it — book last-minute or reserve ahead." },
          { title: "Pay in-app", desc: "Apple Pay and Google Pay through Stripe. No cash, no Venmo, no sketchiness." },
          { title: "Talk to a human", desc: "A live chat thread with your host — access notes, voice messages, gate codes." },
        ],
      },
      { t: "text", h: "Under the Hood", html: "<p>React Native + Supabase + Stripe + native maps, with English/Spanish localization — one codebase from database to App Store. Payments, real-time host pings, push notifications with actionable buttons, chat with voice notes, host analytics: all built end-to-end, all in production at <a href=\"https://useparkzy.com\" target=\"_blank\" rel=\"noopener\" style=\"color:var(--cyan)\">useparkzy.com ↗</a>.</p>" },
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
        t: "video",
        h: "Watch the Demo",
        src: "gosan-demo.mp4",
        poster: "gosan-poster.jpg",
        title: "Gosan demo — the song starter arranging a track inside a native macOS DAW",
        note: "▶ Sound on — it's a DAW. The song starter arranges an idea, then it lands as editable tracks in a real native timeline.",
      },
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
        t: "video",
        h: "Watch the Demo",
        src: "mehdi-demo.mp4",
        poster: "mehdi-poster.jpg",
        title: "Mehdi demo — linking accounts read-only, catching runaway subscriptions, and asking the advisor what to cancel",
        note: "Link your accounts read-only, and Mehdi maps every transaction — catching the subscriptions quietly draining you, and answering “what should I cancel first?” from your real data.",
      },
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
    slug: "lincoln",
    title: "Lincoln",
    category: "AI / ML",
    year: "2026",
    sub: "Tinder for jobs. Swipe through scraped postings and a recommender learns your taste from every swipe — no forms, no filters, just implicit feedback. Swipe right, and it drafts you a tailored resume.",
    tags: ["Next.js", "FastAPI", "scikit-learn", "Postgres", "Claude"],
    links: [{ label: "Source on GitHub", href: "https://github.com/MiladFarazian/Lincoln" }],
    blocks: [
      {
        t: "video",
        h: "Watch the Demo",
        src: "lincoln-demo.mp4",
        poster: "lincoln-poster.jpg",
        title: "Lincoln demo — swiping through job postings, the recommender retraining, and a tailored resume draft",
        note: "▶ Sound on. Swipe right on the good ones — it retrains on your taste every 20 swipes, then drafts the resume.",
      },
      { t: "text", h: "The Loop", html: "<p>Scrape postings → swipe left/right → after every <strong>20 new swipes</strong>, a background task retrains a <strong>TF-IDF + Logistic Regression</strong> model on your swipe history → the feed re-ranks toward what you actually like. No preference forms, no keyword filters — the model reads your taste from behavior alone.</p>" },
      {
        t: "features",
        h: "How It's Built",
        items: [
          { title: "Swipe UI", desc: "Next.js + TypeScript front-end — postings as cards, one decision at a time." },
          { title: "Self-retraining recommender", desc: "TfidfVectorizer + LogisticRegression over your swipe history; trains once 20 labeled swipes exist, then retrains automatically every 20 more. Artifacts pickled and reloaded on boot." },
          { title: "Job-board scraper", desc: "FastAPI + SQLAlchemy backend keeps the deck stocked with fresh postings in Postgres." },
          { title: "Resume crafting", desc: "Right-swiped a job? Claude drafts a resume tailored to that exact posting via the Anthropic API." },
        ],
      },
      { t: "text", h: "Status", html: "<p>Dockerized and deployed on Railway — scraper, recommender, and resume crafting all running as one service.</p>" },
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
    tags: ["React", "Next.js", "Tailwind", "Supabase"],
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
    year: "2021",
    sub: "A Spotify-Wrapped for school — a browser extension that turns your Canvas account into a color-coded semester recap. Winner of the Secret Prize at CruzHacks 2021.",
    meta: "Vinay Venkat · Milad Farazian · Bryce Tsuyuki",
    tags: ["JavaScript", "WebExtensions", "Canvas API", "Bulma"],
    links: [
      { label: "View on Devpost", href: "https://devpost.com/software/canvas-year-in-review" },
      { label: "Source on GitHub", href: "https://github.com/cool00geek/canvas-year" },
    ],
    blocks: [
      { t: "award", prize: "Secret Prize — Wildest Idea", event: "CruzHacks 2021", href: "https://devpost.com/software/canvas-year-in-review" },
      { t: "embed", h: "Demo", html: '<iframe src="https://www.youtube.com/embed/IAeu4GNfjp8?rel=0" title="Canvas Year in Review — demo" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>' },
      { t: "text", h: "Inspiration", html: "<p>Built mid-pandemic, when every class had been forced online — most of them through <strong>Canvas</strong>, the platform universities use to centralize courses, assignments, and grades. All that data was just sitting there. We turned it into a recap.</p>" },
      { t: "text", h: "What It Does", html: "<p>Canvas Year in Review analyzes every assignment submission in your account and generates the semester's stats — then presents them in a dashboard where each metric is color-coded <span style=\"color:#7cff8b\">green</span>, <span style=\"color:#ffc35e\">yellow</span>, or <span style=\"color:#ff5470\">red</span> so you can gauge your performance at a glance.</p>" },
      {
        t: "features",
        h: "The Report",
        items: [
          { title: "Assignments & submissions", desc: "Total assignments assigned vs. how many you actually submitted." },
          { title: "Late & missing", desc: "Every deadline you slipped past — and the ones that never got anything at all." },
          { title: "Rush submissions", desc: "Assignments turned in less than 30 minutes before the due date. The panic metric." },
          { title: "Grade averages", desc: "Average grades across assignments and across all courses." },
        ],
      },
      { t: "text", h: "How We Built It", html: "<p>JavaScript on the <strong>WebExtensions</strong> framework, with the UI in HTML/CSS styled with <strong>Bulma</strong>. The extension talks to the <strong>Canvas API</strong> to fetch courses and assignments, then runs all the analytics locally — your data never leaves the browser.</p><p>It was our first browser extension, and the first hackathon project we both finished <em>and</em> were proud to look at — my corner of it was the CSS and debugging support.</p>" },
      { t: "text", h: "What's Next", html: "<p>Custom time periods to snapshot, including or excluding specific courses, and sharing your year-in-review as an image on social media — Wrapped all the way.</p>" },
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
    slug: "how-i-build-with-ai",
    title: "How I Build With AI",
    category: "Writing",
    year: "2026",
    sub: "The question every interview asks now: how do you actually use AI in your work? Here's the real answer — the loop, the judgment, and the verification system that makes AI-accelerated development fast without making it sloppy.",
    tags: ["AI-Paired Dev", "Verification", "Essay"],
    links: [{ label: "Work with me", href: "/hire/", internal: true }],
    blocks: [
      { t: "text", h: "The honest version", html: "<p>There are two bad answers to “how do you use AI to build?” One is “I don't” — which in 2026 means leaving a force multiplier on the table. The other is “I let it write everything” — which means shipping code you don't understand. I do neither. I treat AI as the fastest junior engineer I've ever worked with: tireless, occasionally brilliant, occasionally confidently wrong — and never the one accountable for what merges. That's still me.</p>" },
      { t: "text", h: "The proof", html: "<p>I built <a href=\"/work/parkzy/\" style=\"color:var(--cyan)\">Parkzy</a> — a live App Store marketplace (5.0★, 1,000+ downloads) — end to end as sole engineer: <strong>~3,600 commits in 10 months, 392 database migrations, 163 serverless edge functions</strong>, with production LLM features. I built <a href=\"/work/gosan/\" style=\"color:var(--cyan)\">Gosan</a>, a native macOS DAW, in about ten days. That velocity is impossible the old way — and <em>reckless</em> the naive way. The entire difference between the two is the system around the speed.</p>" },
      { t: "text", h: "What I delegate, what I own", html: "<p>I work in a tight <strong>plan → generate → verify</strong> loop. I own every part that needs judgment: the architecture, the data model, what the product should even do, and the review of every line before it lands. I hand off the parts that are mechanical or fully specified — boilerplate, migrations, test scaffolding, wide refactors, the first draft of a function. I never merge code I haven't read and understood. The AI writes fast; I decide what's correct.</p>" },
      { t: "text", h: "Velocity without verification is just faster bugs", html: "<p>This is the part most people skip, and it's the whole game. Speed only compounds if it's safe. So every change runs a gauntlet: <strong>Playwright end-to-end tests, Vitest, and Deno suites in CI</strong>; <strong>Sentry</strong> for what escapes into production; <strong>PostHog</strong> to check that a feature actually helped a real user. And a human reviews every merge. The tests aren't bolted on at the end — they're what lets me move this fast without breaking what's live. AI-accelerated, not AI-sloppy.</p>" },
      { t: "text", h: "I don't just use AI — I build with it", html: "<p>The tools are one layer; the interesting work is a level up. I write <strong>agentic workflows</strong> — Claude Code automations that audit a codebase, check migrations for drift, and gate releases — so my own process improves itself. It's the same muscle I'd bring to building agentic features and automations for a client: not prompting a chatbot, but engineering a system that reasons and acts, with guardrails.</p>" },
      { t: "text", h: "Why this is the job now", html: "<p>The multiplier was never “AI writes my code.” It's <strong>judgment about what to hand off, the discipline to verify everything, and the taste to know when the machine is wrong</strong> — applied at several times the old speed. That's senior engineering in 2026, and it's exactly what I do for teams. If that's the kind of engineer you're looking for, <a href=\"/hire/\" style=\"color:var(--cyan)\">let's talk</a>.</p>" },
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

// ============================================================
// RESUME PAGE — /resume/ (content mirrors public/Milad_Farazian_Resume.pdf;
// email only on the page — the phone number stays in the PDF)
// ============================================================
const rsJob = (role, org, where, when, bullets) =>
  `<div class="rs-item" data-reveal><div class="rs-item__head"><div><b>${org}</b><span class="rs-role">${role}</span></div><span class="rs-when">${where} · ${when}</span></div><ul>${bullets.map((b) => `<li>${b}</li>`).join("")}</ul></div>`;

const RESUME_HTML = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
    <meta name="theme-color" content="#04060a" />
    <title>Resume — Milad Farazian</title>
    <meta name="description" content="Milad Farazian — full-stack software engineer with AI depth. Parkzy co-founder & CTO, ex-Walmart SWE II, USC M.S. in Computer Science (AI)." />
    <link rel="canonical" href="https://farazian.com/resume/" />
    <meta property="og:type" content="profile" />
    <meta property="og:site_name" content="Milad Farazian" />
    <meta property="og:title" content="Resume — Milad Farazian" />
    <meta property="og:description" content="Full-stack software engineer with AI depth. Parkzy co-founder & CTO, ex-Walmart, USC M.S. CS (AI)." />
    <meta property="og:url" content="https://farazian.com/resume/" />
    <meta property="og:image" content="https://farazian.com/og.png" />
    <meta name="twitter:card" content="summary_large_image" />
    <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
    <link rel="apple-touch-icon" href="/icon-180.png" />
    <link rel="manifest" href="/site.webmanifest" />
    <link rel="preload" href="/fonts/space-grotesk-latin.woff2" as="font" type="font/woff2" crossorigin />
    <link rel="preload" href="/fonts/jetbrains-mono-latin.woff2" as="font" type="font/woff2" crossorigin />
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
      <section class="proj__hero">
        <p class="proj__eyebrow" data-reveal>resume</p>
        <h1 class="proj__title" data-reveal>Milad Farazian</h1>
        <p class="proj__sub" data-reveal>Full-stack software engineer with AI depth: built Parkzy, a live peer-to-peer parking marketplace (App Store, 5.0★, 1,000+ downloads), end to end as sole engineer — payments, AWS infrastructure, production LLM features. Ex-Walmart SWE II; USC M.S. in Computer Science (AI).</p>
        <div class="proj__links" data-reveal>
          <a class="btn btn--primary" href="/Milad_Farazian_Resume.pdf" data-magnetic data-scramble>Download PDF ↓</a>
          <a class="btn btn--ghost" href="mailto:miladfarazian@gmail.com" data-magnetic data-scramble>Email me</a>
          <a class="btn btn--ghost" href="https://linkedin.com/in/miladfarazian" target="_blank" rel="noopener" data-magnetic data-scramble>LinkedIn ↗</a>
        </div>
      </section>
      <section class="proj__section">
        <h2 data-reveal>Experience</h2>
        ${rsJob("Co-founder & CTO", "Parkzy", "Los Angeles", "Sep 2025 – Present", [
          "Built Parkzy from zero to a live App Store product (5.0★, 1,000+ downloads) as sole engineer — React 18/TypeScript/Supabase across web and iOS via Capacitor, 392 SQL migrations, 163 serverless edge functions, 3,600+ commits in 10 months",
          "Designed the core real-time “ping” matching system — one tap alerts every nearby host, built for sub-60-second accepts — with Mapbox GL geospatial search, dynamic pricing, and Stripe Connect + Stripe Identity payments and ID verification",
          "Maintained production quality solo: Playwright E2E, Vitest, and Deno test suites in CI, Sentry error tracking, and PostHog product analytics",
        ])}
        ${rsJob("Co-founder & CTO", "StudyBuddy", "Los Angeles", "Dec 2024 – Aug 2025", [
          "Led a 5-person team building a tutoring platform for USC students with scheduling and user profiles (React/TypeScript + Supabase/Postgres)",
          "Shipped the platform end to end — 394 TypeScript source files, 86 SQL migrations, and 39 serverless edge functions",
        ])}
        ${rsJob("Software Engineer II (Full-Stack)", "Walmart", "Sunnyvale", "Feb 2022 – May 2023", [
          "Built 10+ features for Converse Self Serve, tooling for Walmart's Dialogflow-based conversational-AI platform behind 66M+ AI-assisted customer contacts, alongside the NLP team",
          "Integrated push notification API into Last Mile Delivery servers — 4,700 stores reaching 90% of the US — on a 4-person US–India team",
          "Migrated 32 config features and 50+ testing tools from Cortex to Botmock, Walmart's newly acquired Self Serve platform",
        ])}
        ${rsJob("Software Engineer Intern", "Walmart", "Sunnyvale", "Jun 2021 – Aug 2021", [
          "Prototyped a Node.js CLI for Cortex (3 proof-of-concepts); built a CSAT feedback system that collected 6M+ customer ratings by Mar 2022",
        ])}
      </section>
      <section class="proj__section">
        <h2 data-reveal>Projects</h2>
        <div class="rs-projects" data-reveal>
          <a href="/work/gosan/"><b>Gosan →</b><span>Native macOS DAW with an AI taste engine — ~11,300 LOC in ~10 days. Swift, SwiftUI, AVAudioEngine.</span></a>
          <a href="/work/mehdi/"><b>Mehdi →</b><span>Plaid-linked financial assistant — a deterministic engine computes every number; the LLM explains only code-verified facts.</span></a>
          <a href="/work/lincoln/"><b>Lincoln →</b><span>Swipe-based job search — TF-IDF + logistic regression recommender retraining every 20 swipes, plus Claude resume tailoring.</span></a>
        </div>
      </section>
      <section class="proj__section">
        <h2 data-reveal>Education</h2>
        ${rsJob("M.S. Computer Science — Artificial Intelligence", "University of Southern California", "Los Angeles", "Aug 2023 – May 2025", [
          "Coursework: Applied Natural Language Processing, Fundamentals of Artificial Intelligence",
        ])}
        ${rsJob("B.S. Computer Science, Minor in Economics", "UC Santa Cruz", "Santa Cruz", "Sep 2018 – Dec 2021", [
          "GPA 3.74 · CruzHacks awards: Secret Prize 2021 — Wildest Idea (Canvas Year in Review) · Best Use of Google Cloud Platform",
          "Solution Challenge Coordinator for Google's Developer Student Club",
        ])}
      </section>
      <section class="proj__section" data-reveal>
        <h2>Skills</h2>
        <div class="proj__tags rs-skills">
          ${["TypeScript", "Python", "React", "Node.js", "Next.js", "Swift / SwiftUI", "Capacitor", "React Native", "LLM APIs (Anthropic, OpenAI)", "pgvector / semantic search", "PyTorch", "Hugging Face", "scikit-learn", "PostgreSQL / Supabase", "AWS", "Terraform", "Docker", "GitHub Actions", "Stripe Connect + Identity"].map((t) => `<span class="tag">${t}</span>`).join("")}
        </div>
      </section>
      <footer class="footer">
        <span>© <span id="year">2026</span> Milad Farazian</span>
        <a href="/#work" data-scramble>← back to work</a>
      </footer>
    </main>
    <script type="module" src="/src/project/main.ts"></script>
  </body>
</html>
`;

// ============================================================
// HIRE PAGE — /hire/  (freelance services; prices are starting anchors)
// ============================================================
const hireSvc = (tag, name, price, desc, includes) =>
  `<div class="hire-svc" data-reveal><div class="hire-svc__top"><span class="hire-svc__tag">${tag}</span><span class="hire-svc__price">${price}</span></div><h3>${name}</h3><p>${desc}</p><ul>${includes.map((i) => `<li>${i}</li>`).join("")}</ul></div>`;

const HIRE_HTML = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
    <meta name="theme-color" content="#04060a" />
    <title>Hire Me — Milad Farazian</title>
    <meta name="description" content="Work with Milad Farazian — fractional AI/engineering advisor, automation & AI agents, and production LLM features. Part-time, Los Angeles, remote-friendly." />
    <link rel="canonical" href="https://farazian.com/hire/" />
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="Milad Farazian" />
    <meta property="og:title" content="Hire Milad Farazian — AI & Full-Stack Engineering" />
    <meta property="og:description" content="Fractional AI/engineering advisor · automation & AI agents · production LLM features. The engineer who shipped a live App Store product solo." />
    <meta property="og:url" content="https://farazian.com/hire/" />
    <meta property="og:image" content="https://farazian.com/og.png" />
    <meta name="twitter:card" content="summary_large_image" />
    <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
    <link rel="apple-touch-icon" href="/icon-180.png" />
    <link rel="manifest" href="/site.webmanifest" />
    <link rel="preload" href="/fonts/space-grotesk-latin.woff2" as="font" type="font/woff2" crossorigin />
    <link rel="preload" href="/fonts/jetbrains-mono-latin.woff2" as="font" type="font/woff2" crossorigin />
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
      <section class="proj__hero">
        <p class="proj__eyebrow" data-reveal>work with me</p>
        <h1 class="proj__title" data-reveal>Ship AI features that survive real users.</h1>
        <p class="proj__sub" data-reveal>I'm a full-stack engineer with real AI depth — I built <a href="/work/parkzy/" style="color:var(--cyan)">Parkzy</a>, a live App Store marketplace (5.0★, 1,000+ downloads), end to end as sole engineer, LLM features and all. Now I take on a few focused engagements at a time: <strong>advisory, automation, and production AI</strong>.</p>
        <div class="proj__links" data-reveal>
          <a class="btn btn--primary" href="mailto:miladfarazian@gmail.com?subject=Project%20inquiry" data-magnetic data-scramble>Start a project →</a>
          <a class="btn btn--ghost" href="/#work" data-magnetic data-scramble>See the work</a>
          <a class="btn btn--ghost" href="/resume/" data-magnetic data-scramble>Resume</a>
        </div>
      </section>

      <section class="proj__section">
        <h2 data-reveal>How I can help</h2>
        <div class="hire-grid">
          ${hireSvc(
            "Fractional advisor",
            "Fractional AI / Engineering Advisor",
            "from $1,500/mo",
            "Your on-call senior engineer for AI and architecture decisions — for startups without a senior eng in the building. Retainer or per-session.",
            ["Working calls + async review (Slack/email)", "Architecture, model choice, build-vs-buy", "Code & AI reviews on your real repo", "Also available per-session — from $250 / 90 min"]
          )}
          ${hireSvc(
            "Automation & agents",
            "Automation & AI Agents",
            "from $1,500",
            "Fixed-scope builds that hand a repetitive process to an agent or script — internal tooling, data pipelines, Claude Code / agentic workflows.",
            ["One scoped automation or agent, shipped", "Runs in your stack — no lock-in", "Docs + a handoff walkthrough", "Typical turnaround: 1–2 weeks"]
          )}
          ${hireSvc(
            "AI features",
            "AI Features Into Your Product",
            "from $3,000",
            "Drop a production LLM/RAG/chatbot or semantic-search feature into your existing app — the same work I shipped inside Parkzy.",
            ["Design, build, and ship one AI feature", "RAG / embeddings / function-calling as needed", "Evals + guardrails so it survives real users", "Integrated into your codebase, tested"]
          )}
          ${hireSvc(
            "Start here",
            "AI / Codebase Audit",
            "from $500",
            "A fast, honest review of your codebase or AI setup — where it's fragile, what to fix first, what's worth building. The low-risk way to start.",
            ["Deep read of your repo or AI stack", "Written report: risks, quick wins, roadmap", "A live call to walk through it", "Credited toward a larger project if you continue"]
          )}
        </div>
      </section>

      <section class="proj__section" data-reveal>
        <h2>Why me</h2>
        <div class="hire-proof">
          <div><b>Shipped, not theoretical</b><span>A live App Store product (5.0★), built solo — 392 migrations, 163 edge functions, production LLM features. I've done this for real.</span></div>
          <div><b>Fast</b><span>A native macOS DAW in ~10 days; new products from zero on a regular cadence. You'll see progress in days, not months.</span></div>
          <div><b>Verified</b><span>Playwright/Vitest in CI, Sentry, human review of every merge. AI-accelerated, not AI-sloppy.</span></div>
        </div>
      </section>

      <section class="proj__section" data-reveal>
        <h2>How it works</h2>
        <div class="pk-steps">
          <div class="pk-step"><i>01</i><b>Intro call</b><p>15–20 minutes. You tell me the problem; I tell you honestly whether I'm the right fit and how I'd approach it.</p></div>
          <div class="pk-step"><i>02</i><b>Scoped proposal</b><p>A fixed scope, price, and timeline in writing. 50% deposit to start — no open-ended hourly surprises.</p></div>
          <div class="pk-step"><i>03</i><b>Build &amp; ship</b><p>I build in your stack with regular check-ins, hand it off with docs, and it's yours. Balance due on delivery.</p></div>
        </div>
        <p class="proj-note">Part-time and selective — I take a few engagements at a time, so the ones I take get real focus. Los Angeles · remote-friendly.</p>
        <div class="proj__links" data-reveal style="margin-top:1.6rem">
          <a class="btn btn--primary" href="mailto:miladfarazian@gmail.com?subject=Project%20inquiry" data-magnetic data-scramble>Email me →</a>
          <a class="btn btn--ghost" href="https://linkedin.com/in/miladfarazian" target="_blank" rel="noopener" data-magnetic data-scramble>LinkedIn ↗</a>
        </div>
      </section>
      <footer class="footer">
        <span>© <span id="year">2026</span> Milad Farazian</span>
        <a href="/#work" data-scramble>← back to work</a>
      </footer>
    </main>
    <script type="module" src="/src/project/main.ts"></script>
  </body>
</html>
`;

// ---- write ----
for (const p of PAGES) {
  const dir = resolve(ROOT, "work", p.slug);
  mkdirSync(dir, { recursive: true });
  writeFileSync(resolve(dir, "index.html"), page(p));
  console.log(`generated work/${p.slug}/index.html`);
}
mkdirSync(resolve(ROOT, "resume"), { recursive: true });
writeFileSync(resolve(ROOT, "resume", "index.html"), RESUME_HTML);
console.log("generated resume/index.html");
mkdirSync(resolve(ROOT, "hire"), { recursive: true });
writeFileSync(resolve(ROOT, "hire", "index.html"), HIRE_HTML);
console.log("generated hire/index.html");

// ---- sitemap + robots (kept in sync with the generated pages) ----
const BASE = "https://farazian.com";
const urls = [`${BASE}/`, `${BASE}/hire/`, `${BASE}/resume/`, ...PAGES.map((p) => `${BASE}/work/${p.slug}/`)];
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
