/* Interactive LMBiS-Net segmentation demo — self-contained, no dependencies.
 * Boots when #lmbis-demo is on the page (injected by project/main.ts).
 *   1. A drag-to-reveal slider: raw fundus  ↔  raw fundus + neon vessel overlay.
 *   2. A toggle to swap the overlay between the model's prediction and the
 *      expert ground-truth label, so you can eyeball how close the net got.
 *   3. Benchmark bars (ours vs. the paper) that animate in on scroll.
 */
(() => {
  const root = document.getElementById("lmbis-demo");
  if (!root) return;

  // ---------- Reveal slider ----------
  const stage = root.querySelector("#lmbis-stage");
  const divider = root.querySelector("#lmbis-divider");
  const overlay = root.querySelector("#lmbis-overlay");
  const tagR = root.querySelector("#lmbis-tag-r");

  let pos = 58;
  let touched = false;

  const setPos = (p) => {
    pos = Math.max(0, Math.min(100, p));
    stage.style.setProperty("--pos", pos + "%");
    divider.setAttribute("aria-valuenow", Math.round(pos));
  };
  setPos(pos);

  const xToPct = (clientX) => {
    const r = stage.getBoundingClientRect();
    return ((clientX - r.left) / r.width) * 100;
  };

  let dragging = false;
  stage.addEventListener("pointerdown", (e) => {
    dragging = true;
    touched = true;
    try {
      stage.setPointerCapture(e.pointerId);
    } catch {
      /* older browsers */
    }
    setPos(xToPct(e.clientX));
  });
  stage.addEventListener("pointermove", (e) => {
    if (dragging) setPos(xToPct(e.clientX));
  });
  const stop = () => (dragging = false);
  stage.addEventListener("pointerup", stop);
  stage.addEventListener("pointercancel", stop);

  // Keyboard access on the handle.
  divider.tabIndex = 0;
  divider.setAttribute("role", "slider");
  divider.setAttribute("aria-label", "Reveal AI vessel segmentation");
  divider.setAttribute("aria-valuemin", "0");
  divider.setAttribute("aria-valuemax", "100");
  divider.addEventListener("keydown", (e) => {
    if (e.key === "ArrowLeft") {
      touched = true;
      setPos(pos - 4);
      e.preventDefault();
    } else if (e.key === "ArrowRight") {
      touched = true;
      setPos(pos + 4);
      e.preventDefault();
    }
  });

  // One-time "wipe in" so it's obvious the vessels are revealable.
  const introSweep = () => {
    let start = null;
    const from = 100;
    const to = 58;
    const dur = 1200;
    const frame = (t) => {
      if (start === null) start = t;
      const k = Math.min(1, (t - start) / dur);
      const e = 1 - Math.pow(1 - k, 3); // easeOutCubic
      if (!touched) setPos(from + (to - from) * e);
      if (k < 1 && !touched) requestAnimationFrame(frame);
    };
    setPos(from);
    requestAnimationFrame(frame);
  };
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          io.disconnect();
          if (!touched) introSweep();
        }
      },
      { threshold: 0.4 }
    );
    io.observe(stage);
  }

  // ---------- Prediction ↔ ground-truth toggle ----------
  root.querySelectorAll(".lmbis-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      root.querySelectorAll(".lmbis-btn").forEach((b) => {
        b.classList.remove("is-active");
        b.setAttribute("aria-pressed", "false");
      });
      btn.classList.add("is-active");
      btn.setAttribute("aria-pressed", "true");
      overlay.src = new URL(btn.dataset.src, overlay.src).href;
      overlay.alt = btn.dataset.label;
      stage.dataset.accent = btn.dataset.accent;
      if (tagR) tagR.textContent = btn.dataset.label;
    });
  });

  // ---------- Benchmark bars ----------
  const bench = document.getElementById("lmbis-bench");
  if (bench) {
    const fills = bench.querySelectorAll(".lmbis-fill");
    const paint = () =>
      fills.forEach((f) => {
        f.style.width = (parseFloat(f.dataset.val) * 100).toFixed(1) + "%";
      });
    if ("IntersectionObserver" in window) {
      const io = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting) {
            io.disconnect();
            paint();
          }
        },
        { threshold: 0.3 }
      );
      io.observe(bench);
    } else {
      paint();
    }
  }
})();
