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

async function addEntry(env, request) {
  const ip = request.headers.get("cf-connecting-ip") || "0.0.0.0";
  const rlKey = `rl:${ip}`;
  if (await env.GUESTBOOK.get(rlKey)) {
    return json({ error: "You just signed — give it a minute." }, 429);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Bad request." }, 400);
  }

  if (body && body.website) return json({ ok: true }); // honeypot: silently drop bots

  const name = clean(body && body.name, NAME_MAX) || "anonymous";
  const message = clean(body && body.message, MSG_MAX);
  if (!message) return json({ error: "Say something first." }, 400);
  if (BLOCK.test(name) || BLOCK.test(message)) {
    return json({ error: "Let's keep it friendly." }, 400);
  }

  const at = Date.now();
  const key = `gb:${(1e15 - at).toString().padStart(16, "0")}:${crypto.randomUUID().slice(0, 8)}`;
  await env.GUESTBOOK.put(key, "", { metadata: { name, message, at } });
  await env.GUESTBOOK.put(rlKey, "1", { expirationTtl: RL_SECONDS });

  return json({ ok: true, entry: { name, message, at } }, 201);
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
