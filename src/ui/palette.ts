// Command palette (⌘K / Ctrl+K) — fuzzy jump-to navigation + actions.
export interface Command {
  id: string;
  label: string;
  icon: string;
  hint?: string;
  run: () => void;
}

export interface PaletteAPI {
  open: () => void;
  close: () => void;
  toggle: () => void;
}

export function initPalette(commands: Command[]): PaletteAPI {
  const root = document.getElementById("palette")!;
  const input = document.getElementById("palette-input") as HTMLInputElement;
  const list = document.getElementById("palette-list")!;
  let active = 0;
  let filtered = commands;

  const render = () => {
    list.innerHTML = "";
    filtered.forEach((c, i) => {
      const li = document.createElement("li");
      li.className = "palette__item" + (i === active ? " is-active" : "");
      li.innerHTML = `<span class="ico">${c.icon}</span><span>${c.label}</span>${
        c.hint ? `<span class="hint">${c.hint}</span>` : ""
      }`;
      li.addEventListener("pointerenter", () => {
        active = i;
        render();
      });
      li.addEventListener("click", () => {
        close();
        c.run();
      });
      list.appendChild(li);
    });
  };

  const filter = (q: string) => {
    const s = q.trim().toLowerCase();
    filtered = s
      ? commands.filter((c) => c.label.toLowerCase().includes(s) || c.id.includes(s))
      : commands;
    active = 0;
    render();
  };

  const open = () => {
    root.classList.add("is-open");
    root.setAttribute("aria-hidden", "false");
    input.value = "";
    filter("");
    setTimeout(() => input.focus(), 50);
  };
  const close = () => {
    root.classList.remove("is-open");
    root.setAttribute("aria-hidden", "true");
    input.blur();
  };
  const toggle = () => (root.classList.contains("is-open") ? close() : open());

  input.addEventListener("input", () => filter(input.value));
  input.addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      active = Math.min(filtered.length - 1, active + 1);
      render();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      active = Math.max(0, active - 1);
      render();
    } else if (e.key === "Enter") {
      e.preventDefault();
      const c = filtered[active];
      if (c) {
        close();
        c.run();
      }
    } else if (e.key === "Escape") {
      close();
    }
  });

  root.addEventListener("pointerdown", (e) => {
    if (e.target === root) close();
  });

  window.addEventListener("keydown", (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
      e.preventDefault();
      toggle();
    }
  });

  render();
  return { open, close, toggle };
}
