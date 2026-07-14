import "./styles/main.css";
import { gsap } from "gsap";

import { detectDevice } from "./core/device";
import { initSmoothScroll } from "./core/smoothScroll";
import { buildContent, initReveals, initWorkCards } from "./sections/sections";
import type { ParticleHero } from "./webgl/ParticleHero";
import { initCursor } from "./ui/cursor";
import { initScramble } from "./ui/scramble";
import { initScrollFX } from "./ui/scrollfx";
import { initGuestbook } from "./ui/guestbook";
import { initPalette, type Command } from "./ui/palette";
import { initTerminal } from "./ui/terminal";
import { applyThemeMode, THEME_WORDS } from "./ui/modes";
import { initFps } from "./ui/fps";
import { initKonami } from "./ui/konami";
import { initAnalytics } from "./ui/analytics";

const html = document.documentElement;
html.classList.add("js");
initAnalytics();

const profile = detectDevice();
if (profile.reducedMotion || !profile.supportsWebGL) {
  html.classList.add("reduced-motion");
}

// ----- Build DOM content first (so cursor/scramble can bind to it) -----
buildContent();

// ----- Smooth scroll -----
const scroller = initSmoothScroll(profile.reducedMotion);

// ----- Reveals + interactions -----
initReveals(profile.reducedMotion);
initWorkCards(profile.reducedMotion);
initCursor();
initScramble();
initScrollFX(scroller.scrollTo);
initGuestbook();

// ----- WebGL hero (loaded as a separate chunk so the initial JS stays small) -----
// Three.js is ~130kB gzipped; splitting it out lets the page become interactive
// before it arrives. The boot overlay masks the load, and every hero call site
// is null-guarded so nothing breaks while the chunk is in flight.
const canvas = document.getElementById("gl") as HTMLCanvasElement;
const heroEl = document.getElementById("hero")!;
let hero: ParticleHero | null = null;
let booted = false;
const useWebGL = !profile.reducedMotion && profile.supportsWebGL;

// Scroll drives the dissolve + camera dolly (a no-op until the hero loads).
const onHeroScroll = () => {
  if (!hero) return;
  const y = window.scrollY;
  hero.setScatter(gsap.utils.clamp(0, 1, y / (window.innerHeight * 0.6)));
  hero.setFade(gsap.utils.clamp(0, 1, 1 - y / (window.innerHeight * 0.85)));
  hero.setScrollProgress(gsap.utils.clamp(0, 1, y / window.innerHeight));
};
window.addEventListener("scroll", onHeroScroll, { passive: true });

// Pause the heavy GPGPU sim while the hero is offscreen.
function startHeroTracking() {
  if (!hero) return;
  const h = hero;
  const io = new IntersectionObserver(
    (entries) => h.setRunning(entries[0].isIntersecting),
    { rootMargin: "0px 0px 40% 0px" }
  );
  io.observe(heroEl);
}

// Post-boot kickoff: assemble the name, push the camera in, track visibility.
// Runs from whichever finishes last — boot completion or the chunk arriving.
function startHero() {
  if (!hero) return;
  hero.refreshFormation(); // re-rasterize with the now-loaded webfont
  hero.setRunning(true);
  hero.form(0.1);
  hero.playIntro(); // camera push-in synced with the assemble
  startHeroTracking();
  onHeroScroll();
}

async function loadHero() {
  if (!useWebGL) return;
  try {
    const { ParticleHero } = await import("./webgl/ParticleHero");
    const h = new ParticleHero(canvas, profile);
    if (h.didFail) {
      html.classList.add("reduced-motion");
      return;
    }
    hero = h;
    // Particles render the name; hide the DOM heading (kept for a11y/SEO).
    html.classList.add("webgl-active");
    if (booted) startHero(); // boot already finished while the chunk loaded
  } catch (err) {
    console.warn("[hero] WebGL hero failed to load:", err);
    html.classList.add("reduced-motion");
  }
}
loadHero();

// ----- FPS meter + auto-throttle -----
const fps = initFps(profile.tier);
fps.onLowPerf(() => {
  // If we're dropping frames, dim ambition: stop the heavy hero when offscreen
  // is already handled; here we just surface the tier.
  console.info("[perf] sustained low fps — consider lighter tier");
});

// ----- Terminal (easter egg) -----
const terminal = initTerminal(
  (sel) => scroller.scrollTo(sel, { offset: 0 }),
  {
    form: (text) => hero?.setText(text),
    theme: (name) => applyThemeMode(name),
  }
);

// ----- Command palette -----
const commands: Command[] = [
  { id: "work", label: "Go to Work", icon: "▸", hint: "02", run: () => scroller.scrollTo("#work") },
  { id: "about", label: "Go to About", icon: "▸", hint: "01", run: () => scroller.scrollTo("#about") },
  { id: "stack", label: "Go to Stack", icon: "▸", hint: "03", run: () => scroller.scrollTo("#stack") },
  { id: "guestbook", label: "Sign the guestbook", icon: "✍", hint: "04", run: () => scroller.scrollTo("#guestbook") },
  { id: "contact", label: "Go to Contact", icon: "▸", hint: "05", run: () => scroller.scrollTo("#contact") },
  { id: "top", label: "Back to top", icon: "↑", run: () => scroller.scrollTo(0) },
  { id: "terminal", label: "Open terminal", icon: "›_", hint: "easter egg", run: () => terminal.open() },
  { id: "hire", label: "Hire me", icon: "◈", hint: "freelance", run: () => (window.location.href = "/hire/") },
  { id: "book", label: "Book a call", icon: "◷", hint: "15 min", run: () => window.open("https://cal.com/milad-farazian/15min", "_blank") },
  { id: "resume", label: "View resume", icon: "▤", run: () => (window.location.href = "/resume/") },
  { id: "email", label: "Email me", icon: "@", run: () => (window.location.href = "mailto:miladfarazian@gmail.com") },
  { id: "source", label: "View source on GitHub", icon: "</>", run: () => window.open("https://github.com/MiladFarazian/farazian", "_blank") },
  { id: "fps", label: "Toggle FPS meter", icon: "◷", run: () => fps.show() },
];
const palette = initPalette(commands);
document.getElementById("open-palette")?.addEventListener("click", () => palette.open());

// ----- Konami code -----
initKonami(() => {
  fps.show();
  hero?.burstImpulse();
  terminal.open();
});

// ----- Global "type anywhere" listener: typing letters opens terminal -----
let typed = "";
window.addEventListener("keydown", (e) => {
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  const tag = (e.target as HTMLElement)?.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA") return;
  if (e.key.length === 1 && /[a-z]/i.test(e.key)) {
    typed = (typed + e.key.toLowerCase()).slice(-6);
    if (typed.endsWith("help")) terminal.open();
    for (const w of THEME_WORDS) {
      if (typed.endsWith(w)) {
        applyThemeMode(w);
        typed = "";
        break;
      }
    }
  }
  if (e.key === "Escape" && terminal.isOpen()) terminal.close();
});

// ----- Anchor links → smooth scroll -----
document.querySelectorAll<HTMLAnchorElement>('a[href^="#"]').forEach((a) => {
  a.addEventListener("click", (e) => {
    const href = a.getAttribute("href")!;
    if (href.length > 1) {
      e.preventDefault();
      scroller.scrollTo(href);
    }
  });
});

// ----- iOS gyroscope permission (needs a user gesture) -----
const DOE = DeviceOrientationEvent as unknown as {
  requestPermission?: () => Promise<string>;
};
if (profile.isTouch && typeof DOE.requestPermission === "function") {
  const ask = () => {
    DOE.requestPermission?.().catch(() => {});
    window.removeEventListener("pointerdown", ask);
  };
  window.addEventListener("pointerdown", ask, { once: true });
}

// ----- Resize -----
// Rebuild the particle formation only when the WIDTH changes (orientation /
// real resize) — not on iOS toolbar show/hide, which only changes height.
let resizeRAF = 0;
let lastWidth = window.innerWidth;
window.addEventListener("resize", () => {
  cancelAnimationFrame(resizeRAF);
  resizeRAF = requestAnimationFrame(() => {
    hero?.resize();
    if (window.innerWidth !== lastWidth) {
      lastWidth = window.innerWidth;
      hero?.refreshFormation();
    }
  });
});

// ----- Main render loop -----
function loop(now: number) {
  hero?.update();
  fps.tick(now);
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

// ============================================================
// BOOT / PRELOADER
// ============================================================
function runBoot() {
  const boot = document.getElementById("boot")!;
  const fill = document.getElementById("boot-fill")!;
  const pct = document.getElementById("boot-pct")!;
  const label = document.getElementById("boot-label")!;

  const stages = [
    "waking up the renderer",
    "compiling shaders (the pretty ones)",
    "seeding 65,536 particles",
    "teaching them your name",
    "aligning the stars",
    "ready — worth the wait, promise",
  ];

  const completeBoot = () => {
    if (booted) return;
    booted = true;
    boot.classList.add("is-done");
    canvas.classList.add("is-ready");
    startHero(); // no-op if the hero chunk is still loading; loadHero calls it then
    // Reveal hero content with a staggered post-boot entrance.
    gsap.to(".hero [data-reveal]", {
      opacity: 1,
      y: 0,
      duration: 1.1,
      ease: "power3.out",
      stagger: 0.08,
      delay: 0.1,
      overwrite: true,
    });
  };

  const obj = { p: 0 };
  gsap.to(obj, {
    p: 100,
    duration: profile.reducedMotion ? 0.4 : 2.2,
    ease: "power1.inOut",
    onUpdate: () => {
      const v = Math.round(obj.p);
      fill.style.width = v + "%";
      pct.textContent = String(v).padStart(2, "0");
      label.textContent = stages[Math.min(stages.length - 1, Math.floor((v / 100) * stages.length))];
    },
    onComplete: completeBoot,
  });

  // Safety net: never leave the visitor stranded on the boot screen.
  setTimeout(completeBoot, 6000);
}

// Wait for fonts (so text targets rasterize correctly) then boot.
const fontsReady = (document as Document & { fonts?: FontFaceSet }).fonts?.ready;
if (fontsReady) {
  Promise.race([fontsReady, new Promise((r) => setTimeout(r, 1200))]).then(runBoot);
} else {
  runBoot();
}
