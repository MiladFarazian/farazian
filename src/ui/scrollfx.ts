// Page-wide scroll choreography: a neon progress rail with per-section dots
// (desktop) and a scroll-spy that lights the matching nav link + rail dot.

type ScrollTo = (target: string | number | HTMLElement, opts?: object) => void;

const SECTIONS = ["hero", "about", "work", "stack", "contact"];

export function initScrollFX(scrollTo: ScrollTo) {
  const sections = SECTIONS.map((id) => document.getElementById(id)).filter(
    (el): el is HTMLElement => !!el
  );
  if (!sections.length) return;

  const navLinks = new Map<string, HTMLElement>();
  document.querySelectorAll<HTMLElement>(".nav__links a[href^='#']").forEach((a) => {
    navLinks.set(a.getAttribute("href")!.slice(1), a);
  });

  // ---- Build the rail ----
  const rail = document.createElement("div");
  rail.className = "scroll-rail";
  rail.setAttribute("aria-hidden", "true");
  rail.innerHTML = `<span class="scroll-rail__fill"></span>`;
  const fill = rail.querySelector(".scroll-rail__fill") as HTMLElement;

  const dots = sections.map((s) => {
    const dot = document.createElement("button");
    dot.className = "scroll-rail__dot";
    dot.dataset.label = s.id === "hero" ? "intro" : s.id;
    dot.addEventListener("click", () => scrollTo(s.id === "hero" ? 0 : `#${s.id}`));
    rail.appendChild(dot);
    return dot;
  });
  document.body.appendChild(rail);

  // Place each dot proportional to its section's position in the document.
  const layout = () => {
    const docH = document.documentElement.scrollHeight;
    sections.forEach((s, i) => {
      const center = s.offsetTop + s.offsetHeight / 2;
      dots[i].style.top = `${Math.min(100, (center / docH) * 100)}%`;
    });
  };

  let active = -1;
  const update = () => {
    const scrollable = document.documentElement.scrollHeight - window.innerHeight;
    const p = scrollable > 0 ? window.scrollY / scrollable : 0;
    fill.style.transform = `scaleY(${Math.max(0, Math.min(1, p))})`;

    // Current section = last one whose top has passed 40% of the viewport.
    const mark = window.scrollY + window.innerHeight * 0.4;
    let cur = 0;
    sections.forEach((s, i) => {
      if (s.offsetTop <= mark) cur = i;
    });
    if (cur !== active) {
      active = cur;
      dots.forEach((d, i) => d.classList.toggle("is-active", i === cur));
      navLinks.forEach((a, id) => a.classList.toggle("is-active", id === sections[cur].id));
    }
  };

  let raf = 0;
  const onScroll = () => {
    if (raf) return;
    raf = requestAnimationFrame(() => {
      raf = 0;
      update();
    });
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", () => {
    layout();
    update();
  });
  // Fonts/images can shift offsets after load.
  window.addEventListener("load", () => {
    layout();
    update();
  });

  layout();
  update();
}
