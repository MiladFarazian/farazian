// /status — renders /api/status into the page and refreshes every 10s.
// Plain script on purpose: this page should work even if the app bundle dies.
(() => {
  const $ = (id) => document.getElementById(id);
  const set = (id, text) => {
    const el = $(id);
    if (el) el.textContent = text;
  };

  const ago = (iso) => {
    const s = Math.max(0, (Date.now() - Date.parse(iso)) / 1000);
    if (s < 90) return "just now";
    if (s < 5400) return Math.round(s / 60) + " min ago";
    if (s < 129600) return Math.round(s / 3600) + "h ago";
    return Math.round(s / 86400) + "d ago";
  };

  // Core Web Vitals thresholds (good / poor) per web.dev.
  const VITALS = {
    "v-lcp": { key: "lcp_p75", good: 2500, poor: 4000, fmt: (v) => (v / 1000).toFixed(2) + "s" },
    "v-cls": { key: "cls_p75", good: 0.1, poor: 0.25, fmt: (v) => v.toFixed(3) },
    "v-inp": { key: "inp_p75", good: 200, poor: 500, fmt: (v) => Math.round(v) + "ms" },
    "v-ttfb": { key: "ttfb_p75", good: 800, poor: 1800, fmt: (v) => Math.round(v) + "ms" },
  };

  async function refresh() {
    let d;
    try {
      d = await (await fetch("/api/status", { cache: "no-store" })).json();
    } catch {
      set("st-online", "×");
      set("st-colo-note", "telemetry unreachable — try a refresh");
      return;
    }

    set("st-online", d.online == null ? "—" : String(d.online));
    if (d.served && d.served.colo) {
      set("st-colo", d.served.colo);
      const place = [d.served.city, d.served.country].filter(Boolean).join(", ");
      set("st-colo-note", place ? `the Cloudflare edge in ${place} served you this page` : "Cloudflare edge that served you this page");
    }
    if (d.served) {
      set("st-conn", [d.served.http, d.served.tls].filter(Boolean).join(" · ") || "—");
    }
    if (d.build && d.build.sha) {
      const el = $("st-deploy");
      if (el) {
        el.innerHTML = "";
        const a = document.createElement("a");
        a.href = "https://github.com/MiladFarazian/farazian/commit/" + d.build.sha;
        a.target = "_blank";
        a.rel = "noopener";
        a.textContent = d.build.sha.slice(0, 7);
        el.appendChild(a);
      }
      const bits = ["running deploy"];
      if (d.build.builtAt) bits.push("built " + ago(d.build.builtAt));
      if (d.build.commits) bits.push(d.build.commits + " commits");
      set("st-deploy-note", bits.join(" · "));
    }
    if (d.counters) {
      set("st-mcp", d.counters.mcp_calls == null ? "—" : d.counters.mcp_calls.toLocaleString());
      set("st-gb", d.counters.guestbook_entries == null ? "—" : String(d.counters.guestbook_entries));
    }
    if (d.vitals) {
      set("st-samples", String(d.vitals.samples || 0));
      for (const id in VITALS) {
        const cfg = VITALS[id];
        const row = $(id);
        const v = d.vitals[cfg.key];
        if (!row || v == null) continue;
        row.querySelector("em").textContent = cfg.fmt(v);
        row.classList.remove("is-good", "is-mid", "is-poor");
        row.classList.add(v <= cfg.good ? "is-good" : v <= cfg.poor ? "is-mid" : "is-poor");
      }
    }
  }

  refresh();
  setInterval(refresh, 10000);
})();
