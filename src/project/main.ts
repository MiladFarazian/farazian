// Runtime for project detail pages — cohesive with the homepage:
// custom cursor, magnetic elements, text-scramble, smooth scroll, reveals.
import "../styles/main.css";
import "../styles/project.css";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

import { detectDevice } from "../core/device";
import { initSmoothScroll } from "../core/smoothScroll";
import { initCursor } from "../ui/cursor";
import { initScramble } from "../ui/scramble";
import { initAnalytics } from "../ui/analytics";
import { initVitals } from "../ui/vitals";

gsap.registerPlugin(ScrollTrigger);

const html = document.documentElement;
html.classList.add("js");

const profile = detectDevice();
if (profile.reducedMotion) html.classList.add("reduced-motion");

initAnalytics();
try {
  initVitals(); // real-user metrics → /status
} catch {
  /* metrics are optional */
}
initSmoothScroll(profile.reducedMotion);
initCursor();
initScramble();

// Reveal-on-scroll for [data-reveal].
if (!profile.reducedMotion) {
  gsap.utils.toArray<HTMLElement>("[data-reveal]").forEach((el) => {
    gsap.to(el, {
      opacity: 1,
      y: 0,
      duration: 0.9,
      ease: "power3.out",
      scrollTrigger: { trigger: el, start: "top 90%" },
    });
  });
}

// Year in footer.
const yearEl = document.getElementById("year");
if (yearEl) yearEl.textContent = String(new Date().getFullYear());

// Deep-dive tabs (Parkzy). Supports #tab-<id> deep links — including the
// 301s from the tabs' former standalone URLs.
const tabRoot = document.getElementById("pk-tabs");
if (tabRoot) {
  const tabs = Array.from(tabRoot.querySelectorAll<HTMLButtonElement>(".pk-tabs__tab"));
  const panels = Array.from(tabRoot.querySelectorAll<HTMLElement>(".pk-tabs__panel"));
  const activate = (id: string, scroll = false) => {
    const panel = document.getElementById(`tab-${id}`);
    if (!panel) return;
    tabs.forEach((t) => {
      const on = t.dataset.tab === id;
      t.classList.toggle("is-on", on);
      t.setAttribute("aria-selected", String(on));
    });
    panels.forEach((p) => (p.hidden = p !== panel));
    ScrollTrigger.refresh(); // page height changed under the triggers
    if (scroll) tabRoot.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  tabs.forEach((t) => t.addEventListener("click", () => activate(t.dataset.tab || "")));
  const fromHash = () => {
    const m = location.hash.match(/^#tab-([a-z0-9-]+)$/);
    if (m) activate(m[1], true);
  };
  window.addEventListener("hashchange", fromHash);
  fromHash();
}

// Interactive per-project demos: any element with data-demo="<slug>" pulls in
// its self-contained /work/<slug>/demo.js, loaded only on the page that needs
// it (each script self-boots on its own container, regardless of timing).
new Set(
  Array.from(document.querySelectorAll<HTMLElement>("[data-demo]"), (el) => el.dataset.demo)
).forEach((slug) => {
  if (!slug) return;
  const s = document.createElement("script");
  s.src = `/work/${slug}/demo.js`;
  s.defer = true;
  document.body.appendChild(s);
});
