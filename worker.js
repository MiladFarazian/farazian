// Edge entry point. Enforces farazian.com as the single canonical host
// (www + the workers.dev origin 301-redirect to the apex), serves the static
// site, and backs the guestbook (/api/guestbook) with the GUESTBOOK KV store.

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

async function handleMcp(request, env, url) {
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

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const host = url.hostname;

    if (host === "www.farazian.com" || host.endsWith(".workers.dev")) {
      url.hostname = "farazian.com";
      url.protocol = "https:";
      url.port = "";
      return Response.redirect(url.toString(), 301);
    }

    if (url.pathname === "/mcp") {
      return handleMcp(request, env, url);
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
