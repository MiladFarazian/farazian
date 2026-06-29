// Decode/scramble text effect, used on [data-scramble] hover and on demand.
const GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!<>-_\\/[]{}=+*^?#";

export function scrambleTo(
  el: HTMLElement,
  finalText: string,
  duration = 600
): void {
  const start = performance.now();
  const len = finalText.length;

  const tick = (now: number) => {
    const p = Math.min(1, (now - start) / duration);
    let out = "";
    for (let i = 0; i < len; i++) {
      const ch = finalText[i];
      if (ch === " ") {
        out += " ";
        continue;
      }
      // Reveal characters left → right as progress advances.
      const revealAt = i / len;
      if (p >= revealAt + 0.18) {
        out += ch;
      } else if (p >= revealAt - 0.1) {
        out += GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
      } else {
        out += GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
      }
    }
    el.textContent = out;
    if (p < 1) requestAnimationFrame(tick);
    else el.textContent = finalText;
  };
  requestAnimationFrame(tick);
}

export function initScramble() {
  const els = document.querySelectorAll<HTMLElement>("[data-scramble]");
  els.forEach((el) => {
    const original = el.textContent?.trim() ?? "";
    el.dataset.text = original;
    let busy = false;
    el.addEventListener("pointerenter", () => {
      if (busy) return;
      busy = true;
      scrambleTo(el, original, 480);
      setTimeout(() => (busy = false), 500);
    });
  });
}
