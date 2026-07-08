/* Parkzy walkthrough — the REAL app, not a mock. Self-contained, no deps.
 * Boots when #pk-walk is on the page (injected by project/main.ts).
 *
 * A screen recording of the actual product books a real spot near SoFi
 * Stadium. Step chips are synced to the recording's beat timestamps
 * (from the demo-recorder's beats.json): they highlight as the video plays,
 * and clicking one seeks the video to that moment.
 */
(() => {
  const root = document.getElementById("pk-walk");
  if (!root) return;

  const video = root.querySelector("#pk-video");
  const steps = [...root.querySelectorAll(".pk-flow button")];
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (reduced) video.setAttribute("controls", "");

  const times = steps.map((b) => parseFloat(b.dataset.t));

  const setActive = (i) => {
    steps.forEach((b, j) => {
      b.classList.toggle("is-active", j === i);
      b.setAttribute("aria-current", j === i ? "step" : "false");
    });
  };

  video.addEventListener("timeupdate", () => {
    const t = video.currentTime;
    let i = 0;
    for (let j = 0; j < times.length; j++) if (t >= times[j] - 0.2) i = j;
    setActive(i);
  });

  steps.forEach((b, i) => {
    b.addEventListener("click", () => {
      video.currentTime = times[i];
      setActive(i);
      video.play().catch(() => {});
    });
  });

  // Play while visible, pause offscreen (saves battery, respects attention).
  if (!reduced && "IntersectionObserver" in window) {
    new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) video.play().catch(() => {});
        else video.pause();
      },
      { threshold: 0.35 }
    ).observe(video);
  }

  setActive(0);
})();
