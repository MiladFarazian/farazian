// Live presence — you're not browsing alone. A WebSocket to the PresenceHub
// Durable Object at the edge: a pill says how many people are here right now,
// and other visitors' cursors drift across the page as soft ghost dots.
// Positions are viewport-normalized (ambience, not surveillance — no names,
// no IPs, nothing stored).

interface Peer {
  el: HTMLElement;
  x: number;
  y: number;
  tx: number;
  ty: number;
  seen: number;
}

export function initPresence(): void {
  if (!("WebSocket" in window)) return;

  const reduced = document.documentElement.classList.contains("reduced-motion");

  const pill = document.createElement("div");
  pill.className = "presence-pill";
  pill.setAttribute("aria-live", "polite");
  document.body.appendChild(pill);

  const layer = document.createElement("div");
  layer.className = "presence-layer";
  layer.setAttribute("aria-hidden", "true");
  document.body.appendChild(layer);

  const peers = new Map<string, Peer>();
  let count = 1;

  const renderPill = () => {
    const others = count - 1;
    if (others > 0) {
      pill.innerHTML = `<i></i>you + ${others} ${others === 1 ? "other" : "others"} here right now`;
      pill.classList.add("is-on");
    } else {
      pill.classList.remove("is-on");
    }
  };

  const addPeer = (id: string, hue: number, x = Math.random(), y = Math.random()) => {
    if (peers.has(id) || reduced || peers.size >= 24) return;
    const el = document.createElement("div");
    el.className = "presence-cursor";
    el.style.setProperty("--hue", String(hue));
    el.innerHTML = `<span></span><b>visitor</b>`;
    layer.appendChild(el);
    peers.set(id, { el, x, y, tx: x, ty: y, seen: performance.now() });
  };

  const dropPeer = (id: string) => {
    const p = peers.get(id);
    if (!p) return;
    p.el.classList.add("is-gone");
    setTimeout(() => p.el.remove(), 600);
    peers.delete(id);
  };

  // Lerp loop — only runs while there are ghosts to move.
  let rafOn = false;
  const tick = () => {
    if (!peers.size) {
      rafOn = false;
      return;
    }
    const now = performance.now();
    peers.forEach((p, id) => {
      p.x += (p.tx - p.x) * 0.12;
      p.y += (p.ty - p.y) * 0.12;
      p.el.style.transform = `translate(${(p.x * innerWidth).toFixed(1)}px, ${(p.y * innerHeight).toFixed(1)}px)`;
      if (now - p.seen > 90000) dropPeer(id); // idle ghosts fade away
    });
    requestAnimationFrame(tick);
  };
  const wake = () => {
    if (!rafOn && peers.size) {
      rafOn = true;
      requestAnimationFrame(tick);
    }
  };

  let ws: WebSocket | null = null;
  let retries = 0;

  const connect = () => {
    const proto = location.protocol === "https:" ? "wss" : "ws";
    try {
      ws = new WebSocket(`${proto}://${location.host}/api/presence`);
    } catch {
      return;
    }
    ws.onmessage = (ev) => {
      let msg: { t: string; id?: string; hue?: number; x?: number; y?: number; count?: number; peers?: { id: string; hue: number }[] };
      try {
        msg = JSON.parse(ev.data);
      } catch {
        return;
      }
      if (typeof msg.count === "number") count = Math.max(1, msg.count);
      if (msg.t === "hello") (msg.peers || []).forEach((p) => addPeer(p.id, p.hue));
      else if (msg.t === "join" && msg.id) addPeer(msg.id, msg.hue || 0);
      else if (msg.t === "leave" && msg.id) dropPeer(msg.id);
      else if (msg.t === "m" && msg.id) {
        let p = peers.get(msg.id);
        if (!p) {
          addPeer(msg.id, msg.hue || 0, msg.x, msg.y);
          p = peers.get(msg.id);
        }
        if (p) {
          p.tx = msg.x ?? p.tx;
          p.ty = msg.y ?? p.ty;
          p.seen = performance.now();
        }
      }
      renderPill();
      wake();
    };
    ws.onopen = () => {
      retries = 0;
    };
    ws.onclose = () => {
      peers.forEach((_, id) => dropPeer(id));
      count = 1;
      renderPill();
      // Gentle reconnect — this is ambience, not infrastructure.
      if (retries++ < 5 && !document.hidden) setTimeout(connect, 4000 + Math.random() * 4000);
    };
    ws.onerror = () => ws?.close();
  };
  connect();

  // Share my cursor (throttled). Touch devices are counted but cursorless.
  let last = 0;
  addEventListener(
    "pointermove",
    (e) => {
      const now = performance.now();
      if (now - last < 80 || !ws || ws.readyState !== 1) return;
      last = now;
      try {
        ws.send(JSON.stringify({ t: "m", x: e.clientX / innerWidth, y: e.clientY / innerHeight }));
      } catch {
        /* socket mid-close */
      }
    },
    { passive: true }
  );
}
