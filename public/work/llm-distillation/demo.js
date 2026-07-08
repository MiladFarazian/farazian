/* Interactive LLM-distillation benchmark — self-contained, no dependencies.
 * Boots when #llm-demo is on the page (injected by project/main.ts).
 * Grouped columns for each model; a toggle swaps between Accuracy and F1, and
 * the bars re-animate. Numbers are the real Financial Phrase Bank results.
 */
(() => {
  const root = document.getElementById("llm-demo");
  if (!root) return;

  const chart = root.querySelector("#llm-chart");
  const cols = Array.from(root.querySelectorAll(".llm-col"));
  let metric = "acc";
  let live = false; // only paint once we've scrolled into view

  const render = () => {
    cols.forEach((col) => {
      const v = parseFloat(col.dataset[metric]);
      const bar = col.querySelector(".llm-bar");
      const val = col.querySelector(".llm-val");
      bar.style.height = live ? (v * 100).toFixed(0) + "%" : "0%";
      val.textContent = v.toFixed(2);
    });
  };
  render();

  root.querySelectorAll(".llm-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      root.querySelectorAll(".llm-btn").forEach((b) => {
        b.classList.remove("is-active");
        b.setAttribute("aria-pressed", "false");
      });
      btn.classList.add("is-active");
      btn.setAttribute("aria-pressed", "true");
      metric = btn.dataset.metric;
      render();
    });
  });

  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          io.disconnect();
          live = true;
          render();
        }
      },
      { threshold: 0.3 }
    );
    io.observe(chart);
  } else {
    live = true;
    render();
  }
})();

/* "Watch the model think" — replays the REAL example outputs from the poster,
 * verbatim (typos and all), with a typewriter reveal. */
(() => {
  const root = document.getElementById("llm-play");
  if (!root) return;

  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const title = root.querySelector("#llm-term-title");
  const input = root.querySelector("#llm-input");
  const badge = root.querySelector("#llm-badge");
  const rationale = root.querySelector("#llm-rationale");

  const EXAMPLES = [
    {
      model: "distilled T5 — student",
      input: "Bitcoin just crashed today, this is a disaastah!",
      label: "negative",
      rationale:
        "The sentiment is “negative” because the news mentions a loss of money, which is a disaastah (identified as a negative word).",
    },
    {
      model: "LLaMA 3 — teacher",
      input:
        "Amazon is opening up another physical store, this time for consumers who want to buy clothes.",
      label: "neutral",
      rationale:
        "The news simply states a fact about Amazon opening a physical store, without expressing any opinion or emotion.",
    },
  ];

  let gen = 0; // cancels an in-flight replay when a new one starts

  const type = (el, text, ms, g) =>
    new Promise((done) => {
      if (reduced) {
        el.textContent = text;
        return done();
      }
      el.textContent = "";
      let i = 0;
      const step = () => {
        if (g !== gen) return; // superseded
        el.textContent = text.slice(0, ++i);
        if (i < text.length) setTimeout(step, ms);
        else done();
      };
      step();
    });

  const play = async (ex) => {
    const g = ++gen;
    title.textContent = ex.model;
    badge.className = "llm-badge";
    badge.textContent = "";
    rationale.textContent = "";
    await type(input, ex.input, 26, g);
    if (g !== gen) return;
    await new Promise((r) => setTimeout(r, reduced ? 0 : 320));
    if (g !== gen) return;
    badge.textContent = ex.label;
    badge.classList.add("is-on", "llm-badge--" + ex.label);
    await new Promise((r) => setTimeout(r, reduced ? 0 : 260));
    if (g !== gen) return;
    await type(rationale, ex.rationale, 13, g);
  };

  root.querySelectorAll(".llm-ex").forEach((btn) => {
    btn.addEventListener("click", () => {
      root.querySelectorAll(".llm-ex").forEach((b) => {
        b.classList.remove("is-active");
        b.setAttribute("aria-pressed", "false");
      });
      btn.classList.add("is-active");
      btn.setAttribute("aria-pressed", "true");
      play(EXAMPLES[+btn.dataset.ex]);
    });
  });

  // Auto-play the first example when scrolled into view.
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          io.disconnect();
          play(EXAMPLES[0]);
        }
      },
      { threshold: 0.35 }
    );
    io.observe(root);
  } else {
    play(EXAMPLES[0]);
  }
})();
