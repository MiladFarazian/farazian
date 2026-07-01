// Device capability detection + performance tiering.
// This is the "senior-engineer tell": the site scales its ambition to the hardware.

export type Tier = "high" | "mid" | "low";

export interface DeviceProfile {
  tier: Tier;
  isTouch: boolean;
  isMobile: boolean;
  reducedMotion: boolean;
  dpr: number; // capped device pixel ratio
  /** particle simulation texture size (NxN particles) */
  simSize: number;
  supportsWebGL: boolean;
}

function detectWebGL(): boolean {
  try {
    const c = document.createElement("canvas");
    return !!(
      c.getContext("webgl2") ||
      c.getContext("webgl") ||
      c.getContext("experimental-webgl")
    );
  } catch {
    return false;
  }
}

export function detectDevice(): DeviceProfile {
  const reducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  const isTouch =
    "ontouchstart" in window || navigator.maxTouchPoints > 0;

  const isMobile =
    isTouch && window.matchMedia("(max-width: 820px)").matches;

  const cores = navigator.hardwareConcurrency || 4;
  const mem = (navigator as Navigator & { deviceMemory?: number })
    .deviceMemory;

  let tier: Tier = "high";
  if (isMobile || cores <= 4) tier = "mid";
  // Genuinely weak devices fall to the no-post path: low-RAM Android phones
  // (deviceMemory) or very few cores. iOS doesn't report deviceMemory, so
  // capable phones stay at "mid" and get the lightweight bloom.
  if ((mem && mem <= 4) || cores <= 2) tier = "low";

  const supportsWebGL = detectWebGL();

  // Cap DPR aggressively on mobile to keep the GPU cool.
  const rawDpr = window.devicePixelRatio || 1;
  const dprCap = tier === "high" ? 2 : tier === "mid" ? 1.75 : 1.25;
  const dpr = Math.min(rawDpr, dprCap);

  // Particle budget by tier (NxN). 256^2 = 65k, 160^2 = 25k, 96^2 = 9k.
  const simSize = tier === "high" ? 256 : tier === "mid" ? 160 : 96;

  return {
    tier,
    isTouch,
    isMobile,
    reducedMotion,
    dpr,
    simSize,
    supportsWebGL,
  };
}
