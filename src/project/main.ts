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

// The C++ ray tracer page ships a self-contained interactive demo. Load it
// only when its canvas is present (it self-boots regardless of timing).
if (document.getElementById("rt-canvas")) {
  const s = document.createElement("script");
  s.src = "/work/raytracer/demo.js";
  s.defer = true;
  document.body.appendChild(s);
}
