/* Fairness playground — a tiny hiring simulation, self-contained, no deps.
 * Boots when #hml-demo is on the page (injected by project/main.ts).
 *
 * The setup (mirrors the talk):
 *   · Two groups of candidates with IDENTICAL true-quality distributions.
 *   · Historical bias has depressed the RECORDED score of most of group B —
 *     the world was unfair, so the data is unfair.
 *   · A model picks a score cutoff. Visitors switch between four policies and
 *     watch who gets hired, who gets wrongly rejected, and what each fairness
 *     definition (from Fu et al. [3]) actually trades away.
 *
 * Everything is computed from the generated sample — no hand-tuned numbers.
 */
(() => {
  const root = document.getElementById("hml-demo");
  if (!root) return;

  const canvas = root.querySelector("#hml-canvas");
  const ctx = canvas.getContext("2d");
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ---------- Deterministic sample ----------
  // Seeded so every visitor sees the same (representative) world.
  const mulberry32 = (a) => () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const rng = mulberry32(20211116); // the talk's date

  const QUAL = 0.55; // truly-qualified line (on true quality)
  const BIAS = 0.18; // how far history depressed group B's recorded scores
  const PER_GROUP = 80;

  const people = [];
  for (let g = 0; g < 2; g++) {
    for (let i = 0; i < PER_GROUP; i++) {
      const q = 0.04 + rng() * 0.98; // true quality — SAME distribution for both
      const hit = g === 1 && rng() < 0.7; // history hit ~70% of group B
      const noise = (rng() - 0.5) * 0.04;
      const s = Math.max(0.02, Math.min(0.98, q - (hit ? BIAS : 0) + noise));
      people.push({ g, q, s, hit, y: 0.18 + rng() * 0.64 });
    }
  }
  const A = people.filter((p) => p.g === 0);
  const B = people.filter((p) => p.g === 1);

  // ---------- Policy math (all solved from the sample) ----------
  const T = 0.55; // the cutoff the model learned from (mostly-A) history

  const rate = (grp, t) => grp.filter((p) => p.s >= t).length / grp.length;
  const qualRate = (grp, t) => {
    const qual = grp.filter((p) => p.q >= QUAL);
    return qual.filter((p) => p.s >= t).length / qual.length;
  };
  // Scan candidate cutoffs for the t that makes fn(B, t) match a target.
  const solve = (fn, target) => {
    let best = T, err = Infinity;
    for (let t = 0.02; t <= 0.98; t += 0.005) {
      const e = Math.abs(fn(B, t) - target);
      if (e < err - 1e-9) { err = e; best = t; }
    }
    return best;
  };

  const POLICIES = {
    raw: { tA: T, tB: T + 0.1 },
    blind: { tA: T, tB: T },
    eo: { tA: T, tB: solve(qualRate, qualRate(A, T)) },
    dp: { tA: T, tB: solve(rate, rate(A, T)) },
  };

  // ---------- Rendering ----------
  const CYAN = "#2af5ff";
  const VIOLET = "#b06bff";
  const RED = "#ff5470";
  let W = 0, H = 0, dpr = 1;
  const LANE = { A: [0.1, 0.44], B: [0.56, 0.9] }; // y-bands (fractions)

  const sizeCanvas = () => {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = canvas.clientWidth;
    H = canvas.clientHeight;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };

  const PADX = 18;
  const sx = (s) => PADX + s * (W - PADX * 2);
  const laneY = (p) => {
    const [y0, y1] = p.g === 0 ? LANE.A : LANE.B;
    return (y0 + p.y * (y1 - y0)) * H;
  };

  // Current (animated) thresholds.
  const cur = { tA: POLICIES.raw.tA, tB: POLICIES.raw.tB };
  let target = { ...POLICIES.raw };
  let active = "raw";
  let pulse = 0;

  const draw = () => {
    ctx.clearRect(0, 0, W, H);

    // Lane labels + baselines
    ctx.font = "600 10px 'JetBrains Mono', monospace";
    ctx.textBaseline = "top";
    for (const [g, label, col] of [[0, "GROUP A", VIOLET], [1, "GROUP B", CYAN]]) {
      const [y0, y1] = g === 0 ? LANE.A : LANE.B;
      ctx.fillStyle = "rgba(255,255,255,0.35)";
      ctx.fillText(label, PADX, y0 * H - 14);
      ctx.fillStyle = col + "22";
      ctx.fillRect(PADX, y0 * H, W - PADX * 2, (y1 - y0) * H);
    }

    // Dots
    for (const p of people) {
      const t = p.g === 0 ? cur.tA : cur.tB;
      const ok = p.s >= t;
      const qualified = p.q >= QUAL;
      const x = sx(p.s);
      const y = laneY(p);
      const col = p.g === 0 ? VIOLET : CYAN;

      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      if (ok) {
        ctx.fillStyle = col;
        ctx.shadowColor = col;
        ctx.shadowBlur = 8;
        ctx.globalAlpha = qualified ? 1 : 0.75;
        ctx.fill();
        ctx.shadowBlur = 0;
        if (!qualified) {
          // hired but not truly qualified — hollow center
          ctx.fillStyle = "#0a0e16";
          ctx.beginPath();
          ctx.arc(x, y, 1.8, 0, Math.PI * 2);
          ctx.fill();
        }
      } else {
        ctx.globalAlpha = 0.45;
        ctx.strokeStyle = "rgba(255,255,255,0.5)";
        ctx.lineWidth = 1;
        if (qualified) {
          // qualified but rejected — the injustice — red pulsing ring
          const r = 4 + (reduced ? 0 : Math.sin(pulse + p.y * 9) * 0.9);
          ctx.globalAlpha = 0.95;
          ctx.strokeStyle = RED;
          ctx.lineWidth = 1.6;
          ctx.beginPath();
          ctx.arc(x, y, r, 0, Math.PI * 2);
          ctx.stroke();
        } else {
          ctx.stroke();
        }
      }
      ctx.globalAlpha = 1;
    }

    // Threshold lines
    for (const [g, t] of [[0, cur.tA], [1, cur.tB]]) {
      const [y0, y1] = g === 0 ? LANE.A : LANE.B;
      const x = sx(t);
      ctx.strokeStyle = "#ffffff";
      ctx.globalAlpha = 0.85;
      ctx.setLineDash([5, 4]);
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(x, y0 * H - 4);
      ctx.lineTo(x, y1 * H + 4);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 0.6;
      ctx.font = "600 9px 'JetBrains Mono', monospace";
      ctx.fillStyle = "#fff";
      ctx.fillText("cutoff", Math.min(x + 5, W - 44), y0 * H + 2);
      ctx.globalAlpha = 1;
    }

    // Axis
    ctx.fillStyle = "rgba(255,255,255,0.35)";
    ctx.font = "500 9.5px 'JetBrains Mono', monospace";
    ctx.fillText("score the model sees →", PADX, H - 13);
  };

  // ---------- Metrics ----------
  const fmtPct = (v) => Math.round(v * 100) + "%";
  const els = {
    barA: root.querySelector("#hml-bar-a"),
    barB: root.querySelector("#hml-bar-b"),
    valA: root.querySelector("#hml-val-a"),
    valB: root.querySelector("#hml-val-b"),
    wrongA: root.querySelector("#hml-wrong-a"),
    wrongB: root.querySelector("#hml-wrong-b"),
    formula: root.querySelector("#hml-formula"),
    expl: root.querySelector("#hml-expl"),
  };

  const EXPLAIN = {
    raw: {
      formula: "accept if score ≥ cutoff  (+ group penalty the model learned)",
      text:
        "Trained on history as-is, the model notices group B “looks riskier” in the data and learns its own extra penalty on top of the already-depressed scores. Bias isn’t just inherited — it’s amplified.",
    },
    blind: {
      formula: "cₚ = cᵣ   — equal treatment [3]",
      text:
        "Individual fairness: one identical rule for everyone, protected attribute removed. But the scores themselves carry history’s bias — the red rings in lane B are qualified people the data hid. Blindness alone doesn’t fix biased data.",
    },
    eo: {
      formula: "Probₚ[L=1|D] = Probᵣ[L=1|D]   — equal opportunity [3]",
      text:
        "Group fairness: among truly qualified candidates, both groups are accepted at the same rate. Notice the cost — to reach the qualified people the data hid, the cutoff for B drops, and a few not-quite-qualified scores come with it. Fairness isn’t free when the data is corrupted.",
    },
    dp: {
      formula: "Probₚ[L=1] = Probᵣ[L=1]   — demographic parity [3]",
      text:
        "Group fairness: both groups are hired at the same overall rate, regardless of what the biased scores say. Equal outcome — achieved by giving group B the lower cutoff its data denied it.",
    },
  };

  const updateMetrics = () => {
    const p = POLICIES[active];
    const rA = rate(A, p.tA);
    const rB = rate(B, p.tB);
    const wrongA = A.filter((x) => x.q >= QUAL && x.s < p.tA).length;
    const wrongB = B.filter((x) => x.q >= QUAL && x.s < p.tB).length;
    els.barA.style.width = fmtPct(rA);
    els.barB.style.width = fmtPct(rB);
    els.valA.textContent = fmtPct(rA);
    els.valB.textContent = fmtPct(rB);
    els.wrongA.textContent = wrongA;
    els.wrongB.textContent = wrongB;
    els.formula.textContent = EXPLAIN[active].formula;
    els.expl.textContent = EXPLAIN[active].text;
  };

  // ---------- Interaction ----------
  root.querySelectorAll(".hml-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      root.querySelectorAll(".hml-btn").forEach((b) => {
        b.classList.remove("is-active");
        b.setAttribute("aria-pressed", "false");
      });
      btn.classList.add("is-active");
      btn.setAttribute("aria-pressed", "true");
      active = btn.dataset.policy;
      target = { ...POLICIES[active] };
      updateMetrics();
    });
  });

  // ---------- Loop ----------
  let raf = 0;
  const tick = () => {
    const k = reduced ? 1 : 0.12;
    cur.tA += (target.tA - cur.tA) * k;
    cur.tB += (target.tB - cur.tB) * k;
    pulse += 0.09;
    draw();
    raf = requestAnimationFrame(tick);
  };

  // Pause the loop offscreen.
  if ("IntersectionObserver" in window) {
    new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        if (!raf) { sizeCanvas(); tick(); }
      } else if (raf) {
        cancelAnimationFrame(raf);
        raf = 0;
      }
    }).observe(canvas);
  } else {
    sizeCanvas();
    tick();
  }

  window.addEventListener("resize", () => { sizeCanvas(); draw(); });

  sizeCanvas();
  updateMetrics();
  draw();
})();
