import { defineConfig } from "@playwright/test";
export default defineConfig({
  timeout: 45000,
  testIgnore: "**/cartridges.spec.js",
  workers: 1,
  testDir: "./tests",
  use: {
    baseURL: "http://127.0.0.1:3001",
    launchOptions: {
      executablePath: "/usr/bin/chromium",
      args: [
        "--no-sandbox",
        "--enable-unsafe-swiftshader",
        "--use-angle=swiftshader",
        "--disable-dev-shm-usage",
      ],
    },
  },
  webServer: {
    command: "npm run dev -- --mode zine --port 3001",
    url: "http://127.0.0.1:3001",
    reuseExistingServer: true,
  },
  reporter: "list",
});
