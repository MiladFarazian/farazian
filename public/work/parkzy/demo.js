/* Parkzy walkthrough — code-rendered from the app's Remotion demo pipeline
 * (Parkway/parkzy-demo-video, composition ParkzyPingDemo), so it always
 * matches the current product. Self-contained, no deps; boots when #pk-walk
 * is on the page (injected by project/main.ts).
 *
 * Interactions: step chips highlight in sync with the video (timestamps from
 * the composition's TIMING table, 30fps), clicking a step seeks the video,
 * and the scrubber gives frame-level control like a mini Remotion Studio.
 */
(() => {
  const root = document.getElementById("pk-walk");
  if (!root) return;

  const video = root.querySelector("#pk-video");
  const scrub = root.querySelector("#pk-scrub");
  const steps = [...root.querySelectorAll(".pk-flow button")];
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const times = steps.map((b) => parseFloat(b.dataset.t));

  const setActive = (i) => {
    steps.forEach((b, j) => {
      b.classList.toggle("is-active", j === i);
      b.setAttribute("aria-current", j === i ? "step" : "false");
    });
  };

  let scrubbing = false;

  video.addEventListener("timeupdate", () => {
    const t = video.currentTime;
    let i = 0;
    for (let j = 0; j < times.length; j++) if (t >= times[j] - 0.25) i = j;
    setActive(i);
    if (!scrubbing && video.duration) {
      scrub.value = Math.round((t / video.duration) * 1000);
    }
  });

  steps.forEach((b, i) => {
    b.addEventListener("click", () => {
      video.currentTime = times[i];
      setActive(i);
      video.play().catch(() => {});
    });
  });

  // Scrubber: pause while dragging (frame-accurate feel), resume on release.
  const seekToScrub = () => {
    if (video.duration) video.currentTime = (scrub.value / 1000) * video.duration;
  };
  scrub.addEventListener("pointerdown", () => {
    scrubbing = true;
    video.pause();
  });
  scrub.addEventListener("input", seekToScrub);
  const endScrub = () => {
    if (!scrubbing) return;
    scrubbing = false;
    if (!reduced) video.play().catch(() => {});
  };
  scrub.addEventListener("pointerup", endScrub);
  scrub.addEventListener("pointercancel", endScrub);
  scrub.addEventListener("change", () => {
    seekToScrub();
    endScrub();
  });

  // Play while visible, pause offscreen (saves battery, respects attention).
  if (!reduced && "IntersectionObserver" in window) {
    new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          if (!scrubbing) video.play().catch(() => {});
        } else video.pause();
      },
      { threshold: 0.35 }
    ).observe(video);
  }

  setActive(0);
})();
