import { defineConfig } from "@playwright/test";
import { browserOptions } from "./scripts/browser-config.mjs";

export default defineConfig({
  timeout: 60000,
  workers: 1, // GPU scenes must not compete for the software renderer.
  testDir: "./tests",
  projects: [
    { name: "ui", testMatch: "**/portfolio.*.ui.spec.js" },
    { name: "3d", testMatch: "**/portfolio.*.3d.spec.js" },
  ],
  use: { baseURL: "http://127.0.0.1:3000", launchOptions: browserOptions },
  webServer: {
    command: "npm run dev -- --port 3000 --strictPort",
    url: "http://127.0.0.1:3000",
    reuseExistingServer: true,
  },
  reporter: "list",
});
