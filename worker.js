// Edge entry point. Enforces farazian.com as the single canonical host
// (www + the workers.dev origin 301-redirect to the apex), serves the static
// site, backs the guestbook (/api/guestbook) with the GUESTBOOK KV store, and
// keeps the site's live state (presence, counters, visitor Web Vitals) in the
// PresenceHub Durable Object behind /api/presence, /api/vitals, /api/status.

const NAME_MAX = 40;
const MSG_MAX = 280;
const LIST_MAX = 200;
const RL_SECONDS = 60; // one signature per IP per minute (KV min TTL is 60s)

// Tiny profanity guard — not exhaustive, just keeps the wall friendly.
const BLOCK = /\b(fuck|shit|bitch|cunt|nigger|faggot|retard)\b/i;

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });

const clean = (s, max) =>
  String(s == null ? "" : s)
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u001f\u007f]/g, " ") // strip control chars
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);

async function listEntries(env) {
  const { keys } = await env.GUESTBOOK.list({ prefix: "gb:", limit: LIST_MAX });
  // Keys are `gb:<reverse-timestamp>:<id>` → already newest-first. The whole
  // entry lives in the key metadata, so one list() call returns everything.
  return keys
    .map((k) => k.metadata)
    .filter((m) => m && m.message)
    .map((m) => ({ name: m.name, message: m.message, at: m.at }));
}

// Core guestbook write — shared by the HTTP form endpoint and the MCP tool.
async function guestbookAdd(env, ip, rawName, rawMessage) {
  const rlKey = `rl:${ip || "0.0.0.0"}`;
  if (await env.GUESTBOOK.get(rlKey)) {
    return { status: 429, error: "You just signed — give it a minute." };
  }
  const name = clean(rawName, NAME_MAX) || "anonymous";
  const message = clean(rawMessage, MSG_MAX);
  if (!message) return { status: 400, error: "Say something first." };
  if (BLOCK.test(name) || BLOCK.test(message)) {
    return { status: 400, error: "Let's keep it friendly." };
  }
  // Soft global cap: IP rotation defeats a per-IP throttle, so the wall also
  // has a daily ceiling. KV has no atomic increment — races undercount, which
  // is fine for a soft cap.
  const day = new Date().toISOString().slice(0, 10);
  const capKey = `gbcap:${day}`;
  const used = parseInt((await env.GUESTBOOK.get(capKey)) || "0", 10);
  if (used >= 200) return { status: 429, error: "The wall is full for today — come back tomorrow." };
  await env.GUESTBOOK.put(capKey, String(used + 1), { expirationTtl: 172800 });

  const at = Date.now();
  const key = `gb:${(1e15 - at).toString().padStart(16, "0")}:${crypto.randomUUID().slice(0, 8)}`;
  await env.GUESTBOOK.put(key, "", { metadata: { name, message, at } });
  await env.GUESTBOOK.put(rlKey, "1", { expirationTtl: RL_SECONDS });
  return { status: 201, entry: { name, message, at } };
}

async function addEntry(env, request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Bad request." }, 400);
  }

  if (body && body.website) return json({ ok: true }); // honeypot: silently drop bots

  const ip = request.headers.get("cf-connecting-ip") || "0.0.0.0";
  const r = await guestbookAdd(env, ip, body && body.name, body && body.message);
  if (r.error) return json({ error: r.error }, r.status);
  return json({ ok: true, entry: r.entry }, r.status);
}

// ============================================================
// MCP server — https://farazian.com/mcp
// The portfolio, speaking Model Context Protocol: stateless streamable-HTTP,
// raw JSON-RPC 2.0, no SDK. Data comes from the build-time /api/site.json.
// ============================================================
const MCP_PROTOCOL_VERSIONS = ["2025-06-18", "2025-03-26", "2024-11-05"];

const MCP_TOOLS = [
  {
    name: "list_projects",
    description:
      "List all of Milad Farazian's projects — title, category, year, one-line summary, tags, and page URL.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "get_project",
    description:
      "Full detail for one project by slug (use list_projects for slugs): summary, links, and the page's written sections as readable text.",
    inputSchema: {
      type: "object",
      properties: { slug: { type: "string", description: "Project slug, e.g. 'parkzy' or 'honest'" } },
      required: ["slug"],
      additionalProperties: false,
    },
  },
  {
    name: "get_profile",
    description:
      "Who Milad is: headline, location, availability, stack (grouped skills), and links — resume PDF, GitHub, email, intro-call booking.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "get_services",
    description:
      "Freelance services and starting prices: advisory, automation & AI agents, AI features, and the entry-level AI/codebase audit.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "ask",
    description:
      "Ask a question about Milad's work in natural language. Answers are retrieved from the site's own project docs with citations (title + URL + verbatim snippet), and the tool abstains rather than guess when the corpus doesn't support an answer.",
    inputSchema: {
      type: "object",
      properties: { question: { type: "string", description: "The question, e.g. 'How does Parkzy handle payments?'" } },
      required: ["question"],
      additionalProperties: false,
    },
  },
  {
    name: "sign_guestbook",
    description:
      "Sign the guestbook on farazian.com — leaves a public, persistent note on the site. Agents welcome; say who sent you. Rate-limited to one signature per minute per IP.",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Display name (optional, max 40 chars)" },
        message: { type: "string", description: "The message (required, max 280 chars)" },
      },
      required: ["message"],
      additionalProperties: false,
    },
  },
];

let siteCache = null;
async function siteData(env, origin) {
  if (siteCache) return siteCache;
  const res = await env.ASSETS.fetch(new Request(`${origin}/api/site.json`));
  if (!res.ok) throw new Error("site data unavailable");
  siteCache = await res.json();
  return siteCache;
}

async function mcpToolCall(env, origin, ip, name, args) {
  const site = await siteData(env, origin);
  switch (name) {
    case "list_projects":
      return site.projects.map(({ slug, title, category, year, summary, tags, url }) => ({
        slug, title, category, year, summary, tags, url,
      }));
    case "get_project": {
      const p = site.projects.find((x) => x.slug === String(args?.slug || "").toLowerCase().trim());
      if (!p) {
        const slugs = site.projects.map((x) => x.slug).join(", ");
        return { error: `Unknown slug. Valid slugs: ${slugs}` };
      }
      return p;
    }
    case "get_profile": {
      const { name: n, headline, location, availability, links, stack } = site;
      return { name: n, headline, location, availability, links, stack };
    }
    case "get_services":
      return { services: site.services, book_intro_call: site.links.book_intro_call, hire_page: site.links.hire };
    case "ask": {
      // Retrieval-only for agents: passages + citations, no LLM in the middle
      // (the caller IS a model — it can synthesize from sources itself).
      const r = await askAnswer(env, origin, ip, args?.question, null, false);
      if (r.status !== 200) return { error: r.body.error || "Bad question." };
      return r.body;
    }
    case "sign_guestbook": {
      if (!env.GUESTBOOK) return { error: "Guestbook offline." };
      const r = await guestbookAdd(env, ip, args?.name, args?.message);
      if (r.error) return { error: r.error };
      return { ok: true, signed: r.entry, view: `${origin}/#guestbook` };
    }
    default:
      return null; // unknown tool → protocol error upstream
  }
}

const MCP_CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "POST, OPTIONS",
  "access-control-allow-headers": "content-type, accept, authorization, mcp-protocol-version, mcp-session-id",
};

const mcpJson = (payload, status = 200) =>
  new Response(payload === null ? null : JSON.stringify(payload), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store", ...MCP_CORS },
  });

const rpcError = (id, code, message) =>
  mcpJson({ jsonrpc: "2.0", id: id === undefined ? null : id, error: { code, message } });

const rpcResult = (id, result) => mcpJson({ jsonrpc: "2.0", id, result });

async function handleMcp(request, env, url, ctx) {
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: MCP_CORS });
  if (request.method !== "POST") {
    return new Response("MCP endpoint — POST JSON-RPC here. Docs: https://farazian.com/work/mcp/", {
      status: 405,
      headers: { allow: "POST, OPTIONS", "content-type": "text/plain", ...MCP_CORS },
    });
  }

  const pv = request.headers.get("mcp-protocol-version");
  if (pv && !MCP_PROTOCOL_VERSIONS.includes(pv)) {
    return mcpJson(
      { jsonrpc: "2.0", id: null, error: { code: -32600, message: `Unsupported MCP-Protocol-Version: ${pv}` } },
      400
    );
  }

  const len = parseInt(request.headers.get("content-length") || "0", 10);
  if (len > 32768) return rpcError(null, -32600, "Request too large");

  let msg;
  try {
    msg = await request.json();
  } catch {
    return rpcError(null, -32700, "Parse error: body must be JSON");
  }
  if (Array.isArray(msg)) return rpcError(null, -32600, "Batching is not supported (MCP 2025-06-18)");
  if (msg && msg.jsonrpc === "2.0" && typeof msg.method !== "string" && ("result" in msg || "error" in msg)) {
    return new Response(null, { status: 202, headers: MCP_CORS }); // a client response — accepted, nothing to do
  }
  if (!msg || msg.jsonrpc !== "2.0" || typeof msg.method !== "string") {
    return rpcError(msg && msg.id, -32600, "Invalid JSON-RPC 2.0 request");
  }

  const hasId = Object.prototype.hasOwnProperty.call(msg, "id") && msg.id !== null;

  // Notifications (initialized, cancelled, …) need no body — 202 and done.
  if (!hasId) return new Response(null, { status: 202, headers: MCP_CORS });

  try {
    switch (msg.method) {
      case "initialize": {
        const asked = msg.params?.protocolVersion;
        const protocolVersion = MCP_PROTOCOL_VERSIONS.includes(asked) ? asked : MCP_PROTOCOL_VERSIONS[0];
        return rpcResult(msg.id, {
          protocolVersion,
          capabilities: { tools: {} },
          serverInfo: { name: "farazian-portfolio", title: "Milad Farazian — Portfolio", version: "1.0.0" },
          instructions:
            "This is Milad Farazian's portfolio speaking MCP. Use list_projects/get_project to explore his work, get_profile for skills, links, and the resume PDF, get_services for freelance offerings, and sign_guestbook to leave a note on the site.",
        });
      }
      case "ping":
        return rpcResult(msg.id, {});
      case "tools/list":
        return rpcResult(msg.id, { tools: MCP_TOOLS });
      case "tools/call": {
        const name = msg.params?.name;
        const ip = request.headers.get("cf-connecting-ip") || "0.0.0.0";
        // Count the call off the hot path — /status renders this number live.
        if (env.PRESENCE && ctx) {
          ctx.waitUntil(hub(env).fetch(new Request("https://hub/bump", { method: "POST" })).catch(() => {}));
        }
        const out = await mcpToolCall(env, url.origin, ip, name, msg.params?.arguments || {});
        if (out === null) return rpcError(msg.id, -32602, `Unknown tool: ${String(name)}`);
        const isError = Boolean(out && typeof out === "object" && !Array.isArray(out) && out.error);
        return rpcResult(msg.id, {
          content: [{ type: "text", text: JSON.stringify(out, null, 2) }],
          isError,
        });
      }
      default:
        return rpcError(msg.id, -32601, `Method not found: ${msg.method}`);
    }
  } catch {
    return rpcError(msg.id, -32603, "Internal error");
  }
}

// ============================================================
// PresenceHub — one Durable Object instance ("v1") holding the site's live
// state: who's on the site right now (hibernating WebSockets), atomic
// counters (KV can't increment atomically — a DO can), and a rolling window
// of Web Vitals samples reported by real visitors. /engineering has the ADR.
// ============================================================
export class PresenceHub {
  constructor(state) {
    this.state = state;
  }

  who(ws) {
    try {
      return ws.deserializeAttachment();
    } catch {
      return null;
    }
  }

  broadcast(msg, exclude) {
    const str = JSON.stringify(msg);
    for (const ws of this.state.getWebSockets()) {
      if (ws === exclude) continue;
      try {
        ws.send(str);
      } catch {
        /* peer already gone */
      }
    }
  }

  async fetch(request) {
    const url = new URL(request.url);

    // Live-visitor socket. Hibernation API: the DO sleeps between messages
    // instead of billing wall-clock for every idle tab left open.
    if (url.pathname === "/ws") {
      if ((request.headers.get("upgrade") || "").toLowerCase() !== "websocket") {
        return new Response("Expected a WebSocket upgrade.", { status: 426 });
      }
      const existing = this.state.getWebSockets();
      if (existing.length >= 64) return new Response("Room is full.", { status: 503 });
      const pair = new WebSocketPair();
      const [client, server] = Object.values(pair);
      const me = { id: crypto.randomUUID().slice(0, 6), hue: Math.floor(Math.random() * 360) };
      server.serializeAttachment(me); // identity survives hibernation
      this.state.acceptWebSocket(server);
      const peers = existing.map((w) => this.who(w)).filter(Boolean);
      server.send(JSON.stringify({ t: "hello", ...me, count: existing.length + 1, peers }));
      this.broadcast({ t: "join", ...me, count: existing.length + 1 }, server);
      return new Response(null, { status: 101, webSocket: client });
    }

    if (url.pathname === "/bump" && request.method === "POST") {
      const k = url.searchParams.get("k") === "ask" ? "count:ask" : "count:mcp";
      const n = ((await this.state.storage.get(k)) || 0) + 1;
      await this.state.storage.put(k, n);
      return new Response(null, { status: 204 });
    }

    // Gate for the paid LLM tier of /api/ask: per-IP burst limit + a daily
    // global cap so an open endpoint can never run up a surprise bill.
    // DO storage writes serialize by construction — the counts can't race.
    if (url.pathname === "/llmgate" && request.method === "POST") {
      const ip = url.searchParams.get("ip") || "0.0.0.0";
      const now = Date.now();
      const day = new Date().toISOString().slice(0, 10);
      const dayKey = `llmday:${day}`;
      const dayCount = (await this.state.storage.get(dayKey)) || 0;
      if (dayCount >= 300) return new Response(JSON.stringify({ ok: false, why: "daily-cap" }));
      let ipMap = (await this.state.storage.get("llmip")) || {};
      const rec = ipMap[ip];
      if (rec && now - rec.t < 60000 && rec.n >= 6) {
        return new Response(JSON.stringify({ ok: false, why: "ip-burst" }));
      }
      ipMap[ip] = rec && now - rec.t < 60000 ? { t: rec.t, n: rec.n + 1 } : { t: now, n: 1 };
      if (Object.keys(ipMap).length > 500) ipMap = { [ip]: ipMap[ip] }; // prune
      await this.state.storage.put("llmip", ipMap);
      await this.state.storage.put(dayKey, dayCount + 1);
      return new Response(JSON.stringify({ ok: true }));
    }

    if (url.pathname === "/vitals" && request.method === "POST") {
      let v;
      try {
        v = await request.json();
      } catch {
        return new Response(null, { status: 400 });
      }
      // Only accept plausible numbers — this is an open endpoint.
      const sample = {};
      for (const k of ["lcp", "cls", "inp", "ttfb"]) {
        const n = Number(v?.[k]);
        if (Number.isFinite(n) && n >= 0 && n < 120000) sample[k] = Math.round(n * 1000) / 1000;
      }
      if (!Object.keys(sample).length) return new Response(null, { status: 400 });
      const arr = (await this.state.storage.get("vitals")) || [];
      arr.push(sample);
      if (arr.length > 500) arr.splice(0, arr.length - 500); // rolling window
      await this.state.storage.put("vitals", arr);
      return new Response(null, { status: 204 });
    }

    if (url.pathname === "/snapshot") {
      const [mcp, ask, vitals] = await Promise.all([
        this.state.storage.get("count:mcp"),
        this.state.storage.get("count:ask"),
        this.state.storage.get("vitals"),
      ]);
      const p75 = (key) => {
        const xs = (vitals || [])
          .map((s) => s[key])
          .filter((n) => typeof n === "number")
          .sort((a, b) => a - b);
        return xs.length ? xs[Math.min(xs.length - 1, Math.floor(xs.length * 0.75))] : null;
      };
      return new Response(
        JSON.stringify({
          online: this.state.getWebSockets().length,
          mcp_calls: mcp || 0,
          ask_count: ask || 0,
          vitals: {
            samples: (vitals || []).length,
            lcp_p75: p75("lcp"),
            cls_p75: p75("cls"),
            inp_p75: p75("inp"),
            ttfb_p75: p75("ttfb"),
          },
        }),
        { headers: { "content-type": "application/json" } }
      );
    }

    return new Response(null, { status: 404 });
  }

  webSocketMessage(ws, raw) {
    if (typeof raw !== "string" || raw.length > 200) return;
    let msg;
    try {
      msg = JSON.parse(raw);
    } catch {
      return;
    }
    const me = this.who(ws);
    if (!me) return;
    if (msg.t === "m") {
      const x = Number(msg.x);
      const y = Number(msg.y);
      if (!Number.isFinite(x) || !Number.isFinite(y)) return;
      this.broadcast(
        { t: "m", id: me.id, hue: me.hue, x: Math.min(1, Math.max(0, x)), y: Math.min(1, Math.max(0, y)) },
        ws
      );
    }
  }

  webSocketClose(ws) {
    const me = this.who(ws);
    const count = this.state.getWebSockets().filter((w) => w !== ws).length;
    this.broadcast({ t: "leave", id: me?.id, count }, ws);
  }

  webSocketError(ws) {
    this.webSocketClose(ws);
  }
}

const hub = (env) => env.PRESENCE.get(env.PRESENCE.idFromName("v1"));

// ============================================================
// /api/ask — "Ask this site about my work."
// Retrieval-first RAG over the build-time corpus (/api/corpus.json):
// BM25 at the edge, citations back to source pages, and ABSTENTION when the
// corpus doesn't support an answer. When an ANTHROPIC_API_KEY secret exists,
// a generative tier synthesizes the answer with Claude (gated by per-IP and
// daily caps in the DO); without one, the same pipeline answers extractively.
// Citations or silence — never a guess.
// ============================================================
// Note: the subject's own name is a stopword — on a single-subject corpus
// "milad" matches everything equally, so it carries zero retrieval signal.
const ASK_STOP = new Set(
  "a an and are as at be but by for from has have he his how i in is it its me my of on or she that the their they this to was we what when where which who why will with you your does did do milad milads farazian farazians".split(" ")
);
const askTokens = (s) =>
  String(s)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 1 && !ASK_STOP.has(w));

let askIndex = null;
async function getAskIndex(env, origin) {
  if (askIndex) return askIndex;
  const res = await env.ASSETS.fetch(new Request(`${origin}/api/corpus.json`));
  if (!res.ok) throw new Error("corpus unavailable");
  const { passages } = await res.json();
  const docs = passages.map((p) => ({
    ...p,
    terms: askTokens(`${p.title} ${p.heading || ""} ${p.text}`),
  }));
  const df = new Map();
  for (const d of docs) for (const t of new Set(d.terms)) df.set(t, (df.get(t) || 0) + 1);
  const avgLen = docs.reduce((a, d) => a + d.terms.length, 0) / (docs.length || 1);
  askIndex = { docs, df, N: docs.length, avgLen };
  return askIndex;
}

function askRank(index, q) {
  const qTerms = [...new Set(askTokens(q))];
  const k1 = 1.4;
  const b = 0.6;
  const scored = index.docs.map((d) => {
    let score = 0;
    let matched = 0;
    for (const t of qTerms) {
      const tf = d.terms.reduce((n, x) => n + (x === t ? 1 : 0), 0);
      if (!tf) continue;
      matched++;
      const df = index.df.get(t);
      const idf = Math.log(1 + (index.N - df + 0.5) / (df + 0.5));
      score += (idf * tf * (k1 + 1)) / (tf + k1 * (1 - b + (b * d.terms.length) / index.avgLen));
    }
    return { d, score, matched };
  });
  scored.sort((a, b2) => b2.score - a.score);
  return { qTerms, top: scored.slice(0, 5).filter((s) => s.score > 0) };
}

// The abstention line: an informative term must match, and the best passage
// must clear a score floor. Calibrated against the on-page eval suite.
const ASK_MIN_SCORE = 3.2;
const askAbstains = (qTerms, top) =>
  !top.length || top[0].score < ASK_MIN_SCORE || top[0].matched < Math.min(2, qTerms.length);

// Extractive answer: the sentences of the top passage that carry the most
// query terms, verbatim, so the "answer" is always literally in the source.
function askSnippet(text, qTerms) {
  const sentences = String(text).split(/(?<=[.!?])\s+/);
  const scored = sentences.map((s, i) => {
    const toks = new Set(askTokens(s));
    return { s, i, hits: qTerms.reduce((n, t) => n + (toks.has(t) ? 1 : 0), 0) };
  });
  scored.sort((a, b) => b.hits - a.hits || a.i - b.i);
  const picked = scored.slice(0, 2).sort((a, b) => a.i - b.i).map((x) => x.s);
  const out = picked.join(" ");
  return out.length > 420 ? out.slice(0, 417) + "…" : out;
}

async function askGenerative(env, question, sources) {
  const context = sources
    .map((s, i) => `[${i + 1}] ${s.title}${s.heading ? " — " + s.heading : ""} (${s.url})\n${s.text}`)
    .join("\n\n");
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: env.ASK_MODEL || "claude-opus-5",
      max_tokens: 600,
      output_config: { effort: "low" },
      system:
        "You answer questions about Milad Farazian's work using ONLY the numbered context passages provided. Cite every claim with [n] markers matching the passages you used. If the passages do not contain the answer, reply with exactly: ABSTAIN. Never use outside knowledge, never speculate. Be concise (2-4 sentences), specific, and warm.",
      messages: [{ role: "user", content: `Context passages:\n\n${context}\n\nQuestion: ${question}` }],
    }),
  });
  if (!res.ok) throw new Error(`api ${res.status}`);
  const data = await res.json();
  if (data.stop_reason === "refusal") throw new Error("refusal");
  const text = (data.content || [])
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("")
    .trim();
  if (!text || /^ABSTAIN\b/.test(text)) return null; // model-level abstention
  return text;
}

async function askAnswer(env, origin, ip, rawQ, ctx, allowLLM = true) {
  const q = String(rawQ == null ? "" : rawQ).slice(0, 300).trim();
  if (!q) return { status: 400, body: { error: "Ask something first." } };
  const index = await getAskIndex(env, origin);
  const { qTerms, top } = askRank(index, q);
  if (env.PRESENCE && ctx) {
    ctx.waitUntil(hub(env).fetch(new Request("https://hub/bump?k=ask", { method: "POST" })).catch(() => {}));
  }
  if (askAbstains(qTerms, top)) {
    return {
      status: 200,
      body: {
        abstained: true,
        answer: null,
        note: "The corpus doesn't support an answer to that, so I'd rather say nothing than make something up. Try asking about the projects, the stack, or how this site works.",
        sources: [],
        mode: "retrieval",
      },
    };
  }
  const sources = top.map(({ d, score }) => ({
    title: d.title,
    heading: d.heading || null,
    url: d.url,
    text: d.text,
    score: Math.round(score * 100) / 100,
  }));
  const cited = sources.map(({ text, ...s }, i) => ({ n: i + 1, ...s, snippet: askSnippet(text, qTerms) }));

  // Generative tier — only if a key is configured AND the spend gate agrees.
  if (allowLLM && env.ANTHROPIC_API_KEY && env.PRESENCE) {
    try {
      const gate = await (
        await hub(env).fetch(new Request(`https://hub/llmgate?ip=${encodeURIComponent(ip)}`, { method: "POST" }))
      ).json();
      if (gate.ok) {
        const answer = await askGenerative(env, q, sources);
        if (answer === null) {
          return {
            status: 200,
            body: { abstained: true, answer: null, note: "The model looked at the retrieved passages and declined to answer — the corpus doesn't support it.", sources: cited, mode: "generative" },
          };
        }
        return { status: 200, body: { abstained: false, answer, sources: cited, mode: "generative" } };
      }
    } catch {
      /* fall through to extractive — retrieval never depends on the LLM */
    }
  }
  return { status: 200, body: { abstained: false, answer: cited[0].snippet, sources: cited, mode: "extractive" } };
}

async function handleAsk(request, env, url, ctx) {
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: MCP_CORS });
  let q = url.searchParams.get("q");
  if (request.method === "POST") {
    try {
      q = (await request.json()).q;
    } catch {
      /* keep query-param q */
    }
  }
  const ip = request.headers.get("cf-connecting-ip") || "0.0.0.0";
  const r = await askAnswer(env, url.origin, ip, q, ctx);
  return new Response(JSON.stringify(r.body), {
    status: r.status,
    headers: { "content-type": "application/json", "cache-control": "no-store", ...MCP_CORS },
  });
}

async function handleStatus(request, env, url) {
  const cf = request.cf || {};
  let build = null;
  try {
    const r = await env.ASSETS.fetch(new Request(`${url.origin}/api/build.json`));
    if (r.ok) build = await r.json();
  } catch {
    /* build info is best-effort */
  }
  let live = null;
  if (env.PRESENCE) {
    try {
      live = await (await hub(env).fetch("https://hub/snapshot")).json();
    } catch {
      /* DO unavailable → nulls below */
    }
  }
  let guestbook = null;
  if (env.GUESTBOOK) {
    try {
      guestbook = (await env.GUESTBOOK.list({ prefix: "gb:", limit: LIST_MAX })).keys.length;
    } catch {
      /* best-effort */
    }
  }
  return json({
    ok: true,
    served: {
      colo: cf.colo || null,
      city: cf.city || null,
      country: cf.country || null,
      http: cf.httpProtocol || null,
      tls: cf.tlsVersion || null,
    },
    build,
    online: live ? live.online : null,
    counters: { mcp_calls: live ? live.mcp_calls : null, ask_count: live ? live.ask_count : null, guestbook_entries: guestbook },
    vitals: live ? live.vitals : null,
  });
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const host = url.hostname;

    if (host === "www.farazian.com" || host.endsWith(".workers.dev")) {
      url.hostname = "farazian.com";
      url.protocol = "https:";
      url.port = "";
      return Response.redirect(url.toString(), 301);
    }

    if (url.pathname === "/mcp") {
      return handleMcp(request, env, url, ctx);
    }

    if (url.pathname === "/api/status" && request.method === "GET") {
      return handleStatus(request, env, url);
    }

    if (url.pathname === "/api/ask") {
      try {
        return await handleAsk(request, env, url, ctx);
      } catch {
        return json({ error: "Ask is offline — try again in a moment." }, 500);
      }
    }

    if (url.pathname === "/ask" || url.pathname === "/ask/") {
      url.pathname = "/work/ask/";
      return Response.redirect(url.toString(), 302);
    }

    if (url.pathname === "/api/presence") {
      if (!env.PRESENCE) return json({ error: "Presence offline." }, 503);
      if ((request.headers.get("upgrade") || "").toLowerCase() === "websocket") {
        return hub(env).fetch(new Request("https://hub/ws", request));
      }
      try {
        const snap = await (await hub(env).fetch("https://hub/snapshot")).json();
        return json({ online: snap.online });
      } catch {
        return json({ error: "Presence offline." }, 503);
      }
    }

    if (url.pathname === "/api/vitals" && request.method === "POST") {
      if (!env.PRESENCE) return new Response(null, { status: 204 }); // silently drop
      const len = parseInt(request.headers.get("content-length") || "0", 10);
      if (len > 1024) return new Response(null, { status: 413 });
      const body = await request.text();
      ctx.waitUntil(
        hub(env)
          .fetch(new Request("https://hub/vitals", { method: "POST", body }))
          .catch(() => {})
      );
      return new Response(null, { status: 204 });
    }

    if (url.pathname === "/api/guestbook") {
      if (!env.GUESTBOOK) return json({ error: "Guestbook offline." }, 503);
      try {
        if (request.method === "GET") return json({ entries: await listEntries(env) });
        if (request.method === "POST") return await addEntry(env, request);
        return json({ error: "Method not allowed." }, 405);
      } catch {
        return json({ error: "Something broke. Try again." }, 500);
      }
    }

    return env.ASSETS.fetch(request);
  },
};
