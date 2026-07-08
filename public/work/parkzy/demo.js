/* "Ping a host" — a playable slice of the real Parkzy flow, self-contained.
 * Boots when #pk-demo is on the page (injected by project/main.ts).
 *
 * Mirrors the product: pick a destination → Parkzy pings every nearby host at
 * once → a host accepts in real time → you get access notes + a chat thread.
 * All data here is illustrative; the flow and the numbers on the page
 * ($15 avg, <60s accepts) come from the live product.
 */
(() => {
  const root = document.getElementById("pk-demo");
  if (!root) return;

  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const map = root.querySelector("#pk-map");
  const pinsEl = root.querySelector("#pk-pins");
  const destEl = root.querySelector("#pk-dest");
  const youEl = root.querySelector("#pk-you");
  const pingBtn = root.querySelector("#pk-ping");
  const status = root.querySelector("#pk-status");
  const card = root.querySelector("#pk-card");

  // Destinations from the real marketing copy: SoFi, USC, Echo Park.
  const DESTS = {
    sofi: {
      label: "SoFi Stadium",
      dest: [50, 40],
      you: [8, 82],
      winner: 2,
      hosts: [
        { name: "Devon", price: 18, walk: 9, x: 24, y: 22 },
        { name: "J.R.", price: 12, walk: 12, x: 76, y: 18 },
        { name: "Maria", price: 15, walk: 6, x: 62, y: 58 },
        { name: "Sam", price: 10, walk: 14, x: 18, y: 62 },
        { name: "Lena", price: 20, walk: 4, x: 42, y: 74 },
      ],
      note: "Gate code 4821 — pull in behind the white Civic.",
      chat: "Maria: I'm home, gate's open. Look for the blue bins!",
    },
    usc: {
      label: "USC",
      dest: [42, 55],
      you: [90, 14],
      winner: 0,
      hosts: [
        { name: "Priya", price: 8, walk: 7, x: 26, y: 34 },
        { name: "Marcus", price: 12, walk: 5, x: 58, y: 28 },
        { name: "Tala", price: 10, walk: 10, x: 70, y: 66 },
        { name: "Ben", price: 6, walk: 15, x: 14, y: 76 },
      ],
      note: "Driveway on the left, blue house on Severance St.",
      chat: "Priya: Game days get busy — you're all set, spot #2.",
    },
    echo: {
      label: "Echo Park",
      dest: [60, 32],
      you: [12, 24],
      winner: 3,
      hosts: [
        { name: "Ana", price: 9, walk: 8, x: 34, y: 18 },
        { name: "Theo", price: 5, walk: 13, x: 22, y: 56 },
        { name: "Yuki", price: 12, walk: 3, x: 74, y: 44 },
        { name: "Gus", price: 7, walk: 6, x: 48, y: 68 },
      ],
      note: "Street-facing carport — you'll see the mural.",
      chat: "Gus: Park close to the fence so your friend fits too :)",
    },
  };

  let destKey = "sofi";
  let phase = "idle"; // idle → pinging → booked
  let timers = [];
  const wait = (ms) =>
    new Promise((r) => timers.push(setTimeout(r, reduced ? 0 : ms)));
  const clearTimers = () => { timers.forEach(clearTimeout); timers = []; };

  const render = () => {
    const d = DESTS[destKey];
    destEl.style.left = d.dest[0] + "%";
    destEl.style.top = d.dest[1] + "%";
    destEl.querySelector("span").textContent = d.label;
    youEl.style.left = d.you[0] + "%";
    youEl.style.top = d.you[1] + "%";
    pinsEl.innerHTML = d.hosts
      .map(
        (h, i) =>
          `<button class="pk-pin" style="left:${h.x}%;top:${h.y}%" data-i="${i}" ` +
          `aria-label="${h.name}'s spot, $${h.price}, ${h.walk} minute walk" ` +
          `title="${h.name} · ${h.walk} min walk">$${h.price}</button>`
      )
      .join("");
    card.className = "pk-card";
    card.innerHTML = "";
    pingBtn.disabled = false;
    pingBtn.textContent = "⚡ Ping hosts";
    status.textContent = `${d.hosts.length} hosts within walking distance of ${d.label}`;
    phase = "idle";
  };

  const ping = async () => {
    if (phase !== "idle") return;
    phase = "pinging";
    const d = DESTS[destKey];
    const pins = [...pinsEl.querySelectorAll(".pk-pin")];
    pingBtn.disabled = true;
    pingBtn.textContent = "pinging…";
    status.textContent = `Pinging every host near ${d.label} at once…`;
    pins.forEach((p, i) => {
      timers.push(setTimeout(() => p.classList.add("is-pinged"), reduced ? 0 : i * 140));
    });
    await wait(1500);
    if (phase !== "pinging") return;

    const win = pins[d.winner];
    const host = d.hosts[d.winner];
    pins.forEach((p, i) => p.classList.toggle("is-dim", i !== d.winner));
    win.classList.remove("is-pinged");
    win.classList.add("is-accepted");
    win.textContent = "✓";
    pingBtn.textContent = "✓ host found";
    status.textContent = `${host.name} accepted — real hosts usually answer in under 60 seconds`;

    card.innerHTML = `
      <div class="pk-card__head">
        <span class="pk-card__ok">✓</span>
        <div><b>${host.name} accepted</b><span>$${host.price} · ${host.walk} min walk to ${d.label}</span></div>
      </div>
      <p class="pk-card__note"><b>Access notes</b> ${d.note}</p>
      <p class="pk-card__chat">${d.chat}</p>
      <button class="pk-card__go" id="pk-go">Park &amp; go →</button>`;
    card.classList.add("is-on");
    phase = "booked";

    card.querySelector("#pk-go").addEventListener("click", () => {
      card.innerHTML = `
        <div class="pk-card__done">
          <span>You're in.</span>
          <small>Drive up. Pull in. Done. — that's the whole product</small>
          <button class="pk-card__go" id="pk-again">Try another destination</button>
        </div>`;
      card.querySelector("#pk-again").addEventListener("click", () => {
        clearTimers();
        render();
      });
    });
  };

  pingBtn.addEventListener("click", ping);
  root.querySelectorAll(".pk-dest-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      root.querySelectorAll(".pk-dest-btn").forEach((b) => {
        b.classList.remove("is-active");
        b.setAttribute("aria-pressed", "false");
      });
      btn.classList.add("is-active");
      btn.setAttribute("aria-pressed", "true");
      clearTimers();
      destKey = btn.dataset.dest;
      render();
    });
  });

  // Tapping a pin just teases the ping (the product pings all hosts at once).
  pinsEl.addEventListener("click", (e) => {
    const pin = e.target.closest(".pk-pin");
    if (!pin || phase !== "idle") return;
    const h = DESTS[destKey].hosts[+pin.dataset.i];
    status.textContent = `${h.name} · $${h.price} · ${h.walk} min walk — hit “Ping hosts” to reach everyone at once`;
  });

  render();
})();
