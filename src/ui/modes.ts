// Secret theme modes — an easter egg. Type a codeword anywhere (matrix, vapor,
// noir) to reskin the site's accent palette; "reset" restores it. Also reachable
// via the terminal's `theme <name>` command. Purely cosmetic (CSS variables).
const html = document.documentElement;

export const THEME_WORDS = ["matrix", "vapor", "noir", "gold", "reset"] as const;
export type ThemeWord = (typeof THEME_WORDS)[number];

const LABELS: Record<string, string> = {
  matrix: "matrix mode ☣",
  vapor: "vapor mode ✿",
  noir: "noir mode ◐",
  gold: "midas mode ✦",
  reset: "back to normal",
};

let toastEl: HTMLDivElement | null = null;
let toastTimer = 0;

function toast(msg: string) {
  if (!toastEl) {
    toastEl = document.createElement("div");
    toastEl.className = "mode-toast";
    document.body.appendChild(toastEl);
  }
  toastEl.innerHTML = `${msg} <span>· type <b>reset</b> to undo</span>`;
  toastEl.classList.add("is-on");
  clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toastEl?.classList.remove("is-on"), 3200);
}

export function applyThemeMode(name: string): boolean {
  const n = name.toLowerCase();
  if (!(THEME_WORDS as readonly string[]).includes(n)) return false;
  if (n === "reset") {
    html.removeAttribute("data-mode");
  } else {
    html.setAttribute("data-mode", n);
  }
  toast(LABELS[n] || n);
  return true;
}
