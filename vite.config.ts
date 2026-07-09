import { defineConfig } from "vite";
import glsl from "vite-plugin-glsl";
import { readdirSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));

// Each work/<slug>/index.html is a generated multi-page entry.
const workDir = resolve(root, "work");
const projectInputs: Record<string, string> = {};
if (existsSync(workDir)) {
  for (const slug of readdirSync(workDir)) {
    const html = resolve(workDir, slug, "index.html");
    if (existsSync(html)) projectInputs[`work-${slug}`] = html;
  }
}

const resumeHtml = resolve(root, "resume", "index.html");
if (existsSync(resumeHtml)) projectInputs["resume"] = resumeHtml;

export default defineConfig({
  plugins: [glsl()],
  build: {
    target: "es2021",
    assetsInlineLimit: 0,
    rollupOptions: {
      input: {
        main: resolve(root, "index.html"),
        ...projectInputs,
      },
    },
  },
});
