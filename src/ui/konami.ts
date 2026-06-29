// Konami code → a little reward.
const CODE = [
  "ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown",
  "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight",
  "b", "a",
];

export function initKonami(onUnlock: () => void) {
  let idx = 0;
  window.addEventListener("keydown", (e) => {
    const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    if (key === CODE[idx]) {
      idx++;
      if (idx === CODE.length) {
        idx = 0;
        onUnlock();
      }
    } else {
      idx = key === CODE[0] ? 1 : 0;
    }
  });
}
