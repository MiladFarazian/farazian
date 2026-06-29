# farazian

An interactive, GPU-driven portfolio for **Milad Farazian** — built to be fast,
beautiful, and a little impossible.

🌑 Dark neon / cyber-tech · ⚡ GPGPU particles · 🖱️ magnetic everything · 📱 tuned
for desktop *and* mobile.

## The experience

- **Living WebGL hero** — a GPGPU particle field (ping-pong simulation shaders)
  assembles the name `MILAD FARAZIAN`, then becomes a cursor-reactive force
  field. On touch devices, the **gyroscope** drives it. A hand-written raymarched
  neon background reacts to the pointer.
- **Boot sequence** — a "compiling shaders / seeding particle field" preloader
  while WebGL warms up.
- **Smooth scroll + scroll-reveal** — Lenis momentum scrolling synced to GSAP
  ScrollTrigger; split-text, fade-ups, and count-up stats.
- **Magnetic cursor** — custom cursor with magnetic pull on interactive elements,
  plus text-scramble decode reveals.
- **Command palette** — press <kbd>⌘K</kbd> / <kbd>Ctrl K</kbd> to jump anywhere.
- **Live terminal** — type `help` anywhere (or run the palette command) for a
  working shell: `whoami`, `ls projects`, `sudo hire-me`, `matrix`, and more.
- **Konami code** — ↑↑↓↓←→←→ B A unlocks a little reward.

## Performance & accessibility (the senior-engineer tell)

- **Device tiering** — particle count scales by hardware (≈65k high → ≈9k low),
  with a capped device pixel ratio.
- **`prefers-reduced-motion`** — a fully static, elegant fallback (no canvas); the
  name and all content remain first-class.
- **Graceful WebGL fallback** — if WebGL or float textures are unavailable, the
  site degrades to the reduced-motion experience.
- **Pauses when offscreen** — the simulation stops once the hero scrolls away.
- The heading is real, semantic HTML (visually replaced by particles) so screen
  readers and search engines get the content.

## Tech

Vite · TypeScript · Three.js (GPUComputationRenderer) · GLSL · GSAP +
ScrollTrigger · Lenis.

## Develop

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # typecheck + production build → dist/
npm run preview  # preview the production build
```

### Handy flags

- `?formed=1` — seed particles directly at the name (skips the assemble intro);
  useful for screenshots and debugging on software renderers.

## Content

Copy lives in [`src/content.ts`](src/content.ts) — name, projects, stack, and
links. It's seeded with real details (incl. [Parkzy](https://useparkzy.com)) plus
polished placeholders; swap freely and the layout adapts.
