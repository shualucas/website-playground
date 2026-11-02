import { defineConfig } from "@playwright/test";
import { browserOptions } from "./scripts/browser-config.mjs";

export default defineConfig({
  timeout: 45000,
  testIgnore: "**/portfolio.*.spec.js",
  workers: 1,
  testDir: "./tests",
  use: { baseURL: "http://127.0.0.1:3001", launchOptions: browserOptions },
  webServer: {
    command: "npm run dev -- --mode zine --port 3001 --strictPort",
    url: "http://127.0.0.1:3001",
    reuseExistingServer: true,
  },
  reporter: "list",
});
