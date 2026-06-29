// Lenis momentum smooth-scroll, synced to GSAP ScrollTrigger.
import Lenis from "lenis";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

export interface ScrollController {
  lenis: Lenis | null;
  scrollTo: (target: string | number | HTMLElement, opts?: object) => void;
}

export function initSmoothScroll(reducedMotion: boolean): ScrollController {
  if (reducedMotion) {
    // Respect the user: native scroll, no hijacking. ScrollTrigger still works.
    return {
      lenis: null,
      scrollTo: (target) => {
        if (typeof target === "string") {
          document.querySelector(target)?.scrollIntoView({ behavior: "auto" });
        } else if (typeof target === "number") {
          window.scrollTo(0, target);
        } else {
          target.scrollIntoView({ behavior: "auto" });
        }
      },
    };
  }

  const lenis = new Lenis({
    duration: 1.1,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smoothWheel: true,
    touchMultiplier: 1.4,
  });

  lenis.on("scroll", ScrollTrigger.update);

  gsap.ticker.add((time) => {
    lenis.raf(time * 1000);
  });
  gsap.ticker.lagSmoothing(0);

  return {
    lenis,
    scrollTo: (target, opts) => lenis.scrollTo(target as never, opts),
  };
}
