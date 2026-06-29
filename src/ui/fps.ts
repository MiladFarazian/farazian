// Lightweight FPS / tier HUD. Hidden by default; toggle with the `fps` command
// or the command palette. Also auto-throttles a callback if perf tanks.
import type { Tier } from "../core/device";

export interface FpsMeter {
  tick: (now: number) => void;
  toggle: () => void;
  show: () => void;
  onLowPerf: (cb: () => void) => void;
}

export function initFps(tier: Tier): FpsMeter {
  const hud = document.getElementById("hud")!;
  const fpsEl = document.getElementById("hud-fps")!;
  const tierEl = document.getElementById("hud-tier")!;
  tierEl.textContent = tier;

  let frames = 0;
  let last = performance.now();
  let lowStreak = 0;
  let lowCb: (() => void) | null = null;
  let lowFired = false;

  const tick = (now: number) => {
    frames++;
    if (now - last >= 1000) {
      const fps = Math.round((frames * 1000) / (now - last));
      fpsEl.textContent = String(fps);
      frames = 0;
      last = now;

      if (fps < 40) lowStreak++;
      else lowStreak = 0;
      if (lowStreak >= 4 && !lowFired && lowCb) {
        lowFired = true;
        lowCb();
      }
    }
  };

  const show = () => {
    hud.classList.add("is-visible");
    hud.setAttribute("aria-hidden", "false");
  };
  const toggle = () => hud.classList.toggle("is-visible");
  const onLowPerf = (cb: () => void) => (lowCb = cb);

  return { tick, toggle, show, onLowPerf };
}
