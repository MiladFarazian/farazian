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
