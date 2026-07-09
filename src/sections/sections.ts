// Inject data-driven content + wire scroll-reveal animations.
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { PROJECTS, STACK_GROUPS, LINKS, CATEGORIES } from "../content";

gsap.registerPlugin(ScrollTrigger);

export function buildContent() {
  // ---- Work filters ----
  const filters = document.getElementById("work-filters")!;
  const countFor = (cat: string) =>
    cat === "All" ? PROJECTS.length : PROJECTS.filter((p) => p.category === cat).length;
  filters.innerHTML = CATEGORIES.map(
    (c, i) =>
      `<button class="filter-chip${i === 0 ? " is-active" : ""}" data-filter="${c}">${c} <span class="filter-chip__n">${countFor(c)}</span></button>`
  ).join("");

  // ---- Work cards ----
  const accentByCat: Record<string, string> = {
    "AI / ML": "violet",
    Software: "cyan",
    Games: "lime",
    Web: "blue",
    Writing: "amber",
  };
  const workList = document.getElementById("work-list")!;
  workList.innerHTML = PROJECTS.map((p) => {
    const linked = p.href && p.href !== "#";
    const external = linked && /^https?:/.test(p.href);
    const tag = linked ? "a" : "div";
    const attrs = linked ? `href="${p.href}"${external ? ' target="_blank" rel="noopener"' : ""}` : "";
    const arrow = linked ? ` <span class="arrow">${external ? "↗" : "→"}</span>` : "";
    const accent = accentByCat[p.category] || "cyan";
    const mono = (p.title.match(/[A-Za-z]/)?.[0] || "•").toUpperCase();
    const EXTRAS: Record<string, [string, string]> = {
      interactive: ["⚡", "interactive demo"],
      video: ["▶", "demo video"],
      playable: ["🕹", "playable"],
      winner: ["🏆", "hackathon winner"],
    };
    const ex = p.extra ? EXTRAS[p.extra] : null;
    const extraChip = ex
      ? `<span class="work-card__extra" data-kind="${p.extra}"><i>${ex[0]}</i> ${ex[1]}</span>`
      : "";
    return `<${tag} class="work-card" data-category="${p.category}" data-accent="${accent}" ${attrs}>
      <span class="work-card__ghost" aria-hidden="true">${mono}</span>
      <span class="work-card__head">
        <span class="work-card__no">${p.no}</span>
        ${extraChip}
        <span class="work-card__cat">${p.category}</span>
      </span>
      <span class="work-card__title">${p.title}${arrow}</span>
      <span class="work-card__desc">${p.desc}</span>
      <span class="work-card__tags">${p.tags.map((t) => `<span class="tag">${t}</span>`).join("")}</span>
    </${tag}>`;
  }).join("");

  // ---- Filter behavior ----
  filters.addEventListener("click", (e) => {
    const btn = (e.target as HTMLElement).closest<HTMLElement>(".filter-chip");
    if (!btn) return;
    const f = btn.dataset.filter!;
    filters.querySelectorAll(".filter-chip").forEach((c) => c.classList.toggle("is-active", c === btn));
    workList.querySelectorAll<HTMLElement>(".work-card").forEach((it) => {
      const show = f === "All" || it.dataset.category === f;
      it.classList.toggle("is-hidden", !show);
    });
    ScrollTrigger.refresh();
  });

  // ---- Stack (grouped chips) ----
  const cloud = document.getElementById("stack-cloud")!;
  cloud.innerHTML = STACK_GROUPS.map(
    (g) => `<div class="stack__group" data-accent="${g.accent}">
      <span class="stack__group-label">${g.label}</span>
      <div class="stack__chips">${g.items.map((s) => `<span class="chip">${s}</span>`).join("")}</div>
    </div>`
  ).join("");

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

  // Work cards stagger in.
  gsap.from(".work-card", {
    opacity: 0,
    y: 34,
    duration: 0.8,
    ease: "power3.out",
    stagger: 0.06,
    scrollTrigger: { trigger: ".work__list", start: "top 82%" },
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

/** 3D tilt + cursor spotlight (desktop) and a tap ripple (all devices) on the
 *  work cards. Kept out of initReveals so it runs regardless of scroll setup. */
export function initWorkCards(reducedMotion: boolean) {
  const cards = gsap.utils.toArray<HTMLElement>(".work-card");
  const fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  cards.forEach((card) => {
    if (!reducedMotion && fine) {
      const rotX = gsap.quickTo(card, "rotationX", { duration: 0.5, ease: "power3" });
      const rotY = gsap.quickTo(card, "rotationY", { duration: 0.5, ease: "power3" });
      card.addEventListener(
        "pointermove",
        (e) => {
          const r = card.getBoundingClientRect();
          const px = (e.clientX - r.left) / r.width;
          const py = (e.clientY - r.top) / r.height;
          rotY((px - 0.5) * 9);
          rotX(-(py - 0.5) * 9);
          card.style.setProperty("--mx", `${px * 100}%`);
          card.style.setProperty("--my", `${py * 100}%`);
        },
        { passive: true }
      );
      card.addEventListener("pointerleave", () => {
        rotX(0);
        rotY(0);
      });
    }

    // Ripple from the press point — press feedback before navigation.
    card.addEventListener(
      "pointerdown",
      (e) => {
        const r = card.getBoundingClientRect();
        const rip = document.createElement("span");
        rip.className = "work-card__ripple";
        rip.style.left = `${e.clientX - r.left}px`;
        rip.style.top = `${e.clientY - r.top}px`;
        card.appendChild(rip);
        setTimeout(() => rip.remove(), 640);
      },
      { passive: true }
    );
  });
}
