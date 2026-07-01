// A small but real interactive terminal — the engineer's easter egg.
import { PROJECTS, STACK_GROUPS, LINKS, NAME } from "../content";

export interface TerminalAPI {
  open: () => void;
  close: () => void;
  toggle: () => void;
  isOpen: () => boolean;
}

export function initTerminal(onScrollTo: (sel: string) => void): TerminalAPI {
  const root = document.getElementById("term")!;
  const output = document.getElementById("term-output")!;
  const input = document.getElementById("term-input") as HTMLInputElement;
  const closeBtn = document.getElementById("term-close")!;
  const history: string[] = [];
  let hIndex = 0;

  const print = (html: string) => {
    const div = document.createElement("div");
    div.innerHTML = html;
    output.appendChild(div);
    output.scrollTop = output.scrollHeight;
  };
  const printCmd = (cmd: string) =>
    print(`<span class="ok">farazian:~$</span> ${escapeHtml(cmd)}`);

  const banner = () => {
    print(`<span class="accent">${NAME}</span> — interactive shell`);
    print(`type <span class="ok">help</span> to see what i can do. <span class="ok">exit</span> to close.`);
  };

  const COMMANDS: Record<string, (args: string[]) => void> = {
    help: () =>
      print(
        [
          "available commands:",
          "  <span class='ok'>whoami</span>     who is this",
          "  <span class='ok'>ls</span>         list sections / projects",
          "  <span class='ok'>open</span> [x]   jump to a section (work, about, stack, contact)",
          "  <span class='ok'>cat</span> about  read the about blurb",
          "  <span class='ok'>skills</span>     the stack",
          "  <span class='ok'>projects</span>   selected work",
          "  <span class='ok'>contact</span>    how to reach me",
          "  <span class='accent'>sudo hire-me</span>  (try it)",
          "  <span class='ok'>matrix</span>     ☣",
          "  <span class='ok'>clear</span>      wipe the screen",
          "  <span class='ok'>exit</span>       close the terminal",
        ].join("<br>")
      ),
    whoami: () =>
      print(
        `${NAME} — software engineer. full-stack, graphics, and the stubborn 1% that makes things feel <span class="accent">alive</span>.`
      ),
    ls: (args) => {
      if (args[0] === "projects" || args[0] === "projects/") {
        print(PROJECTS.map((p) => `<span class="ok">${p.title.toLowerCase()}/</span>`).join("&nbsp;&nbsp;"));
      } else {
        print(
          ["<span class='accent'>about/</span>", "<span class='accent'>projects/</span>", "<span class='accent'>stack/</span>", "<span class='accent'>contact/</span>"].join(
            "&nbsp;&nbsp;"
          )
        );
      }
    },
    cat: (args) => {
      if (args[0]?.startsWith("about")) {
        print(
          "i build fast, beautiful, slightly impossible things on the web — from GPU shaders to production systems. currently shipping <span class='accent'>Parkzy</span>."
        );
      } else {
        print(`<span class="err">cat: ${escapeHtml(args[0] || "")}: no such file</span>`);
      }
    },
    projects: () => {
      PROJECTS.forEach((p) =>
        print(`<span class="ok">${p.title}</span> — ${p.desc} ${p.href !== "#" ? `<a href="${p.href}" target="_blank" rel="noopener">↗</a>` : ""}`)
      );
    },
    skills: () =>
      STACK_GROUPS.forEach((g) =>
        print(`<span class="ok">${g.label}</span>: ${g.items.join("&nbsp;·&nbsp;")}`)
      ),
    contact: () => {
      print("let's talk:");
      LINKS.forEach((l) => print(`  <span class="ok">${l.label}</span> → <a href="${l.href}" target="_blank" rel="noopener">${l.href}</a>`));
    },
    open: (args) => {
      const map: Record<string, string> = {
        work: "#work",
        projects: "#work",
        about: "#about",
        stack: "#stack",
        skills: "#stack",
        contact: "#contact",
      };
      const sel = map[args[0]];
      if (sel) {
        print(`<span class="ok">→</span> navigating to ${args[0]}…`);
        onScrollTo(sel);
      } else {
        print(`<span class="err">open: unknown section '${escapeHtml(args[0] || "")}'</span>`);
      }
    },
    sudo: (args) => {
      if (args[0] === "hire-me") {
        print("<span class='ok'>[sudo] authenticating…</span>");
        setTimeout(() => print("<span class='accent'>access granted ✓</span>"), 450);
        setTimeout(
          () =>
            print(
              `📨 the fastest path is <a href="mailto:miladfarazian@gmail.com">miladfarazian@gmail.com</a> — i reply quick.`
            ),
          900
        );
      } else {
        print(`<span class="err">sudo: ${escapeHtml(args.join(" "))}: permission theatrics not found</span>`);
      }
    },
    matrix: () => {
      print("<span class='ok'>wake up, Neo…</span>");
      runMatrix();
    },
    clear: () => (output.innerHTML = ""),
    exit: () => close(),
  };

  const run = (raw: string) => {
    const cmd = raw.trim();
    if (!cmd) return;
    printCmd(cmd);
    history.push(cmd);
    hIndex = history.length;
    const [name, ...args] = cmd.split(/\s+/);
    const fn = COMMANDS[name.toLowerCase()];
    if (fn) fn(args);
    else
      print(
        `<span class="err">command not found: ${escapeHtml(name)}</span> — try <span class="ok">help</span>`
      );
  };

  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      run(input.value);
      input.value = "";
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (hIndex > 0) input.value = history[--hIndex] ?? "";
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (hIndex < history.length - 1) input.value = history[++hIndex] ?? "";
      else {
        hIndex = history.length;
        input.value = "";
      }
    } else if (e.key === "Tab") {
      e.preventDefault();
      const partial = input.value.toLowerCase();
      const match = Object.keys(COMMANDS).find((c) => c.startsWith(partial));
      if (match) input.value = match;
    }
  });

  const open = () => {
    if (root.classList.contains("is-open")) return;
    root.classList.add("is-open");
    root.setAttribute("aria-hidden", "false");
    if (!output.childElementCount) banner();
    setTimeout(() => input.focus(), 60);
  };
  const close = () => {
    root.classList.remove("is-open");
    root.setAttribute("aria-hidden", "true");
  };
  const toggle = () => (root.classList.contains("is-open") ? close() : open());
  const isOpen = () => root.classList.contains("is-open");

  closeBtn.addEventListener("click", close);

  return { open, close, toggle, isOpen };
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));
}

// Brief fullscreen "matrix rain" flourish.
function runMatrix() {
  const canvas = document.createElement("canvas");
  canvas.style.cssText =
    "position:fixed;inset:0;z-index:999;pointer-events:none;transition:opacity .6s";
  document.body.appendChild(canvas);
  const ctx = canvas.getContext("2d")!;
  const resize = () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  };
  resize();
  const cols = Math.floor(canvas.width / 14);
  const drops = new Array(cols).fill(1);
  const chars = "アァカサタナハマヤラワ0123456789MILADFARAZIAN".split("");
  let frames = 0;
  const draw = () => {
    ctx.fillStyle = "rgba(4,6,10,0.08)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#2af5ff";
    ctx.font = "14px monospace";
    for (let i = 0; i < drops.length; i++) {
      const ch = chars[Math.floor(Math.random() * chars.length)];
      ctx.fillText(ch, i * 14, drops[i] * 14);
      if (drops[i] * 14 > canvas.height && Math.random() > 0.975) drops[i] = 0;
      drops[i]++;
    }
    frames++;
    if (frames < 180) requestAnimationFrame(draw);
    else {
      canvas.style.opacity = "0";
      setTimeout(() => canvas.remove(), 600);
    }
  };
  draw();
}
