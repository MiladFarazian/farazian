// Inject data-driven content + wire scroll-reveal animations.
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { PROJECTS, STACK, LINKS } from "../content";

gsap.registerPlugin(ScrollTrigger);

export function buildContent() {
  // ---- Work list ----
  const workList = document.getElementById("work-list")!;
  workList.innerHTML = PROJECTS.map(
    (p) => `
    <a class="work-item" href="${p.href}" ${p.href !== "#" ? 'target="_blank" rel="noopener"' : ""} data-magnetic>
      <span class="work-item__no">${p.no}</span>
      <span class="work-item__title">${p.title} <span class="arrow">↗</span></span>
      <span class="work-item__desc">${p.desc}</span>
      <span class="work-item__tags">${p.tags.map((t) => `<span class="tag">${t}</span>`).join("")}</span>
    </a>`
  ).join("");

  // ---- Stack chips ----
  const cloud = document.getElementById("stack-cloud")!;
  cloud.innerHTML = STACK.map((s) => `<span class="chip">${s}</span>`).join("");

  // ---- Contact links ----
  const links = document.getElementById("contact-links")!;
  links.innerHTML = LINKS.map(
    (l) => `<a href="${l.href}" target="_blank" rel="noopener" data-magnetic data-scramble>${l.label}</a>`
  ).join("");

  // ---- Year ----
  const yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());
}

export function initReveals(reducedMotion: boolean) {
  if (reducedMotion) {
    // No scroll animation — show stats at their final values immediately.
    document.querySelectorAll<HTMLElement>("[data-count]").forEach((el) => {
      el.textContent = el.dataset.count || el.textContent || "0";
    });
    return;
  }

  // Generic fade-up reveals. Hero items are excluded — they're revealed by the
  // boot sequence for a dramatic post-load entrance.
  gsap.utils
    .toArray<HTMLElement>("[data-reveal]")
    .filter((el) => !el.closest(".hero"))
    .forEach((el) => {
      gsap.to(el, {
        opacity: 1,
        y: 0,
        duration: 1,
        ease: "power3.out",
        scrollTrigger: { trigger: el, start: "top 88%" },
      });
    });

  // Split-text lines: animate each word up.
  gsap.utils.toArray<HTMLElement>("[data-split]").forEach((el) => {
    const words = (el.textContent || "").split(" ");
    el.innerHTML = words
      .map((w) => `<span class="split-word"><span class="split-char">${w}</span></span>`)
      .join(" ");
    const chars = el.querySelectorAll(".split-char");
    gsap.set(chars, { yPercent: 110, opacity: 0 });
    gsap.to(chars, {
      yPercent: 0,
      opacity: 1,
      duration: 0.9,
      ease: "power4.out",
      stagger: 0.04,
      scrollTrigger: { trigger: el, start: "top 85%" },
    });
  });

  // Count-up stats.
  gsap.utils.toArray<HTMLElement>("[data-count]").forEach((el) => {
    const target = Number(el.dataset.count || "0");
    const obj = { v: 0 };
    ScrollTrigger.create({
      trigger: el,
      start: "top 90%",
      once: true,
      onEnter: () => {
        gsap.to(obj, {
          v: target,
          duration: 1.6,
          ease: "power2.out",
          onUpdate: () => (el.textContent = String(Math.round(obj.v))),
        });
      },
    });
  });

  // Section index labels slide in.
  gsap.utils.toArray<HTMLElement>(".section__index").forEach((el) => {
    gsap.from(el, {
      opacity: 0,
      x: -20,
      duration: 0.8,
      ease: "power3.out",
      scrollTrigger: { trigger: el, start: "top 90%" },
    });
  });

  // Work items stagger in.
  gsap.from(".work-item", {
    opacity: 0,
    y: 30,
    duration: 0.8,
    ease: "power3.out",
    stagger: 0.08,
    scrollTrigger: { trigger: ".work__list", start: "top 80%" },
  });

  // Chips pop in.
  gsap.from(".chip", {
    opacity: 0,
    scale: 0.8,
    duration: 0.5,
    ease: "back.out(1.7)",
    stagger: 0.03,
    scrollTrigger: { trigger: ".stack__cloud", start: "top 85%" },
  });
}
