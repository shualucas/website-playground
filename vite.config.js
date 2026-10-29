import { defineConfig } from "vite";
import { resolve } from "node:path";

export default defineConfig(({ mode }) => ({
  plugins: mode === "zine" ? [{
    name: "preserved-zine-test-entry",
    configureServer(server) {
      server.middlewares.use((req, _res, next) => {
        if (req.url?.split("?")[0] === "/") req.url = "/zine/index.html" + (req.url.includes("?") ? "?" + req.url.split("?")[1] : "");
        next();
      });
    },
  }] : [],
  build: {
    rollupOptions: {
      input: { afterHours: resolve(import.meta.dirname, "after-hours/index.html"), cartridges: resolve(import.meta.dirname, "index.html"), zine: resolve(import.meta.dirname, "zine/index.html") },
    },
  },
}));
