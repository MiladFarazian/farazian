// Guestbook — visitors sign a wall backed by the worker's /api/guestbook + KV.
// All rendering uses textContent (never innerHTML) so entries can't inject markup.
export function initGuestbook() {
  const form = document.getElementById("gb-form") as HTMLFormElement | null;
  const wall = document.getElementById("gb-wall");
  if (!form || !wall) return;

  const nameEl = document.getElementById("gb-name") as HTMLInputElement;
  const msgEl = document.getElementById("gb-msg") as HTMLTextAreaElement;
  const hpEl = form.querySelector<HTMLInputElement>(".gb__hp")!;
  const statusEl = document.getElementById("gb-status")!;
  const submitEl = document.getElementById("gb-submit") as HTMLButtonElement;

  const fmtTime = (at: number) => {
    const s = Math.max(0, (Date.now() - at) / 1000);
    if (s < 60) return "just now";
    if (s < 3600) return `${Math.floor(s / 60)}m ago`;
    if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
    if (s < 86400 * 30) return `${Math.floor(s / 86400)}d ago`;
    return new Date(at).toLocaleDateString(undefined, { month: "short", year: "numeric" });
  };

  const entryEl = (e: { name?: string; message: string; at: number }) => {
    const el = document.createElement("article");
    el.className = "gb-entry";
    const msg = document.createElement("p");
    msg.className = "gb-entry__msg";
    msg.textContent = e.message;
    const meta = document.createElement("div");
    meta.className = "gb-entry__meta";
    const nm = document.createElement("span");
    nm.className = "gb-entry__name";
    nm.textContent = e.name || "anonymous";
    const tm = document.createElement("time");
    tm.textContent = fmtTime(e.at);
    meta.append(nm, tm);
    el.append(msg, meta);
    return el;
  };

  const setEmpty = () => {
    wall.innerHTML = "";
    const p = document.createElement("p");
    p.className = "gb__empty";
    p.textContent = "no signatures yet — be the first ✨";
    wall.append(p);
  };

  const render = (entries: Array<{ name?: string; message: string; at: number }>) => {
    wall.innerHTML = "";
    if (!entries.length) return setEmpty();
    entries.forEach((e) => wall.append(entryEl(e)));
  };

  fetch("/api/guestbook")
    .then((r) => r.json())
    .then((d) => render(d.entries || []))
    .catch(() => setEmpty());

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const message = msgEl.value.trim();
    if (!message) {
      statusEl.textContent = "say something first";
      return;
    }
    submitEl.disabled = true;
    statusEl.textContent = "signing…";
    try {
      const r = await fetch("/api/guestbook", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: nameEl.value, message, website: hpEl.value }),
      });
      const d = await r.json();
      if (!r.ok) {
        statusEl.textContent = d.error || "hmm — try again";
      } else if (d.entry) {
        const empty = wall.querySelector(".gb__empty");
        if (empty) wall.innerHTML = "";
        const node = entryEl(d.entry);
        node.classList.add("is-new");
        wall.prepend(node);
        msgEl.value = "";
        statusEl.textContent = "thanks for signing ✨";
        setTimeout(() => (statusEl.textContent = ""), 4000);
      }
    } catch {
      statusEl.textContent = "couldn't reach the server — try again";
    }
    submitEl.disabled = false;
  });
}
