// Generates the cohesive /work/<slug>/index.html project pages from data.
// Run via the "prebuild" npm hook (and committed for dev). Single source of
// truth for project-page content.
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const esc = (s) =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

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
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;700&display=swap" rel="stylesheet" />
  </head>
  <body>
    <div class="cursor" id="cursor" aria-hidden="true"><div class="cursor__dot"></div><div class="cursor__ring"></div></div>
    <div class="fx-overlay" aria-hidden="true"></div>
    <header class="nav">
      <a class="nav__brand" href="/" data-magnetic><span class="nav__brand-mark">MF</span></a>
      <a class="nav__back" href="/#work" data-magnetic data-scramble><span class="arrow">←</span> all work</a>
    </header>
    <main class="proj">
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
        <div class="rt-demo">
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
      { t: "figure", h: "The Model", html: "<p>LMBiS-Net is a CNN consisting of three encoder blocks, a bottleneck layer, and three decoder blocks. It uses multipath feature-extraction blocks and bidirectional skip connections to enhance information flow between the encoders and decoders.</p>", src: "LMBiS.png", title: "LMBiS-Net architecture" },
      { t: "figure", h: "Multi-Path Feature Extraction", html: "<p>This component introduces feature diversity into the model, reducing overfitting and improving generalization. By using different-sized convolutions, the network captures both low-level and high-level features crucial for blood-vessel segmentation.</p>", src: "multipath.png", title: "Multi-path feature extraction block" },
      { t: "text", h: "Our Contribution", html: "<p>We created the <strong>first publicly available implementation</strong> of LMBiS-Net and developed code to augment retinal images, increasing the size of training datasets. Our findings support the original paper's claims that LMBiS-Net is a computationally efficient and accurate state-of-the-art model for retinal blood-vessel segmentation.</p>" },
      {
        t: "gallery",
        h: "Results",
        items: [
          { src: "results_comparison.png", title: "Metrics", caption: "AUC, Sensitivity & Specificity vs. the original paper" },
          { src: "predictions.png", title: "Predictions", caption: "Input, model prediction, and ground truth" },
        ],
      },
    ],
  },

  {
    slug: "llm-distillation",
    title: "LLM Distillation for Financial Reports",
    category: "AI / ML",
    year: "2024",
    sub: "Using knowledge distillation to build a financial-analysis model that is computationally efficient and specialized for financial contexts — without the cost of hosting a full-size LLM.",
    meta: "Harshit Shah · Sebastian Escalante · Milad Farazian · Rizq Khateeb",
    tags: ["Python", "LLMs", "Distillation", "NLP"],
    blocks: [
      { t: "text", h: "Problem", html: "<p>We used distillation to develop a financial-analysis tool that is computationally efficient and simpler than traditional LLMs, while being specialized for financial contexts. LLMs cannot be efficiently used and hosted on an ad-hoc basis — so we aimed to train smaller models that are easily accessible.</p>" },
      { t: "text", h: "Why It Matters", html: "<p>Financial-analysis tools are essential for evaluating a company's fiscal health. Current tools demand significant computational resources while remaining too general to stay consistently accurate in financial contexts. Distillation combines the strengths of multiple models while being far more resource-efficient — making advanced financial analysis accessible, and improving decision-making across industries.</p>" },
      { t: "figure", h: "Methodology", html: "<p>The approach is depicted in Fig. 1. We take a large unified dataset, perform the required preprocessing, and pass it to large, renowned LLMs such as <strong>Claude 3.5 Haiku</strong> and <strong>Meta's Llama 3</strong> to generate “labels” and “rationales.” Combining these, we train a much smaller model (in terms of parameters — e.g. Flan-T5 or GPT-2) on the outputs and rationales of the big models.</p>", src: "llm_mapping.png", title: "Fig. 1 — Distillation pipeline" },
      { t: "text", h: "Discussion", html: "<p>LLaMA 3 and Claude 3.5 excel in similar areas, making distillation effective for combining their strengths. T5 distilled from LLaMA 3 outperforms FinGPT — indicating that step-by-step distillation is more effective than fine-tuning or LoRAs, offering cost-efficient performance and suggesting distillation is a promising optimization strategy.</p>" },
      { t: "figure", h: "Results", html: "<p>We provided a model that outperforms current LoRAs and fine-tuned GPTs using <strong>less than 12% of the original dataset</strong> (Sentiment Train FinGPT) on the FPB benchmark. It not only takes less training time, but inference is dramatically faster — making the model usable in resource-constrained systems.</p>", src: "llm_results.png", title: "Benchmark results" },
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
      { t: "game", src: "/games/katsuya/index.html", title: "Katsuya's Revenge", note: "▶ Click the game to focus it, then play. For the best experience, play on desktop with sound on." },
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
      { t: "game", src: "/games/bound/index.html", title: "Bound", ratio: "3 / 2", note: "▶ Move your mouse to steer, click Start to play. A p5.js web port of the original Java game." },
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
    sub: "A talk on how algorithms trained on real-world data automate existing bias along race and sex — even absent any ill intent.",
    tags: ["Ethics", "ML"],
    blocks: [
      { t: "text", h: "Abstract", html: "<p>Inspired by Professor Lise Getoor's <em>Ethics &amp; Algorithms</em> course and Ruha Benjamin's <em>The New Jim Code</em>, this presentation shows how — even without malicious intent — algorithms trained on past real-life data tend to automate and amplify existing discrimination on the basis of race and sex. Bias doesn't have to be designed in; it's often inherited from the data we feed the machine.</p>" },
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
