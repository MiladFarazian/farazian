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

gsap.registerPlugin(ScrollTrigger);

const html = document.documentElement;
html.classList.add("js");

const profile = detectDevice();
if (profile.reducedMotion) html.classList.add("reduced-motion");

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
