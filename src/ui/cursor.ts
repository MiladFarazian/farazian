// Custom magnetic cursor (desktop only). Dot tracks instantly, ring eases.
import { gsap } from "gsap";

export function initCursor() {
  if (window.matchMedia("(hover: none)").matches) return;

  const cursor = document.getElementById("cursor")!;
  const dot = cursor.querySelector(".cursor__dot") as HTMLElement;
  const ring = cursor.querySelector(".cursor__ring") as HTMLElement;

  let mx = window.innerWidth / 2;
  let my = window.innerHeight / 2;
  let rx = mx;
  let ry = my;

  window.addEventListener(
    "pointermove",
    (e) => {
      mx = e.clientX;
      my = e.clientY;
      gsap.set(dot, { x: mx, y: my });
    },
    { passive: true }
  );

  gsap.ticker.add(() => {
    rx += (mx - rx) * 0.18;
    ry += (my - ry) * 0.18;
    gsap.set(ring, { x: rx, y: ry });
  });

  window.addEventListener("pointerdown", () => cursor.classList.add("is-down"));
  window.addEventListener("pointerup", () => cursor.classList.remove("is-down"));

  // Hover state over interactive elements.
  const hoverSel = "a, button, [data-magnetic], .chip, input";
  document.addEventListener("pointerover", (e) => {
    if ((e.target as HTMLElement).closest(hoverSel)) cursor.classList.add("is-hover");
  });
  document.addEventListener("pointerout", (e) => {
    if ((e.target as HTMLElement).closest(hoverSel)) cursor.classList.remove("is-hover");
  });

  // Magnetic pull on [data-magnetic] elements.
  const magnets = document.querySelectorAll<HTMLElement>("[data-magnetic]");
  magnets.forEach((el) => {
    const strength = 0.35;
    el.addEventListener("pointermove", (e) => {
      const r = el.getBoundingClientRect();
      const x = e.clientX - (r.left + r.width / 2);
      const y = e.clientY - (r.top + r.height / 2);
      gsap.to(el, { x: x * strength, y: y * strength, duration: 0.4, ease: "power3.out" });
    });
    el.addEventListener("pointerleave", () => {
      gsap.to(el, { x: 0, y: 0, duration: 0.6, ease: "elastic.out(1, 0.4)" });
    });
  });
}
