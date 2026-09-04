// Real-user Web Vitals → /api/vitals → the PresenceHub Durable Object.
// Hand-rolled (no web-vitals dependency): LCP, CLS, INP-ish (longest event),
// TTFB. One beacon per pageview, sent when the tab goes hidden. The p75s
// render on /status — the site instruments itself.

export function initVitals(): void {
  if (!("PerformanceObserver" in window)) return;

  let lcp = 0;
  let cls = 0;
  let inp = 0;

  try {
    new PerformanceObserver((list) => {
      const entries = list.getEntries();
      if (entries.length) lcp = entries[entries.length - 1].startTime;
    }).observe({ type: "largest-contentful-paint", buffered: true });
  } catch {
    /* not supported */
  }
  try {
    new PerformanceObserver((list) => {
      for (const e of list.getEntries() as PerformanceEntry[]) {
        const shift = e as unknown as { hadRecentInput?: boolean; value?: number };
        if (!shift.hadRecentInput && shift.value) cls += shift.value;
      }
    }).observe({ type: "layout-shift", buffered: true });
  } catch {
    /* not supported */
  }
  try {
    new PerformanceObserver((list) => {
      for (const e of list.getEntries()) inp = Math.max(inp, e.duration);
    }).observe({ type: "event", buffered: true, durationThreshold: 40 } as PerformanceObserverInit);
  } catch {
    /* not supported */
  }

  let sent = false;
  const send = () => {
    if (sent) return;
    sent = true;
    const nav = performance.getEntriesByType("navigation")[0] as
      | PerformanceNavigationTiming
      | undefined;
    const body = JSON.stringify({
      lcp: Math.round(lcp),
      cls: Math.round(cls * 1000) / 1000,
      inp: Math.round(inp),
      ttfb: Math.round(nav?.responseStart ?? 0),
    });
    try {
      if (!navigator.sendBeacon?.("/api/vitals", new Blob([body], { type: "application/json" }))) {
        fetch("/api/vitals", { method: "POST", body, keepalive: true }).catch(() => {});
      }
    } catch {
      /* metrics are best-effort */
    }
  };
  addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") send();
  });
  addEventListener("pagehide", send);
}
