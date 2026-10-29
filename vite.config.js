import { defineConfig, loadEnv } from "vite";
import { resolve } from "node:path";
import { createListeningHandler } from "./api/listening.js";
import { createWeatherHandler } from "./api/weather.js";

export default defineConfig(({ mode }) => ({
  plugins: [{
    name: "local-listening-api",
    configureServer(server) {
      const env = loadEnv(mode, process.cwd(), "LASTFM_");
      server.middlewares.use("/api/listening", createListeningHandler({ user: env.LASTFM_USER || "shualucas", apiKey: env.LASTFM_API_KEY }));
      server.middlewares.use("/api/weather", createWeatherHandler());
    },
    configurePreviewServer(server) {
      const env = loadEnv(mode, process.cwd(), "LASTFM_");
      server.middlewares.use("/api/listening", createListeningHandler({ user: env.LASTFM_USER || "shualucas", apiKey: env.LASTFM_API_KEY }));
      server.middlewares.use("/api/weather", createWeatherHandler());
    },
  }, ...(mode === "zine" ? [{
    name: "preserved-zine-test-entry",
    configureServer(server) {
      server.middlewares.use((req, _res, next) => {
        if (req.url?.split("?")[0] === "/") req.url = "/zine/index.html" + (req.url.includes("?") ? "?" + req.url.split("?")[1] : "");
        next();
      });
    },
  }] : [])],
  build: {
    rollupOptions: {
      input: { afterHours: resolve(import.meta.dirname, "after-hours/index.html"), cartridges: resolve(import.meta.dirname, "index.html"), zine: resolve(import.meta.dirname, "zine/index.html") },
    },
  },
}));
