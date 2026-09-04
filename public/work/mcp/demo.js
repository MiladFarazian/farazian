// MCP playground — speaks raw JSON-RPC 2.0 to the LIVE /mcp endpoint from the
// visitor's own browser. No mock, no proxy: the same server agents connect to.
(() => {
  const root = document.getElementById("mcpp");
  if (!root || root.dataset.booted) return;
  root.dataset.booted = "1";

  const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  // One-pass JSON syntax highlight: keys, strings, numbers, booleans/null.
  const hl = (json) =>
    esc(json).replace(
      /("(\\u[a-fA-F0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+-]?\d+)?)/g,
      (m) => {
        let cls = "n";
        if (/^"/.test(m)) cls = /:$/.test(m) ? "k" : "s";
        else if (/^(true|false|null)$/.test(m)) cls = "b";
        return `<i class="${cls}">${m}</i>`;
      }
    );

  const CALLS = [
    { label: "initialize", method: "initialize", params: {
        protocolVersion: "2025-06-18",
        capabilities: {},
        clientInfo: { name: "farazian.com playground", version: "1.0.0" },
      } },
    { label: "tools/list", method: "tools/list" },
    { label: "list_projects", tool: "list_projects" },
    { label: "get_project", tool: "get_project", arg: true },
    { label: "get_profile", tool: "get_profile" },
    { label: "get_services", tool: "get_services" },
    { label: "ping", method: "ping" },
  ];

  root.innerHTML = `
    <div class="mcpp__bar" role="group" aria-label="MCP playground tools"></div>
    <div class="mcpp__argrow" hidden>
      <label>slug <input class="mcpp__slug" type="text" value="mcp" maxlength="40" spellcheck="false" /></label>
      <button class="mcpp__go" type="button">call ↵</button>
    </div>
    <div class="mcpp__panes">
      <div class="mcpp__pane">
        <div class="mcpp__panehead"><b>→ request</b><span>POST https://farazian.com/mcp</span></div>
        <pre class="mcpp__req">pick a call above — this pane shows the exact JSON-RPC sent</pre>
      </div>
      <div class="mcpp__pane">
        <div class="mcpp__panehead"><b>← response</b><span class="mcpp__lat"></span></div>
        <pre class="mcpp__res"></pre>
      </div>
    </div>
    <p class="mcpp__hint">Live against production — the numbers on <a href="/status/">/status</a> tick when you press these. The one write tool, <code>sign_guestbook</code>, is yours too: use the <a href="/#guestbook">guestbook</a> or connect a real agent.</p>`;

  const bar = root.querySelector(".mcpp__bar");
  const argRow = root.querySelector(".mcpp__argrow");
  const slugIn = root.querySelector(".mcpp__slug");
  const goBtn = root.querySelector(".mcpp__go");
  const reqPre = root.querySelector(".mcpp__req");
  const resPre = root.querySelector(".mcpp__res");
  const latEl = root.querySelector(".mcpp__lat");

  let seq = 0;
  let inflight = false;

  async function fire(call) {
    if (inflight) return;
    inflight = true;
    const body = { jsonrpc: "2.0", id: ++seq, method: call.method || "tools/call" };
    if (call.tool) body.params = { name: call.tool, arguments: call.arg ? { slug: slugIn.value.trim() || "mcp" } : {} };
    else if (call.params) body.params = call.params;

    reqPre.innerHTML = hl(JSON.stringify(body, null, 2));
    resPre.textContent = "…";
    latEl.textContent = "";
    const t0 = performance.now();
    try {
      const r = await fetch("/mcp", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const ms = Math.round(performance.now() - t0);
      const data = await r.json();
      latEl.textContent = `HTTP ${r.status} · ${ms}ms`;
      resPre.innerHTML = hl(JSON.stringify(data, null, 2));
    } catch (err) {
      latEl.textContent = "network error";
      resPre.textContent = String(err && err.message ? err.message : err);
    }
    inflight = false;
  }

  let active = null;
  CALLS.forEach((call) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "mcpp__tool" + (call.tool ? "" : " mcpp__tool--proto");
    b.textContent = call.label;
    b.addEventListener("click", () => {
      bar.querySelectorAll(".is-on").forEach((x) => x.classList.remove("is-on"));
      b.classList.add("is-on");
      active = call;
      argRow.hidden = !call.arg;
      fire(call);
    });
    bar.appendChild(b);
  });
  goBtn.addEventListener("click", () => active && active.arg && fire(active));
  slugIn.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && active && active.arg) fire(active);
  });

  // First scroll-into-view: run the handshake unprompted, so the panes are
  // already alive by the time the visitor reads this far.
  const io = new IntersectionObserver(
    (entries) => {
      if (!entries[0].isIntersecting) return;
      io.disconnect();
      bar.firstChild.classList.add("is-on");
      active = CALLS[0];
      fire(CALLS[0]);
    },
    { rootMargin: "0px 0px -20% 0px" }
  );
  io.observe(root);
})();
