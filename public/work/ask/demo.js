// Ask This Site — live retrieval Q&A against /api/ask, plus an eval suite
// that runs in the visitor's browser against production. Citations or silence.
(() => {
  const root = document.getElementById("askd");
  if (!root || root.dataset.booted) return;
  root.dataset.booted = "1";

  const EXAMPLES = [
    "How does Parkzy handle payments?",
    "What did Milad build at Walmart?",
    "Does he have LLM evaluation experience?",
    "What is the 23-agent company?",
    "How does this site work without a framework?",
    "What's his favorite pizza topping?",
  ];

  // Live eval suite: expected-source checks + must-abstain checks.
  const SUITE = [
    { q: "How does Parkzy handle payments and payouts?", expect: ["money-correctness", "parkzy"] },
    { q: "What did Milad do at Walmart?", expect: ["/resume/"] },
    { q: "What is Honest and what does it check?", expect: ["honest"] },
    { q: "What did the abstention study find?", expect: ["schema-abstention"] },
    { q: "Why did Parkzy pings expire?", expect: ["ping-dispatch"] },
    { q: "What is Milad's education?", expect: ["/resume/"] },
    { q: "What's Milad's favorite pizza topping?", abstain: true },
    { q: "Who won the 2022 World Cup?", abstain: true },
  ];

  root.innerHTML = `
    <div class="askd__box">
      <input class="askd__input" type="text" maxlength="300" placeholder="ask about the work — e.g. how does Parkzy handle payments?" aria-label="Ask a question about Milad's work" />
      <button class="askd__go" type="button">ask ↵</button>
    </div>
    <div class="askd__chips"></div>
    <div class="askd__out" aria-live="polite"></div>
    <div class="askd__evalbar">
      <button class="askd__evalbtn" type="button">▶ run the eval suite against production</button>
      <span class="askd__evalnote">8 cases: 6 must cite the right source · 2 must abstain</span>
    </div>
    <div class="askd__eval"></div>`;

  const input = root.querySelector(".askd__input");
  const go = root.querySelector(".askd__go");
  const chips = root.querySelector(".askd__chips");
  const out = root.querySelector(".askd__out");
  const evalBtn = root.querySelector(".askd__evalbtn");
  const evalOut = root.querySelector(".askd__eval");

  const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  async function ask(q) {
    const r = await fetch(`/api/ask?q=${encodeURIComponent(q)}`);
    if (!r.ok) throw new Error(`http ${r.status}`);
    return r.json();
  }

  let busy = false;
  async function run(q) {
    if (busy || !q.trim()) return;
    busy = true;
    input.value = q;
    out.innerHTML = `<div class="askd__thinking">retrieving…</div>`;
    const t0 = performance.now();
    try {
      const d = await ask(q);
      const ms = Math.round(performance.now() - t0);
      if (d.abstained) {
        out.innerHTML = `
          <div class="askd__abstain">
            <b>∅ abstained</b>
            <p>${esc(d.note || "The corpus doesn't support an answer to that.")}</p>
            <span class="askd__meta">${esc(d.mode || "retrieval")} · ${ms}ms — refusing is a feature, not a failure</span>
          </div>`;
        busy = false;
        return;
      }
      const srcs = (d.sources || [])
        .slice(0, 3)
        .map(
          (s, i) => `
          <a class="askd__src" href="${esc(s.url)}">
            <i>[${i + 1}]</i>
            <div><b>${esc(s.title)}${s.heading ? " — " + esc(s.heading) : ""}</b>
            <p>“${esc(s.snippet || "")}”</p></div>
          </a>`
        )
        .join("");
      out.innerHTML = `
        <div class="askd__answer">
          <p>${esc(d.answer || "")}</p>
          <span class="askd__meta">${esc(d.mode)} mode · ${ms}ms · every claim below is verbatim from a linked source</span>
        </div>
        <div class="askd__srcs">${srcs}</div>`;
    } catch (err) {
      out.innerHTML = `<div class="askd__abstain"><b>×</b><p>network error: ${esc(err.message)}</p></div>`;
    }
    busy = false;
  }

  EXAMPLES.forEach((q) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "askd__chip";
    b.textContent = q;
    b.addEventListener("click", () => run(q));
    chips.appendChild(b);
  });
  go.addEventListener("click", () => run(input.value));
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") run(input.value);
  });

  let evalBusy = false;
  evalBtn.addEventListener("click", async () => {
    if (evalBusy) return;
    evalBusy = true;
    evalBtn.textContent = "running…";
    evalOut.innerHTML = "";
    let pass = 0;
    for (const c of SUITE) {
      const row = document.createElement("div");
      row.className = "askd__case";
      row.innerHTML = `<i>…</i><span>${esc(c.q)}</span><em></em>`;
      evalOut.appendChild(row);
      try {
        const d = await ask(c.q);
        let ok, why;
        if (c.abstain) {
          ok = d.abstained === true;
          why = ok ? "abstained, correctly" : "ANSWERED — should have abstained";
        } else {
          const urls = (d.sources || []).map((s) => s.url).join(" ");
          ok = !d.abstained && c.expect.some((e) => urls.includes(e));
          why = ok ? `cited ${c.expect.find((e) => urls.includes(e))}` : d.abstained ? "abstained — should have answered" : "wrong sources";
        }
        if (ok) pass++;
        row.classList.add(ok ? "is-pass" : "is-fail");
        row.querySelector("i").textContent = ok ? "✓" : "✗";
        row.querySelector("em").textContent = why;
      } catch {
        row.classList.add("is-fail");
        row.querySelector("i").textContent = "✗";
        row.querySelector("em").textContent = "network error";
      }
    }
    const bar = document.createElement("div");
    bar.className = "askd__verdict " + (pass === SUITE.length ? "is-pass" : "is-fail");
    bar.textContent =
      pass === SUITE.length
        ? `suite green: ${pass}/${SUITE.length} — right citations on answerables, silence on unanswerables`
        : `${pass}/${SUITE.length} passed — a red row here is a real regression, visible to everyone`;
    evalOut.appendChild(bar);
    evalBtn.textContent = "▶ run the eval suite against production";
    evalBusy = false;
  });
})();
