import { defineConfig } from "vite";
import glsl from "vite-plugin-glsl";

export default defineConfig({
  plugins: [glsl()],
  build: {
    target: "es2021",
    assetsInlineLimit: 0,
  },
});
